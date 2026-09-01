import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { copy, OPCOES_INVESTIMENTO } from './copy'

/**
 * The brand is "Easy." — with the full stop — in every string a user can read.
 * The only sanctioned exceptions are technical identifiers, where a trailing
 * dot would break the thing: file names, URL slugs, storage keys, package
 * names, variable names. Those are written lowercase `easy`, so the rule this
 * test enforces is simple and mechanical:
 *
 *   a capital-E "Easy" must always be followed by a full stop.
 */
// Two copies on purpose: a /g regex keeps `lastIndex` between .test() calls,
// which would silently skip every other offender.
const BARE_BRAND = /Easy(?!\.)/
const BARE_BRAND_ALL = /Easy(?!\.)/g

const ROOT = join(import.meta.dirname, '..', '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.tmp', 'preview'].includes(entry)) continue
    // This file necessarily quotes the rule it enforces.
    if (entry === 'brand.test.ts') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|html|md|json|css)$/.test(entry)) out.push(full)
  }
  return out
}

/** Every visible string reachable from the copy module, flattened. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (typeof value === 'function') {
    try {
      out.push(String((value as (...a: unknown[]) => string)('X', 1)))
    } catch {
      // A formatter that needs different arguments is covered by the file scan.
    }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out)
  }
  return out
}

describe('a marca escreve-se sempre "Easy."', () => {
  it('nenhuma string visível usa "Easy" sem ponto final', () => {
    const offenders = collectStrings(copy)
      .concat(collectStrings(OPCOES_INVESTIMENTO))
      .filter((s) => BARE_BRAND.test(s))
    expect(offenders).toEqual([])
  })

  it('a constante da marca tem o ponto', () => {
    expect(copy.brand).toBe('Easy.')
    expect(copy.brand.endsWith('.')).toBe(true)
  })

  it('o disclaimer nomeia a marca com ponto', () => {
    expect(copy.investir.disclaimer).toContain('A Easy. é uma ferramenta')
  })

  it('nenhum ficheiro do projeto escreve "Easy" sem ponto', () => {
    const offenders: string[] = []
    for (const file of walk(join(ROOT, 'src')).concat(
      [
        'index.html',
        'README.md',
        'DECISIONS.md',
        'DESIGN.md',
        'vite.config.ts',
        'package.json',
      ]
        .map((f) => join(ROOT, f))
        .filter((f) => {
          try {
            statSync(f)
            return true
          } catch {
            return false
          }
        }),
    )) {
      const text = readFileSync(file, 'utf8')
      text.split('\n').forEach((line, i) => {
        // The rule itself has to be quotable in comments and docs.
        if (line.includes('BARE_BRAND') || line.includes('Easy(?!')) return
        const matches = line.match(BARE_BRAND_ALL)
        if (matches) offenders.push(`${file.replace(ROOT, '')}:${i + 1} — ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })
})
