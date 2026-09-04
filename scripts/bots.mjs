/**
 * Bots com comportamento humanizado, a usar a app a serio.
 *
 * Isto nao e' uma suite de testes: os testes do `vitest` provam o que ja'
 * sabemos perguntar. Os bots existem para o que nao sabemos — a ordem de
 * toques que ninguem escreveria de proposito, o arrasto a meio de uma folha, o
 * recarregar entre dois passos de um formulario.
 *
 * Cada bot e' uma pessoa com um feitio: o apressado toca depressa e nao le', o
 * cuidadoso espera e confirma, o destrutivo apaga tudo o que ve', o indeciso
 * abre e fecha sem guardar. Escolhem a acao seguinte por peso, com pausas
 * irregulares — um humano nao toca de 300 em 300 ms certos.
 *
 * Depois de CADA acao, todas as invariantes sao verificadas. Quando uma cai, o
 * bot guarda o rasto de acoes que la' chegou, para o erro ser reproduzivel em
 * vez de ser uma anedota.
 *
 * Corre:  npm run bots
 *         npm run bots -- --bots 6 --acoes 120 --ver   (--ver mostra o browser)
 */
import { launch } from './browser.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

const arg = (nome, omissao) => {
  const i = process.argv.indexOf(`--${nome}`)
  return i === -1 ? omissao : Number(process.argv[i + 1])
}
const N_BOTS = arg('bots', 5)
const N_ACOES = arg('acoes', 90)
const VER = process.argv.includes('--ver')
const SEMENTE = arg('semente', Date.now() % 100000)

// ---------------------------------------------------------------------------
// Um gerador com semente: um bot que encontra um erro tem de o encontrar outra
// vez. `--semente N` repete a corrida inteira, toque a toque.
// ---------------------------------------------------------------------------
function aleatorio(semente) {
  let s = semente >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Os feitios
// ---------------------------------------------------------------------------
const FEITIOS = {
  apressado: {
    // Toca depressa, nao espera pelas animacoes, e as vezes toca duas vezes.
    pausa: [40, 220],
    reincidencia: 0.25,
    pesos: { tocarBarra: 4, arrastar: 4, rolar: 2, gastoNovo: 3, abrirGasto: 2, plano: 2, fixas: 1, documentos: 1, perfil: 1, objetivo: 1, recarregar: 1, tema: 1 },
  },
  cuidadoso: {
    pausa: [400, 1100],
    reincidencia: 0.02,
    pesos: { tocarBarra: 2, arrastar: 2, rolar: 4, gastoNovo: 3, abrirGasto: 3, plano: 2, fixas: 2, documentos: 2, perfil: 2, objetivo: 2, recarregar: 1, tema: 1 },
  },
  destrutivo: {
    // Apaga tudo o que ve', e depois desfaz metade.
    pausa: [120, 400],
    reincidencia: 0.15,
    pesos: { apagarGasto: 6, fixas: 4, documentos: 3, importar: 2, gastoNovo: 2, abrirGasto: 2, tocarBarra: 2, arrastar: 2, objetivo: 2, recarregar: 2, perfil: 1 },
  },
  indeciso: {
    // Abre folhas e fecha-as sem guardar. E' o que apanha estado por limpar.
    pausa: [200, 700],
    reincidencia: 0.1,
    pesos: { abrirEFechar: 6, gastoNovo: 2, objetivo: 3, abrirGasto: 3, tocarBarra: 3, arrastar: 3, plano: 2, recarregar: 2 },
  },
  polegar: {
    // So' arrasta. Existe para martelar o gesto novo de lado.
    pausa: [80, 350],
    reincidencia: 0.3,
    pesos: { arrastar: 10, rolar: 3, tocarBarra: 1, recarregar: 1 },
  },
}

// ---------------------------------------------------------------------------
// Toque e arrasto de verdade, pelo protocolo do Chromium. O `page.click` do
// Playwright e' um rato: nao dispara `touchstart` nenhum, e era exatamente o
// gesto novo que ficava por testar.
// ---------------------------------------------------------------------------
async function tocar(cdp, x, y) {
  const p = [{ x: Math.round(x), y: Math.round(y) }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: p })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function arrastar(cdp, x0, y0, x1, y1, passos = 12) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: Math.round(x0), y: Math.round(y0) }],
  })
  for (let i = 1; i <= passos; i++) {
    const k = i / passos
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: Math.round(x0 + (x1 - x0) * k), y: Math.round(y0 + (y1 - y0) * k) }],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

