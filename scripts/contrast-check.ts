/**
 * Contrast gate. Reads the real token values out of src/styles/tokens.css and
 * fails the build if any pair drops below its minimum:
 *
 *   primary text     >= 7:1   against the background it sits on
 *   secondary text   >= 4.5:1
 *   each donut slice >= 3:1   against --surface
 *
 * Run: node --experimental-strip-types scripts/contrast-check.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// Comments are stripped first: they mention the very selectors we search for,
// and indexOf would otherwise match the prose instead of the rule.
const css = readFileSync(join(here, '..', 'src', 'styles', 'tokens.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

type Tokens = Record<string, string>

/** Pulls one declaration block out of the stylesheet by its selector. */
function block(selector: string): string {
  const idx = css.indexOf(selector)
  if (idx === -1) throw new Error(`Selector não encontrado: ${selector}`)
  const start = css.indexOf('{', idx)
  let depth = 0
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) return css.slice(start + 1, i)
    }
  }
  throw new Error(`Bloco não fechado: ${selector}`)
}

function parse(text: string): Tokens {
  const tokens: Tokens = {}
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|transparent)\s*;/g)) {
    tokens[m[1]] = m[2]
  }
  return tokens
}

function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const light = parse(block(':root {'))
const dark = parse(block(':root[data-theme="dark"]'))
const systemDark = parse(block(':root:not([data-theme="light"])'))

type Check = { name: string; fg: string; bg: string; min: number }

const checks = (t: Tokens): Check[] => [
  { name: 'texto principal / bg', fg: t['--text'], bg: t['--bg'], min: 7 },
  { name: 'texto principal / surface', fg: t['--text'], bg: t['--surface'], min: 7 },
  { name: 'texto secundário / bg', fg: t['--text-muted'], bg: t['--bg'], min: 4.5 },
  { name: 'texto secundário / surface', fg: t['--text-muted'], bg: t['--surface'], min: 4.5 },
  { name: 'texto / segmento ativo', fg: t['--text'], bg: t['--segment-active'], min: 7 },
  { name: 'texto sobre acento', fg: t['--accent-text'], bg: t['--accent'], min: 4.5 },
  { name: 'fatia Sobras / surface', fg: t['--cat-sobras'], bg: t['--surface'], min: 3 },
  { name: 'fatia Fixas / surface', fg: t['--cat-fixas'], bg: t['--surface'], min: 3 },
  { name: 'fatia Investimentos / surface', fg: t['--cat-invest'], bg: t['--surface'], min: 3 },
  { name: 'fatia Poupança / surface', fg: t['--cat-poupanca'], bg: t['--surface'], min: 3 },
  { name: 'negativo / surface', fg: t['--negative'], bg: t['--surface'], min: 3 },
  { name: 'aviso / surface', fg: t['--warning'], bg: t['--surface'], min: 3 },
  { name: 'positivo / surface', fg: t['--positive'], bg: t['--surface'], min: 3 },
]

let failed = 0
for (const [modo, tokens] of [
  ['claro', light],
  ['escuro (toggle)', dark],
  ['escuro (sistema)', systemDark],
] as const) {
  console.log(`\n${modo}`)
  for (const c of checks(tokens)) {
    if (!c.fg || !c.bg) {
      console.log(`  [FALTA] ${c.name}`)
      failed++
      continue
    }
    const ratio = contrast(c.fg, c.bg)
    const ok = ratio >= c.min
    if (!ok) failed++
    console.log(
      `  [${ok ? 'OK  ' : 'FALHA'}] ${c.name.padEnd(30)} ${ratio.toFixed(2)}:1 (min ${c.min})`,
    )
  }
}

// The manual toggle and the system block must be byte-identical, otherwise the
// toggle only wins in one direction.
const drift = Object.keys(dark).filter((k) => dark[k] !== systemDark[k])
if (drift.length) {
  console.log(`\n[FALHA] Os blocos escuros divergem em: ${drift.join(', ')}`)
  failed += drift.length
}

if (failed > 0) {
  console.error(`\n${failed} verificação(ões) de contraste falharam.`)
  process.exit(1)
}
console.log('\nTodos os pares de contraste passam.')
