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
/** `npm run shots -- 9 http://... max` captura no iPhone 13 Pro Max. */
const ECRA =
  process.argv[4] === 'max'
    ? { width: 430, height: 932, nome: '430x932' }
    : { width: 390, height: 844, nome: '390x844' }
const OUT = join(root, 'preview')
mkdirSync(OUT, { recursive: true })

// 2 400 € a month, preset Equilibrado, and six realistic standing costs.
const AGORA = new Date()
const MES_CORRENTE = `${AGORA.getFullYear()}-${String(AGORA.getMonth() + 1).padStart(2, '0')}`

/**
 * Gastos com forma: mais ao fim de semana, menos a meio da semana, e uns
 * meses atras para o grafico de 12 meses ter linha. Sao inventados, mas com
 * ritmo — uma serie plana nao mostra se o grafico funciona.
 */
const GASTOS = (() => {
  const fora = []
  const rotulos = [
    ['Jantar', 'alimentacao', 2400],
    ['Supermercado', 'alimentacao', 5200],
    ['Cafe', 'alimentacao', 180],
    ['Gasolina', 'transportes', 6500],
    ['Farmacia', 'saude', 1450],
    ['Cinema', 'lazer', 1700],
    ['Livro', 'lazer', 2200],
    ['Uber', 'transportes', 850],
  ]
  let semente = 7
  const aleatorio = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648
  for (let atras = 0; atras < 400; atras++) {
    const d = new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() - atras)
    const fimDeSemana = d.getDay() === 0 || d.getDay() === 6
    const quantos = aleatorio() < (fimDeSemana ? 0.85 : 0.45) ? (fimDeSemana ? 2 : 1) : 0
    for (let i = 0; i < quantos; i++) {
      const [nome, categoria, base] = rotulos[Math.floor(aleatorio() * rotulos.length)]
      fora.push({
        id: `g${atras}-${i}`,
        descricao: nome,
        valor: Math.round(base * (0.6 + aleatorio() * 0.9)),
        categoria,
        data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      })
    }
  }
  return fora
})()

const BUDGET = {
  version: 4,
  budget: {
    rendimentoMensal: 240000,
    extras: 0,
    modoDespesas: 'lista',
    despesasPercentagem: 50,
    despesasFixas: [
      { id: 'f1', nome: 'Renda', valor: 75000, categoria: 'casa', periodicidade: 'mensal', ativo: true },
      { id: 'f2', nome: 'Carro', valor: 18000, categoria: 'transportes', periodicidade: 'mensal', ativo: true },
      { id: 'f3', nome: 'Ginásio', valor: 4000, categoria: 'saude', periodicidade: 'mensal', ativo: true },
      { id: 'f4', nome: 'Telecomunicações', valor: 4500, categoria: 'subscricoes', periodicidade: 'mensal', ativo: true },
      { id: 'f5', nome: 'Subscrições', valor: 2500, categoria: 'subscricoes', periodicidade: 'mensal', ativo: true },
      { id: 'f6', nome: 'Seguros', valor: 6000, categoria: 'outros', periodicidade: 'mensal', ativo: true },
      // Yearly on purpose: it is what shows the 240,00 €/ano -> 20,00 €/mes split.
      { id: 'f7', nome: 'IUC', valor: 24000, categoria: 'transportes', periodicidade: 'anual', ativo: true },
    ],
    // Gastos espalhados por varios dias e meses: e' o que da' uma linha com
    // forma no grafico, em vez de um degrau.
    gastos: GASTOS,
    limites: { alimentacao: 30000 },
    alocacao: { investimentos: 10, poupanca: 10 },
    poupancaAcumulada: 264000, // 2,4 meses de despesas fixas
    taxaAnualEsperada: 5,
    modoDiscreto: false,
  },
}

/**
 * Quatro meses ja' fechados, com contas diferentes uns dos outros: um deles
 * com um custo que so' ele teve. Sem historico, a fita de meses e o ecra de
 * Todos os meses nao teriam nada para mostrar, e as capturas nao diriam se o
 * desenho funciona.
 */
function mesesAtras(n) {
  const d = new Date(AGORA.getFullYear(), AGORA.getMonth() - n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const HISTORICO = {
  mesAberto: MES_CORRENTE,
  meses: [
    { mes: mesesAtras(4), rendimentoTotal: 230000, despesasFixas: 112000, gastos: 0, investimentos: 23000, poupanca: 23000, sobras: 72000, fechadoEm: `${mesesAtras(3)}-02T09:12:00.000Z` },
    { mes: mesesAtras(3), rendimentoTotal: 240000, despesasFixas: 112000, gastos: 48000, investimentos: 24000, poupanca: 24000, sobras: 32000, fechadoEm: `${mesesAtras(2)}-01T20:40:00.000Z` },
    { mes: mesesAtras(2), rendimentoTotal: 240000, despesasFixas: 112000, gastos: 0, investimentos: 24000, poupanca: 24000, sobras: 80000, fechadoEm: `${mesesAtras(1)}-03T08:05:00.000Z` },
    { mes: mesesAtras(1), rendimentoTotal: 258000, despesasFixas: 112000, gastos: 9500, investimentos: 25800, poupanca: 25800, sobras: 84900, fechadoEm: `${MES_CORRENTE}-01T19:30:00.000Z` },
  ],
}

const SCREENS = [
  { slug: 'inicio', path: '/', nome: 'Início' },
  { slug: 'documentos', path: '/documentos', nome: 'Documentos' },
  { slug: 'perfil', path: '/perfil', nome: 'Perfil' },
  { slug: 'dados-pessoais', path: '/perfil/dados', nome: 'Dados pessoais' },
  { slug: 'plano', path: '/plano', nome: 'Plano' },
  { slug: 'fixas', path: '/fixas', nome: 'Despesas fixas' },
  { slug: 'gastos', path: '/gastos', nome: 'Gastos' },
  { slug: 'meses', path: '/meses', nome: 'Todos os meses' },
  { slug: 'investir', path: '/investir', nome: 'Investir' },
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
      viewport: { width: ECRA.width, height: ECRA.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      colorScheme: modo === 'escuro' ? 'dark' : 'light',
    })

    // Seed before any script on the page runs.
    await context.addInitScript(
      ([budget, historico, tema]) => {
        localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
        localStorage.setItem('easy.historico.v1', JSON.stringify(historico))
        localStorage.setItem('easy.onboarded.v1', '1')
        if (tema) localStorage.setItem('easy.theme.v1', tema)
        else localStorage.removeItem('easy.theme.v1')
      },
      [BUDGET, HISTORICO, modo === 'escuro' ? 'dark' : 'light'],
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
    shots.push({ slug: 'definicoes', nome: 'Os teus dados', modo, file: defFile })

    // The deficit state: same income, commitments deliberately over 100%.
    const defice = await context.newPage()
    await defice.addInitScript((budget) => {
      localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
    }, {
      version: 2,
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
  const order = ['onboarding', 'inicio', 'defice', 'documentos', 'perfil', 'dados-pessoais', 'plano', 'fixas', 'investir', 'definicoes']
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