// ---------------------------------------------------------------------------
// As invariantes. Correm depois de CADA acao.
// ---------------------------------------------------------------------------
const LIXO = /\bNaN\b|\bInfinity\b|\bundefined\b|\[object Object\]|\bnull\b/

/** A largura do ecra que a app diz desenhar. Fixa de proposito — ver abaixo. */
const LARGURA = 390

async function verificar(page, estado) {
  const falhas = []

  // 1. A app nao pode ter ficado em branco.
  const vivo = await page.evaluate(() => {
    const r = document.getElementById('root')
    return { texto: (document.body.innerText || '').trim(), filhos: r ? r.children.length : 0 }
  }).catch(() => null)
  if (!vivo) return [{ tipo: 'pagina-morta', detalhe: 'a página deixou de responder ao script' }]
  if (vivo.filhos === 0 || vivo.texto.length < 3) {
    falhas.push({ tipo: 'ecra-em-branco', detalhe: `root com ${vivo.filhos} filhos` })
  }

  // 2. Nenhum valor por formatar chega ao ecra.
  const achado = vivo.texto.match(LIXO)
  if (achado) falhas.push({ tipo: 'valor-por-formatar', detalhe: `"${achado[0]}" visível no ecrã` })

  // 3. Nada transborda de lado a 390 px.
  //
  // A medida e' contra uma largura FIXA e nao contra `window.innerWidth`: sob
  // emulacao movel, quando o conteudo transborda o browser afasta-se para o
  // fazer caber, e o `innerWidth` cresce com ele. Comparar um com o outro dava
  // sempre igual — o defeito escondia-se atras do proprio sintoma.
  const largura = await page.evaluate((limite) => ({
    documento: document.documentElement.scrollWidth,
    culpados: [...document.querySelectorAll('body *')]
      .filter((e) => {
        const s = getComputedStyle(e)
        // O campo da Aurora e' `fixed`, decorativo e maior do que o ecra de
        // proposito: nao rola, nao se toca, e nao e' um transbordo.
        if (s.position === 'fixed' || s.pointerEvents === 'none') return false
        return e.getBoundingClientRect().right > limite + 1
      })
      .slice(0, 3)
      .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 40)}`),
  }), LARGURA)
  if (largura.documento > LARGURA + 1) {
    falhas.push({ tipo: 'transbordo-horizontal', detalhe: `documento com ${largura.documento}px — ${largura.culpados.join(' | ') || 'sem culpado visível'}` })
  }

  // 4. O orcamento no disco continua a ser um orcamento.
  const disco = await page.evaluate(() => {
    try {
      const cru = localStorage.getItem('easy.budget.v1')
      if (!cru) return { ok: true, vazio: true }
      const b = JSON.parse(cru).budget
      const dinheiros = [b.rendimentoMensal, b.extras, b.poupancaAcumulada,
        ...(b.gastos ?? []).map((g) => g.valor), ...(b.despesasFixas ?? []).map((e) => e.valor)]
      const mau = dinheiros.find((v) => !Number.isFinite(v))
      return {
        ok: mau === undefined,
        mau,
        gastosSemDia: (b.gastos ?? []).filter((g) => !/^\d{4}-\d{2}-\d{2}$/.test(g.data)).length,
        objetivoMau: b.objetivo != null && !(typeof b.objetivo.nome === 'string' && b.objetivo.alvo > 0),
      }
    } catch (e) {
      return { ok: false, erro: String(e) }
    }
  })
  if (!disco.ok) falhas.push({ tipo: 'orcamento-corrompido', detalhe: disco.erro ?? `valor não finito: ${disco.mau}` })
  if (disco.gastosSemDia > 0) falhas.push({ tipo: 'gasto-sem-dia', detalhe: `${disco.gastosSemDia} gastos com data inválida` })
  if (disco.objetivoMau) falhas.push({ tipo: 'objetivo-invalido', detalhe: 'objetivo guardado sem nome ou com alvo <= 0' })

  // 5. A base de dados nao pode ganhar ficheiros que ninguem reclama.
  //
  // Cada fatura e' um blob no IndexedDB com um bilhete guardado no gasto. Se
  // um caminho qualquer largar o bilhete sem apagar o blob, o ficheiro fica
  // la' para sempre, invisivel e a ocupar espaco — e num telemovel isso e'
  // espaco a serio, porque uma fatura e' uma fotografia.
  const orfaos = await page.evaluate(async () => {
    const chaves = await new Promise((resolve) => {
      const req = indexedDB.open('easy-docs')
      req.onerror = () => resolve(null)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('blobs')) return resolve([])
        const p = db.transaction('blobs', 'readonly').objectStore('blobs').getAllKeys()
        p.onsuccess = () => resolve(p.result.map(String))
        p.onerror = () => resolve(null)
      }
    })
    if (chaves === null) return null
    let orcamento = {}
    try { orcamento = JSON.parse(localStorage.getItem('easy.budget.v1') ?? '{}').budget ?? {} } catch { /* vazio */ }
    const reclamadas = new Set((orcamento.gastos ?? []).map((g) => g.fatura?.blobKey).filter(Boolean))
    const soltas = chaves.filter((k) => k.startsWith('fatura.') && !reclamadas.has(k))
    return { soltas: soltas.length, exemplo: soltas[0] ?? null }
  }).catch(() => null)
  if (orfaos && orfaos.soltas > 0) {
    falhas.push({ tipo: 'fatura-orfa', detalhe: `${orfaos.soltas} ficheiros sem dono no IndexedDB (ex.: ${orfaos.exemplo})` })
  }

  // 6. Alvos de toque. O minimo do modelo sao 44 px.
  const pequenos = await page.evaluate(() => {
    const visivel = (e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'
    }
    return [...document.querySelectorAll('button, a[href], [role="button"], [role="switch"], input[type="file"] + *')]
      .filter(visivel)
      .filter((e) => {
        const r = e.getBoundingClientRect()
        return r.height < 44 - 0.5 || r.width < 24
      })
      .slice(0, 5)
      .map((e) => {
        const r = e.getBoundingClientRect()
        return `${(e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 28)} ${Math.round(r.width)}×${Math.round(r.height)}`
      })
  })
  for (const p of pequenos) falhas.push({ tipo: 'alvo-pequeno', detalhe: p })

  // 7. Erros de consola e promessas por apanhar, recolhidos pelos ouvintes.
  for (const e of estado.erros.splice(0)) falhas.push({ tipo: 'erro-de-js', detalhe: e })
  for (const r of estado.rede.splice(0)) falhas.push({ tipo: 'pedido-de-rede', detalhe: r })

  return falhas
}

// ---------------------------------------------------------------------------
// O repertorio de acoes
// ---------------------------------------------------------------------------
const TABS_Y = 800 // a barra, no fundo dos 844
const TABS_X = [48, 146, 244, 342]

function acoes(page, cdp, rnd) {
  const esperar = (ms) => page.waitForTimeout(ms)
  const talvez = (p) => rnd() < p
  const escolher = (lista) => lista[Math.floor(rnd() * lista.length)]

  /** Toca num elemento pelo seu retangulo, com a impericia de um polegar. */
  const tocarEm = async (loc) => {
    const caixa = await loc.boundingBox().catch(() => null)
    if (!caixa) return false
    if (caixa.y < 0 || caixa.y > 830) {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      await esperar(180)
    }
    const c2 = await loc.boundingBox().catch(() => null)
    if (!c2 || c2.y < 0 || c2.y > 836) return false
    // Nao no centro exato: um dedo acerta ao lado, e e' ai' que se descobre
    // que a area de toque e' mais pequena do que parece.
    const dx = (rnd() - 0.5) * Math.min(c2.width * 0.7, 40)
    const dy = (rnd() - 0.5) * Math.min(c2.height * 0.6, 18)
    await tocar(cdp, c2.x + c2.width / 2 + dx, c2.y + c2.height / 2 + dy)
    await esperar(220)
    return true
  }

  const tocarTexto = async (padrao) => {
    const loc = page.getByRole('button', { name: padrao }).first()
    if (await loc.count().catch(() => 0)) return tocarEm(loc)
    return false
  }

  const fecharFolha = async () => {
    const folha = page.locator('[role="dialog"]')
    if (await folha.count()) {
      // Pelo fundo, como um humano: o toque fora e' o gesto natural.
      await tocar(cdp, 195, 60)
      await esperar(250)
    }
  }

  const escrever = async (loc, texto) => {
    await loc.fill('').catch(() => {})
    for (const ch of texto) {
      await loc.type(ch, { delay: 12 + rnd() * 45 }).catch(() => {})
    }
  }

  return {
    async tocarBarra() {
      await fecharFolha()
      await tocar(cdp, escolher(TABS_X) + (rnd() - 0.5) * 30, TABS_Y + (rnd() - 0.5) * 20)
      await esperar(300)
      return 'toca num separador da barra'
    },

    async arrastar() {
      await fecharFolha()
      const y = 300 + rnd() * 300
      // Um polegar nunca vai a direito: o desvio vertical e' de proposito.
      const desvio = (rnd() - 0.5) * 40
      if (talvez(0.5)) {
        await arrastar(cdp, 330, y, 60, y + desvio)
        await esperar(320)
        return 'arrasta da direita para a esquerda'
      }
      await arrastar(cdp, 60, y, 330, y + desvio)
      await esperar(320)
      return 'arrasta da esquerda para a direita'
    },

    async rolar() {
      const d = talvez(0.7) ? 1 : -1
      await page.mouse.wheel(0, d * (150 + rnd() * 500))
      await esperar(160)
      return `rola ${d > 0 ? 'para baixo' : 'para cima'}`
    },

    async gastoNovo() {
      await fecharFolha()
      await page.goto(`${BASE}/gastos`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      if (!(await tocarTexto(/Novo gasto/))) return 'não encontrou «Novo gasto»'
      const desc = page.getByPlaceholder('Jantar')
      if (await desc.count()) {
        await escrever(desc, escolher(['Jantar', 'Gasolina', 'Farmácia', 'Café', 'Ção õ ü ñ', '   ', 'a'.repeat(120)]))
      }
      const valor = page.locator('input[inputmode="decimal"], input[inputmode="numeric"]').first()
      if (await valor.count()) {
        await escrever(valor, escolher(['19,90', '0', '0,01', '1234567', '2,5', '999999,99']))
      }
      if (talvez(0.35)) {
        const cats = page.locator('[aria-pressed]')
        const n = await cats.count()
        if (n) await tocarEm(cats.nth(Math.floor(rnd() * n)))
      }
      if (talvez(0.5)) { await tocarTexto(/Guardar/) } else { await fecharFolha() }
      await esperar(300)
      return 'regista um gasto novo'
    },

    async abrirGasto() {
      await fecharFolha()
      await page.goto(`${BASE}/gastos`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      const linhas = page.locator('section ul li button').first()
      if (!(await linhas.count())) return 'sem gastos para abrir'
      await tocarEm(linhas)
      await esperar(350)
      if (talvez(0.4)) await tocarTexto(/Anexar fatura|Trocar/)
      await fecharFolha()
      return 'abre a apresentação de um gasto'
    },

    async apagarGasto() {
      await fecharFolha()
      await page.goto(`${BASE}/gastos`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      const lixo = page.getByRole('button', { name: /^Apagar / }).first()
      if (!(await lixo.count())) return 'sem gastos para apagar'
      await tocarEm(lixo)
      await esperar(250)
      if (talvez(0.5)) await tocarTexto(/Desfazer/)
      return 'apaga um gasto (e às vezes desfaz)'
    },

    async plano() {
      await fecharFolha()
      await page.goto(`${BASE}/plano`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      const sliders = page.locator('input[type="range"]')
      const n = await sliders.count()
      if (n) {
        const s = sliders.nth(Math.floor(rnd() * n))
        const c = await s.boundingBox().catch(() => null)
        if (c) {
          // Arrasta o cursor de verdade, com o dedo, de ponta a ponta.
          await arrastar(cdp, c.x + 8, c.y + c.height / 2, c.x + rnd() * c.width, c.y + c.height / 2, 16)
          await esperar(250)
        }
      }
      const rend = page.locator('input[inputmode="decimal"], input[inputmode="numeric"]').first()
      if ((await rend.count()) && talvez(0.4)) await escrever(rend, escolher(['2400', '0', '85000000']))
      return 'mexe nos cursores do plano'
    },

    async fixas() {
      await fecharFolha()
      await page.goto(`${BASE}/fixas`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      if (talvez(0.45)) {
        if (await tocarTexto(/Adicionar despesa/)) {
          const nome = page.getByPlaceholder(/Renda/)
          if (await nome.count()) await escrever(nome, escolher(['Renda', 'Ginásio', 'IUC', '']))
          const v = page.locator('input[inputmode="decimal"], input[inputmode="numeric"]').first()
          if (await v.count()) await escrever(v, escolher(['750', '240', '0']))
          if (talvez(0.7)) await tocarTexto(/^Guardar$/)
          else await fecharFolha()
        }
      } else {
        // O arrasto para apagar: tem de continuar a ser dele e nao do separador.
        const linha = page.locator('li [role="switch"]').first()
        const c = await linha.boundingBox().catch(() => null)
        if (c) {
          await arrastar(cdp, 320, c.y + c.height / 2, 150, c.y + c.height / 2, 14)
          await esperar(300)
          if (talvez(0.5)) await tocarTexto(/Desfazer/)
        }
      }
      return 'mexe nas despesas fixas'
    },

    async documentos() {
      await fecharFolha()
      await page.goto(`${BASE}/documentos`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      if (talvez(0.5)) {
        const input = page.locator('input[type="file"]').first()
        if (await input.count()) {
          await input.setInputFiles({
            name: escolher(['contrato.pdf', 'recibo.png', 'nota.txt', 'ç ã õ.png']),
            mimeType: escolher(['application/pdf', 'image/png', 'text/plain']),
            buffer: Buffer.from(`bot ${Date.now()}`),
          }).catch(() => {})
          await esperar(400)
        }
      } else {
        const apagar = page.getByRole('button', { name: /^Apagar / }).first()
        if (await apagar.count()) {
          await tocarEm(apagar)
          if (talvez(0.5)) await tocarTexto(/Desfazer/)
        }
      }
      return 'carrega ou apaga um documento'
    },

    async perfil() {
      await fecharFolha()
      await page.goto(`${BASE}/perfil`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      const alvos = page.locator('button, [role="switch"]')
      const n = await alvos.count()
      if (n) await tocarEm(alvos.nth(Math.floor(rnd() * n)))
      return 'anda pelo perfil'
    },

    async objetivo() {
      await fecharFolha()
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(500)
      const linha = page.getByRole('button', { name: /Poupança/ }).first()
      if (!(await linha.count())) return 'sem legenda para tocar'
      await tocarEm(linha)
      await esperar(350)
      if (await tocarTexto(/Definir um objetivo|Editar/)) {
        const nome = page.getByPlaceholder('Carro')
        if (await nome.count()) await escrever(nome, escolher(['Carro', 'Casa', '', 'Ç']))
        const campos = page.locator('input[inputmode="decimal"], input[inputmode="numeric"]')
        const n = await campos.count()
        if (n > 0) await escrever(campos.nth(0), escolher(['14000', '0', '1']))
        if (n > 1 && talvez(0.6)) await escrever(campos.nth(1), escolher(['6200', '0', '99999']))
        if (talvez(0.6)) await tocarTexto(/^Guardar$/)
        else if (talvez(0.4)) await tocarTexto(/Remover objetivo/)
      }
      await fecharFolha()
      return 'mexe no objetivo'
    },

    async abrirEFechar() {
      await fecharFolha()
      const destino = escolher(['/gastos', '/', '/fixas'])
      await page.goto(`${BASE}${destino}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      await tocarTexto(/Novo gasto|Adicionar despesa|Poupança/)
      await esperar(250)
      await fecharFolha()
      return 'abre uma folha e fecha-a sem guardar'
    },

    async importar() {
      // Substituir o orcamento inteiro larga os bilhetes de todas as faturas
      // que la' estavam. E' o caminho onde um ficheiro fica sem dono.
      await fecharFolha()
      await page.goto(`${BASE}/definicoes`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(400)
      const input = page.locator('input[type="file"]').first()
      if (!(await input.count())) return 'sem importação disponível'
      await input.setInputFiles({
        name: 'orcamento.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ version: 4, budget: {
          rendimentoMensal: 180000, extras: 0, modoDespesas: 'percentagem', despesasPercentagem: 50,
          despesasFixas: [], gastos: [], limites: {},
          alocacao: { investimentos: 10, poupanca: 10 },
          poupancaAcumulada: 0, taxaAnualEsperada: 5, modoDiscreto: false, objetivo: null,
        } })),
      }).catch(() => {})
      await esperar(600)
      return 'importa um orçamento por cima do que lá estava'
    },

    async tema() {
      await page.evaluate(() => {
        const t = document.documentElement.getAttribute('data-theme')
        document.documentElement.setAttribute('data-theme', t === 'dark' ? 'light' : 'dark')
      })
      await esperar(200)
      return 'troca de tema'
    },

    async recarregar() {
      await fecharFolha()
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
      await esperar(700)
      return 'recarrega a página'
    },
  }
}

