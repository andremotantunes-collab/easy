/**
 * Checks the acceptance criteria that are mechanically checkable, against the
 * running app rather than against the source.
 *
 *   - zero network calls at runtime (beyond loading the app itself)
 *   - nothing overflows horizontally at 390px
 *   - every interactive target is at least 44px
 *   - budget and documents survive a reload
 *   - the visible brand always carries its full stop
 *
 * Run: npm run verify   (needs the dev server up)
 */
import { launch } from './browser.mjs'

const base = process.argv[2] ?? 'http://localhost:5173'
const ROUTES = ['/', '/plano', '/fixas', '/investir', '/documentos', '/definicoes']

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
    poupancaAcumulada: 264000,
    taxaAnualEsperada: 5,
  },
}

const problems = []
const note = (ok, label, detail = '') => {
  // Detail is diagnostic, so it only earns space when something failed.
  console.log(`  [${ok ? 'OK  ' : 'FALHA'}] ${label}${!ok && detail ? ` — ${detail}` : ''}`)
  if (!ok) problems.push(`${label}${detail ? `: ${detail}` : ''}`)
}

const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-PT',
  timezoneId: 'Europe/Lisbon',
}

const browser = await launch()
try {
  const context = await browser.newContext(MOBILE)
  await context.addInitScript((budget) => {
    localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
    localStorage.setItem('easy.onboarded.v1', '1')
  }, BUDGET)

  const page = await context.newPage()

  // Anything not served by the app's own origin is a runtime network call.
  const external = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(`${req.method()} ${url}`)
    }
  })

  console.log('\nrede')
  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
  }
  note(external.length === 0, 'zero chamadas a dominios externos', external.slice(0, 3).join(' | '))

  console.log('\nlayout a 390 px')
  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return {
        scroll: doc.scrollWidth > doc.clientWidth,
        by: doc.scrollWidth - doc.clientWidth,
      }
    })
    note(!overflow.scroll, `${route} sem scroll horizontal`, `${overflow.by}px a mais`)
  }

  console.log('\nalvos de toque')
  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input[type=range], [role=switch]')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 24)
        })
        .map(
          (el) =>
            `${el.tagName.toLowerCase()} ${Math.round(
              el.getBoundingClientRect().height,
            )}px "${(el.textContent ?? '').trim().slice(0, 20)}"`,
        )
        .slice(0, 5),
    )
    note(small.length === 0, `${route} alvos >= 44px`, small.join(' | '))
  }

  console.log('\nmarca e formatacao')
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const texto = await page.evaluate(() => document.body.innerText)
  note(!/Easy(?!\.)/.test(texto), 'nenhum "Easy" sem ponto no ecra')
  note(/\d €/.test(texto), 'valores em euros com espaco nao separavel')
  note(texto.includes('820,00 €'), 'o bolo aparece formatado a portuguesa')
  const tabular = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.t-hero')).fontVariantNumeric.includes('tabular-nums'),
  )
  note(tabular, 'o Hero usa tabular-nums')
  await context.close()

  // --- persistence ----------------------------------------------------------
  // A context WITHOUT the seeding init script: otherwise the seed would re-apply
  // on the reload and hide whether the app persisted anything of its own.
  console.log('\npersistencia')
  const plain = await browser.newContext(MOBILE)
  const p2 = await plain.newPage()
  await p2.goto(`${base}/`, { waitUntil: 'networkidle' })
  await p2.evaluate((budget) => {
    localStorage.setItem('easy.budget.v1', JSON.stringify(budget))
    localStorage.setItem('easy.onboarded.v1', '1')
  }, BUDGET)

  await p2.goto(`${base}/plano`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(400)
  await p2.evaluate(() => {
    const input = document.querySelectorAll('input[type=range]')[0]
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set
    setter.call(input, '17')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await p2.waitForTimeout(300)
  const written = await p2.evaluate(
    () => JSON.parse(localStorage.getItem('easy.budget.v1')).budget.alocacao.investimentos,
  )
  note(written === 17, 'mexer no slider escreve para localStorage', `escrito = ${written}`)

  await p2.reload({ waitUntil: 'networkidle' })
  await p2.waitForTimeout(600)
  const depois = await p2.evaluate(() => document.body.innerText)
  note(/17\s* ?%/.test(depois.replace(/ /g, ' ')), 'o plano sobrevive ao recarregamento')

  // Documents live in IndexedDB, which is a separate store to prove.
  await p2.goto(`${base}/documentos`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(400)
  await p2.setInputFiles('input[type=file]', {
    name: 'recibo-teste.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('recibo'),
  })
  await p2.waitForTimeout(700)
  await p2.reload({ waitUntil: 'networkidle' })
  await p2.waitForTimeout(800)
  const docsText = await p2.evaluate(() => document.body.innerText)
  note(docsText.includes('recibo-teste.txt'), 'os documentos sobrevivem ao recarregamento')
  await plain.close()
} finally {
  await browser.close()
}

console.log(
  problems.length === 0
    ? '\nTudo verificado.'
    : `\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`,
)
process.exit(problems.length === 0 ? 0 : 1)
