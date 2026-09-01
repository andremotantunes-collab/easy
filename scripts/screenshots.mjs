/**
 * Mobile preview harness.
 *
 * Captures every screen at 390x844 @2x, in light and dark, with realistic data
 * already in place — an empty app or lorem-ipsum placeholders would not tell
 * anyone whether the design works. Then composes a contact sheet.
 *
 * Run: npm run shots -- [fase] [baseURL]
 */
import { launch } from './browser.mjs'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fase = process.argv[2] ?? '7'
const base = process.argv[3] ?? 'http://localhost:5173'
const OUT = join(root, 'preview')
mkdirSync(OUT, { recursive: true })

// 2 400 € a month, preset Equilibrado, and six realistic standing costs.
const BUDGET = {
  version: 1,
  budget: {
    rendimentoMensal: 240000,
    extras: 0,
    modoDespesas: 'lista',
    despesasPercentagem: 50,
    despesasFixas: [
      { id: 'f1', nome: 'Renda', valor: 75000, categoria: 'casa', ativo: true },
      { id: 'f2', nome: 'Carro', valor: 18000, categoria: 'transportes', ativo: true },
      { id: 'f3', nome: 'Ginásio', valor: 4000, categoria: 'saude', ativo: true },
      { id: 'f4', nome: 'Telecomunicações', valor: 4500, categoria: 'subscricoes', ativo: true },
      { id: 'f5', nome: 'Subscrições', valor: 2500, categoria: 'subscricoes', ativo: true },
      { id: 'f6', nome: 'Seguros', valor: 6000, categoria: 'outros', ativo: true },
    ],
    alocacao: { investimentos: 10, poupanca: 10 },
    diaDeRecebimento: 28,
    poupancaAcumulada: 264000, // 2,4 meses de despesas fixas
    taxaAnualEsperada: 5,
  },
}

const SCREENS = [
  { slug: 'inicio', path: '/', nome: 'Início' },
  { slug: 'plano', path: '/plano', nome: 'Plano' },
  { slug: 'fixas', path: '/fixas', nome: 'Despesas fixas' },
  { slug: 'investir', path: '/investir', nome: 'Investir' },
  { slug: 'documentos', path: '/documentos', nome: 'Documentos' },
]