// ---------------------------------------------------------------------------
// Um bot
// ---------------------------------------------------------------------------
async function correrBot(browser, nomeFeitio, semente, relatorio) {
  const feitio = FEITIOS[nomeFeitio]
  const rnd = aleatorio(semente)
  const contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: rnd() < 0.5 ? 'light' : 'dark',
  })
  const page = await contexto.newPage()
  const estado = { erros: [], rede: [] }

  page.on('pageerror', (e) => estado.erros.push(`pageerror: ${String(e).slice(0, 300)}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    // O aviso do service worker em dev nao e' um erro da app.
    if (/service worker|sw\.js|Failed to load resource.*favicon/i.test(t)) return
    estado.erros.push(`console: ${t.slice(0, 300)}`)
  })
  page.on('request', (r) => {
    const u = r.url()
    if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) {
      estado.rede.push(u.slice(0, 160))
    }
  })

  const cdp = await contexto.newCDPSession(page)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  // Uma app ja' vivida, e nao uma acabada de instalar: com o perfil vazio,
  // metade das acoes era «sem gastos para apagar» e os caminhos fundos —
  // apagar, desfazer, editar — nunca chegavam a correr.
  await page.evaluate((mes) => {
    localStorage.setItem('easy.onboarded.v1', '1')
    localStorage.setItem('easy.budget.v1', JSON.stringify({ version: 4, budget: {
      rendimentoMensal: 240000, extras: 15000, modoDespesas: 'lista', despesasPercentagem: 45,
      despesasFixas: [
        { id: 'f1', nome: 'Renda', valor: 75000, categoria: 'casa', periodicidade: 'mensal', ativo: true },
        { id: 'f2', nome: 'Carro', valor: 18000, categoria: 'transportes', periodicidade: 'mensal', ativo: true },
        { id: 'f3', nome: 'IUC', valor: 24000, categoria: 'transportes', periodicidade: 'anual', ativo: true },
        { id: 'f4', nome: 'Ginásio', valor: 4000, categoria: 'saude', periodicidade: 'mensal', ativo: false },
      ],
      gastos: Array.from({ length: 14 }, (_, i) => ({
        id: `g${i}`, descricao: ['Jantar', 'Gasolina', 'Farmácia', 'Café'][i % 4],
        valor: [1990, 6000, 1250, 90][i % 4],
        categoria: ['alimentacao', 'transportes', 'saude', 'alimentacao'][i % 4],
        data: `${mes}-${String((i % 27) + 1).padStart(2, '0')}`,
      })),
      limites: { alimentacao: 20000, transportes: 15000 },
      alocacao: { investimentos: 10, poupanca: 10 },
      poupancaAcumulada: 620000, taxaAnualEsperada: 5, modoDiscreto: false,
      objetivo: { nome: 'Carro', alvo: 1400000, criadoEm: '2026-01-02T00:00:00.000Z' },
    } }))
  }, new Date().toISOString().slice(0, 7))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // Uma fatura de verdade no IndexedDB, para o caminho dos blobs contar.
  await page.goto(`${BASE}/gastos`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(500)
  const primeira = page.locator('section ul li button').first()
  if (await primeira.count().catch(() => 0)) {
    await primeira.click().catch(() => {})
    await page.waitForTimeout(400)
    await page.locator('input[type="file"]').last().setInputFiles({
      name: 'talao.png', mimeType: 'image/png', buffer: Buffer.from('bot-talao'),
    }).catch(() => {})
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(400)

  const reportorio = acoes(page, cdp, rnd)
  const nomes = Object.keys(feitio.pesos)
  const bolo = nomes.flatMap((n) => Array(feitio.pesos[n]).fill(n)).filter((n) => reportorio[n])

  const rasto = []
  let anterior = null

  for (let i = 0; i < N_ACOES; i++) {
    const nome = feitio.reincidencia > 0 && anterior && rnd() < feitio.reincidencia
      ? anterior
      : bolo[Math.floor(rnd() * bolo.length)]
    anterior = nome

    let descricao = nome
    try {
      descricao = (await reportorio[nome]()) ?? nome
    } catch (e) {
      relatorio.falhas.push({
        bot: nomeFeitio, semente, acao: i, tipo: 'acao-rebentou',
        detalhe: `${nome}: ${String(e).slice(0, 200)}`, rasto: rasto.slice(-8),
      })
    }
    rasto.push(`${i}. ${descricao}`)

    const [min, max] = feitio.pausa
    await page.waitForTimeout(min + rnd() * (max - min))

    const falhas = await verificar(page, estado)
    for (const f of falhas) {
      relatorio.falhas.push({ bot: nomeFeitio, semente, acao: i, ...f, rasto: rasto.slice(-8) })
    }
    if (falhas.some((f) => f.tipo === 'pagina-morta' || f.tipo === 'ecra-em-branco')) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(600)
    }
  }

  relatorio.acoes += N_ACOES
  await contexto.close()
}

// ---------------------------------------------------------------------------
const relatorio = { acoes: 0, falhas: [], semente: SEMENTE }
const browser = await launch({ headless: !VER })
const feitios = Object.keys(FEITIOS)

console.log(`\n${N_BOTS} bots × ${N_ACOES} ações · semente ${SEMENTE}\n`)
try {
  // Em lotes de tres: mais do que isso e o portatil passa a ser o gargalo e as
  // pausas deixam de ser as que o feitio pediu.
  for (let i = 0; i < N_BOTS; i += 3) {
    const lote = []
    for (let j = i; j < Math.min(i + 3, N_BOTS); j++) {
      const feitio = feitios[j % feitios.length]
      console.log(`  bot ${j + 1}: ${feitio}`)
      lote.push(correrBot(browser, feitio, SEMENTE + j * 7919, relatorio))
    }
    await Promise.all(lote)
  }
} finally {
  await browser.close()
}

// ---------------------------------------------------------------------------
// O relatorio: agrupado por tipo, com um rasto reproduzivel por cada.
// ---------------------------------------------------------------------------
const porTipo = new Map()
for (const f of relatorio.falhas) {
  const chave = `${f.tipo} :: ${f.detalhe}`
  if (!porTipo.has(chave)) porTipo.set(chave, { ...f, vezes: 0 })
  porTipo.get(chave).vezes++
}
const ordenadas = [...porTipo.values()].sort((a, b) => b.vezes - a.vezes)

console.log(`\n${'─'.repeat(70)}`)
console.log(`${relatorio.acoes} ações · ${relatorio.falhas.length} falhas · ${ordenadas.length} distintas\n`)
for (const f of ordenadas) {
  console.log(`[${f.vezes}×] ${f.tipo}`)
  console.log(`      ${f.detalhe}`)
  console.log(`      ${f.bot}, ação ${f.acao} · semente ${f.semente}`)
  if (f.rasto?.length) console.log(`      rasto: ${f.rasto.slice(-4).join(' → ')}`)
  console.log()
}
if (ordenadas.length === 0) console.log('Nada. Os bots não partiram nada.\n')

mkdirSync(join(raiz, '.tmp'), { recursive: true })
writeFileSync(join(raiz, '.tmp', 'bots.json'), JSON.stringify(relatorio, null, 2))
console.log(`Detalhe em .tmp/bots.json`)
process.exit(ordenadas.length > 0 ? 1 : 0)
