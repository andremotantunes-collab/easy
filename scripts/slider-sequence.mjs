/**
 * Captures the investment slider being dragged, frame by frame, so the donut
 * and the Sobras figure can be seen reacting to it. Composed into a filmstrip.
 *
 * Run: npm run sequence
 */
import { launch } from './browser.mjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] ?? 'http://localhost:5173'
const OUT = join(root, 'preview')
mkdirSync(OUT, { recursive: true })
mkdirSync(join(root, '.tmp', 'frames'), { recursive: true })

const BUDGET = {
  version: 1,
  budget: {
    rendimentoMensal: 240000,
    extras: 0,
    modoDespesas: 'percentagem',
    despesasPercentagem: 50,
    despesasFixas: [],
    alocacao: { investimentos: 5, poupanca: 10 },
    diaDeRecebimento: 28,
    poupancaAcumulada: 264000,
    taxaAnualEsperada: 5,
  },
}

const STEPS = [5, 10, 15, 20, 25, 30, 35, 40]

const browser = await launch()
const frames = []
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 420 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
  })
  await ctx.addInitScript((b) => {
    localStorage.setItem('easy.budget.v1', JSON.stringify(b))
    localStorage.setItem('easy.onboarded.v1', '1')
  }, BUDGET)

  const page = await ctx.newPage()
  await page.goto(`${base}/plano`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  for (const value of STEPS) {
    await page.evaluate((v) => {
      const input = document.querySelectorAll('input[type=range]')[0]
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set
      setter.call(input, String(v))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, value)
    // Only one frame time: the donut is expected to track the slider, not ease
    // towards it. A longer wait here would hide a lag bug.
    await page.waitForTimeout(60)
    const file = join(root, '.tmp', 'frames', `f-${value}.png`)
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 400 } })
    frames.push({ value, file })
    console.log(`investimentos = ${value} %`)
  }
  await ctx.close()

  const cells = frames
    .map(
      (f) => `
      <figure>
        <img src="data:image/png;base64,${readFileSync(f.file).toString('base64')}" />
        <figcaption>Investimentos ${f.value} %</figcaption>
      </figure>`,
    )
    .join('')

  const html = `
<body style="margin:0;background:#0E0E10;font-family:system-ui">
  <div style="padding:28px 28px 4px">
    <div style="font:600 26px/1 system-ui;color:#fff">Easy. — o slider e o donut</div>
    <div style="font:400 14px/1.4 system-ui;color:#9A9AA2;margin-top:8px">
      Um fotograma por passo, capturado 60 ms depois do input: o donut e o valor das
      Sobras acompanham o slider no mesmo frame, sem transição a arrastar.
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;padding:18px 28px 28px">${cells}</div>
  <style>
    figure { margin:0 }
    img { width:230px;display:block;border-radius:10px;border:1px solid #2A2A2E }
    figcaption { font:500 12px/1 system-ui;color:#EDEDF2;margin-top:8px;text-align:center }
  </style>
</body>`

  const p = await browser.newPage({ viewport: { width: 1060, height: 900 } })
  await p.setContent(html, { waitUntil: 'load' })
  const out = join(OUT, 'slider-sequencia.png')
  await p.screenshot({ path: out, fullPage: true })
  console.log(`\nfilmstrip -> ${out}`)
} finally {
  await browser.close()
}