/** A tiny but structurally valid PDF, so the preview sheet has one to open. */
function samplePdf() {
  const objs = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
  for (const o of objs) {
    offsets.push(pdf.length)
    pdf += o
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

const samples = join(root, '.tmp', 'samples')
mkdirSync(samples, { recursive: true })
writeFileSync(
  join(samples, 'contrato-arrendamento.pdf'),
  samplePdf(),
)
writeFileSync(
  join(samples, 'recibo-agua-marco.txt'),
  'Recibo de água — março\nValor: 24,80 €\n',
  'utf8',
)
writeFileSync(join(samples, 'seguro-carro.png'), readFileSync(join(root, 'public/icons/icon-512.png')))
writeFileSync(
  join(samples, 'irs-2025.txt'),
  'Declaração de IRS 2025\n',
  'utf8',
)

const browser = await launch()
const shots = []

try {
  for (const modo of ['claro', 'escuro']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      colorScheme: modo === 'escuro' ? 'dark' : 'light',
    })

    // Seed before any script on the page runs.
    await context.addInitScript(
      ([budget, tema]) => {
        localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
        localStorage.setItem('easy.onboarded.v1', '1')
        if (tema) localStorage.setItem('easy.theme.v1', tema)
        else localStorage.removeItem('easy.theme.v1')
      },
      [BUDGET, modo === 'escuro' ? 'dark' : 'light'],
    )

    const page = await context.newPage()

    // Documents live in IndexedDB, so they go in through the real upload path.
    await page.goto(`${base}/documentos`, { waitUntil: 'networkidle' })
    await page.setInputFiles('input[type=file]', [
      join(samples, 'contrato-arrendamento.pdf'),
      join(samples, 'recibo-agua-marco.txt'),
      join(samples, 'seguro-carro.png'),
      join(samples, 'irs-2025.txt'),
    ])
    await page.waitForTimeout(600)

    const FLOW_TABBAR = `nav { position: static !important; }
      main { padding-bottom: 8px !important; }`

    for (const screen of SCREENS) {
      await page.goto(`${base}${screen.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700) // let the donut sweep finish
      await page.addStyleTag({ content: FLOW_TABBAR })
      const file = join(OUT, `${screen.slug}-${modo}.png`)
      await page.screenshot({ path: file, fullPage: true })
      shots.push({ ...screen, modo, file })
      console.log(`${screen.slug} · ${modo}`)
    }

    // Onboarding, which only exists before the app has data.
    const fresh = await context.newPage()
    await fresh.addInitScript(() => localStorage.removeItem('easy.onboarded.v1'))
    await fresh.goto(`${base}/inicio`, { waitUntil: 'networkidle' })
    await fresh.waitForTimeout(400)
    const onbFile = join(OUT, `onboarding-${modo}.png`)
    await fresh.screenshot({ path: onbFile, fullPage: true })
    shots.push({ slug: 'onboarding', nome: 'Onboarding', modo, file: onbFile })
    await fresh.close()

    await page.goto(`${base}/definicoes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await page.addStyleTag({ content: FLOW_TABBAR })
    const defFile = join(OUT, `definicoes-${modo}.png`)
    await page.screenshot({ path: defFile, fullPage: true })
    shots.push({ slug: 'definicoes', nome: 'Definições', modo, file: defFile })

    // The deficit state: same income, commitments deliberately over 100%.
    const defice = await context.newPage()
    await defice.addInitScript((budget) => {
      localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
    }, {
      version: 1,
      budget: {
        ...BUDGET.budget,
        modoDespesas: 'percentagem',
        despesasPercentagem: 90,
        alocacao: { investimentos: 15, poupanca: 10 },
      },
    })
    await defice.goto(`${base}/`, { waitUntil: 'networkidle' })
    await defice.waitForTimeout(700)
    await defice.addStyleTag({ content: FLOW_TABBAR })
    const defFileD = join(OUT, `defice-${modo}.png`)
    await defice.screenshot({ path: defFileD, fullPage: true })
    shots.push({ slug: 'defice', nome: 'Início em défice', modo, file: defFileD })
    await defice.close()

    await context.close()
  }

  // ---- contact sheet -------------------------------------------------------
  const order = ['onboarding', 'inicio', 'defice', 'plano', 'fixas', 'investir', 'documentos', 'definicoes']
  const byMode = (modo) =>
    order
      .map((slug) => shots.find((s) => s.slug === slug && s.modo === modo))
      .filter(Boolean)

  const cell = (s) => `
    <figure>
      <img src="data:image/png;base64,${readFileSync(s.file).toString('base64')}" />
      <figcaption>${s.nome}</figcaption>
    </figure>`

  const html = `
<body style="margin:0;background:#0E0E10;font-family:-apple-system,Segoe UI,sans-serif">
  <div style="padding:32px 32px 8px">
    <div style="font:600 30px/1 system-ui;color:#fff">Easy. — Fase ${fase}</div>
    <div style="font:400 15px/1.4 system-ui;color:#9A9AA2;margin-top:8px">
      390 × 844 @2x · dados reais: 2 400 € / mês, preset Equilibrado, 6 despesas fixas
    </div>
  </div>
  ${['claro', 'escuro']
    .map(
      (modo) => `
    <div style="padding:20px 32px 8px;font:600 15px/1 system-ui;color:#9A9AA2;text-transform:uppercase;letter-spacing:.08em">${modo}</div>
    <div style="display:flex;gap:18px;padding:0 32px 24px;flex-wrap:nowrap">
      ${byMode(modo).map(cell).join('')}
    </div>`,
    )
    .join('')}
  <style>
    figure { margin:0; }
    img { width:250px; align-self:flex-start; display:block; border-radius:12px; border:1px solid #2A2A2E; }
    figcaption { font:500 13px/1 system-ui; color:#EDEDF2; margin-top:10px; text-align:center; }
  </style>
</body>`

  const sheetPage = await browser.newPage({ viewport: { width: 1980, height: 1200 } })
  await sheetPage.setContent(html, { waitUntil: 'load' })
  const sheet = join(OUT, `preview-fase-${fase}.png`)
  await sheetPage.screenshot({ path: sheet, fullPage: true })
  console.log(`\ncontact sheet -> ${sheet}`)
} finally {
  await browser.close()
}
