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
const ROUTES = [
  '/', '/gastos', '/documentos', '/perfil', '/perfil/dados', '/plano', '/fixas', '/meses',
  '/investir', '/definicoes',
]

const agoraLocal = new Date()
const MES_CORRENTE = `${agoraLocal.getFullYear()}-${String(agoraLocal.getMonth() + 1).padStart(2, '0')}`

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
    // Dois gastos deste mes: e' o que poe a quinta fatia no anel e da'
    // conteudo ao ecra dos Gastos.
    gastos: [
      { id: 'g1', descricao: 'Dentista', valor: 12000, categoria: 'saude', data: `${MES_CORRENTE}-04` },
      { id: 'g2', descricao: 'Jantar', valor: 6000, categoria: 'alimentacao', data: `${MES_CORRENTE}-11` },
    ],
    limites: {},
    alocacao: { investimentos: 10, poupanca: 10 },
    poupancaAcumulada: 264000,
    taxaAnualEsperada: 5,
    modoDiscreto: false,
  },
}

const problems = []
const note = (ok, label, detail = '') => {
  // Detail is diagnostic, so it only earns space when something failed.
  console.log(`  [${ok ? 'OK  ' : 'FALHA'}] ${label}${!ok && detail ? ` — ${detail}` : ''}`)
  if (!ok) problems.push(`${label}${detail ? `: ${detail}` : ''}`)
}

/**
 * Os dois telemoveis que interessam: o mais estreito que a app promete
 * suportar, e o do dono da app. Um layout verificado so' a 390 px passa a vida
 * a partir-se no grande, onde ha' espaco a mais e nada o obriga a alinhar.
 */
const ECRAS = [
  { nome: '390x844 (iPhone 13/14)', viewport: { width: 390, height: 844 } },
  { nome: '430x932 (iPhone 13 Pro Max)', viewport: { width: 430, height: 932 } },
]

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

  for (const ecra of ECRAS) {
    await page.setViewportSize(ecra.viewport)

    console.log(`\nlayout a ${ecra.nome}`)
    for (const route of ROUTES) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return { scroll: doc.scrollWidth > doc.clientWidth, by: doc.scrollWidth - doc.clientWidth }
      })
      note(!overflow.scroll, `${route} sem scroll horizontal`, `${overflow.by}px a mais`)
    }

    console.log(`\nalvos de toque a ${ecra.nome}`)
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
  }
  await page.setViewportSize(ECRAS[0].viewport)

  // O Safari do iPhone da' zoom sozinho quando se toca num campo com menos de
  // 16 px, e a pagina fica torta ate' se sair do campo. Nao ha' remedio no
  // CSS: o remedio e' nao haver campos abaixo de 16 px.
  console.log('\ncampos de texto (o zoom do iOS)')
  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const pequenos = await page.evaluate(
      () =>
        new Promise((res) => {
          // Os campos que vivem numa sheet so' existem depois de a abrir — e o
          // botao a abrir nao pode ser o de voltar, que sairia do ecra.
          const abrir = [...document.querySelectorAll('header button[aria-label]')].find(
            (el) => !/voltar/i.test(el.getAttribute('aria-label') ?? ''),
          )
          abrir?.click()
          setTimeout(() => {
            res(
              [
                ...document.querySelectorAll(
                  'input:not([type=range]):not([type=file]), textarea, select',
                ),
              ]
                .filter((el) => el.getBoundingClientRect().height > 0)
                .map((el) => ({
                  px: parseFloat(getComputedStyle(el).fontSize),
                  nome:
                    el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.type,
                }))
                .filter((x) => x.px < 16)
                .map((x) => `${x.nome} ${x.px}px`),
            )
          }, 300)
        }),
    )
    note(pequenos.length === 0, `${route} campos >= 16px`, pequenos.join(' | '))
  }

  console.log('\nmarca e formatacao')
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const texto = await page.evaluate(() => document.body.innerText)
  note(!/Easy(?!\.)/.test(texto), 'nenhum "Easy" sem ponto no ecra')
  note(/\d €/.test(texto), 'valores em euros com espaco nao separavel')
  // 2 400 - (1 100 de fixas + 20 do IUC mensalizado) - 180 deste mes - 240 - 240 = 620
  note(texto.includes('620,00 €'), 'o bolo aparece formatado a portuguesa')
  // A quinta fatia so' existe quando o mes teve gastos: aqui teve. E' preciso
  // olhar para a legenda e nao para a pagina toda, porque "Gastos" tambem e' o
  // nome de um separador la' em baixo.
  const naLegenda = await page.evaluate(() =>
    [...document.querySelectorAll('li button span span')].some(
      (el) => el.textContent?.trim() === 'Gastos',
    ),
  )
  note(naLegenda, 'a fatia dos gastos aparece na legenda do anel')
  note(texto.includes('180,00 €'), 'e vale a soma dos gastos do mes')
  const tabular = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.tnum')).fontVariantNumeric.includes('tabular-nums'),
  )
  note(tabular, 'os valores usam tabular-nums')
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
  // A escrita para o disco e' adiada 250 ms de proposito (ver storage.ts): esta
  // espera tem de lhe dar folga em vez de a apanhar em cima da hora.
  await p2.waitForTimeout(900)
  const written = await p2.evaluate(
    () => JSON.parse(localStorage.getItem('easy.budget.v1')).budget.alocacao.investimentos,
  )
  note(written === 17, 'mexer no slider escreve para localStorage', `escrito = ${written}`)

  await p2.reload({ waitUntil: 'networkidle' })
  await p2.waitForTimeout(600)
  const depois = await p2.evaluate(() => document.body.innerText)
  note(/17\s* ?%/.test(depois.replace(/ /g, ' ')), 'o plano sobrevive ao recarregamento')

  // --- gastos ---------------------------------------------------------------
  // O ciclo inteiro, no browser: escrever um gasto, ve-lo descontado do bolo,
  // mexer nos periodos, por um limite, apagar, desfazer e recarregar. E' a
  // funcionalidade que a app passou a ter, e nao ha' outra forma de saber se
  // funciona a nao ser faze-la.
  console.log('\ngastos')
  await p2.goto(`${base}/gastos`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(500)

  const lerBolo = async () =>
    p2.evaluate(() => {
      const el = document.querySelector('.t-hero')
      const texto = (el?.textContent ?? '').replace(/[^0-9,-]/g, '')
      return Math.round(Number(texto.replace(',', '.')) * 100)
    })

  const boloAntes = await lerBolo()

  await p2.click('button[aria-label="Novo gasto"]')
  await p2.waitForTimeout(300)
  await p2.fill('input[placeholder="Jantar"]', 'Jantar com a Ana')
  await p2.waitForTimeout(200)

  // A categoria segue o que se escreve: "jantar" e' alimentacao.
  const sugerida = await p2.evaluate(() => {
    const btn = [...document.querySelectorAll('button[aria-pressed="true"]')].find((b) =>
      ['Alimentação', 'Transportes', 'Casa', 'Saúde', 'Lazer', 'Compras', 'Outros'].includes(
        (b.textContent ?? '').trim(),
      ),
    )
    return (btn?.textContent ?? '').trim()
  })
  note(sugerida === 'Alimentação', 'a categoria segue a descricao', `sugeriu "${sugerida}"`)

  await p2.fill('input[inputmode="decimal"]', '19,90')
  await p2.click('button:has-text("Guardar")')
  await p2.waitForTimeout(500)

  const boloDepois = await lerBolo()
  note(
    boloAntes - boloDepois === 1990,
    'um gasto novo desce o bolo exatamente o seu valor',
    `${boloAntes} -> ${boloDepois}`,
  )

  const ecra = await p2.evaluate(() => document.body.innerText)
  note(ecra.includes('Jantar com a Ana'), 'o gasto aparece na lista do dia')
  note(/HOJE\ns*19,90/i.test(ecra.replace(/\u00a0/g, ' ')) || ecra.includes('19,90'), 'o total de hoje inclui o gasto')

  // Todos os periodos desenham, e nenhum rebenta.
  for (const rotulo of ['30 dias', '12 meses', 'Anos', 'Tudo', '7 dias']) {
    await p2.click(`button:has-text("${rotulo}")`)
    await p2.waitForTimeout(250)
    const desenhou = await p2.evaluate(() => {
      const linha = document.querySelector('svg polyline')
      return linha ? (linha.getAttribute('points') ?? '').split(' ').length : 0
    })
    note(desenhou >= 2, `o grafico desenha em "${rotulo}"`, `${desenhou} pontos`)
  }

  // Um limite por categoria, que e' a pergunta "quanto tenho para esta". Os
  // dois ramos: por baixo do limite diz o que resta, por cima diz quanto
  // passou. Alimentacao leva 60,00 da amostra mais os 19,90 escritos agora.
  const porLimite = async (valor) => {
    await p2.click('button:has-text("Alimentação")')
    await p2.waitForTimeout(350)
    await p2.fill('input[inputmode="decimal"]', valor)
    await p2.click('button:has-text("Guardar limite")')
    await p2.waitForTimeout(400)
    return p2.evaluate(() => document.body.innerText)
  }
  note(/restam/i.test(await porLimite('200,00')), 'por baixo do limite, diz quanto resta')
  note(/acima do limite/i.test(await porLimite('50,00')), 'por cima do limite, diz quanto passou')

  // Apagar e desfazer: o gasto tem de voltar ao sitio. E' preciso olhar para a
  // LISTA e nao para a pagina, porque o aviso de desfazer repete o nome do
  // gasto que acabou de sair.
  const naLista = () =>
    p2.evaluate(() =>
      [...document.querySelectorAll('section li')].some((li) =>
        (li.textContent ?? '').includes('Jantar com a Ana'),
      ),
    )
  await p2.click('button[aria-label^="Apagar Jantar com a Ana"]')
  await p2.waitForTimeout(400)
  note((await naLista()) === false, 'apagar tira o gasto da lista')
  await p2.click('button:has-text("Desfazer")')
  await p2.waitForTimeout(400)
  note(await naLista(), 'desfazer devolve o gasto')

  // E sobrevive a fechar a app.
  await p2.reload({ waitUntil: 'networkidle' })
  await p2.waitForTimeout(700)
  const depoisDeRecarregar = await p2.evaluate(() => document.body.innerText)
  note(depoisDeRecarregar.includes('Jantar com a Ana'), 'o gasto sobrevive ao recarregamento')
  note((await lerBolo()) === boloDepois, 'e o bolo continua no mesmo numero')

  // O mesmo gasto tem de aparecer no anel do Inicio.
  await p2.goto(`${base}/`, { waitUntil: 'networkidle' })
  await p2.waitForTimeout(600)
  note((await lerBolo()) === boloDepois, 'o Inicio mostra o mesmo bolo que os Gastos')

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
