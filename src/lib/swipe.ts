/**
 * Arrastar de lado muda de secao.
 *
 * O problema que isto resolve: num telemovel, um arrasto horizontal era do
 * BROWSER — voltava atras no historico, ou avancava. Numa app de quatro
 * separadores isso e' quase sempre o contrario do que se queria: quem arrasta
 * quer o separador do lado, nao a pagina onde esteve ha' tres toques.
 *
 * A direcao segue o que todos os telemoveis fazem, e nao ha' aqui nenhuma
 * invencao: o dedo empurra o conteudo, e o conteudo vai para onde o dedo o
 * levar. Arrastar da direita para a esquerda puxa a seccao da DIREITA para
 * dentro do ecra (o mesmo que o polegar faz numa galeria de fotos); da
 * esquerda para a direita traz a da ESQUERDA.
 *
 * Tudo o resto neste ficheiro sao as excecoes — e sao elas o trabalho todo. Um
 * gesto destes, mal apanhado, rouba o arrasto a um slider, a uma folha aberta,
 * ou a` linha que se arrasta para apagar uma despesa.
 */

/** Os quatro separadores, pela ordem em que estao na barra. */
export const SECCOES = ['/', '/gastos', '/documentos', '/perfil'] as const

/**
 * Em que seccao estamos, lido do proprio endereco.
 *
 * Publicada, a app vive em `/easy/` e nao na raiz, e havia aqui duas fontes de
 * verdade sobre onde estamos: o `pathname` do router, e esta lista de caminhos.
 * O router faz a coisa certa — foi verificado contra a build de `/easy/`, e o
 * gesto funcionava dos dois lados — mas fazia-a noutro sitio, e uma regra
 * partida ao meio e' uma regra a` espera de se desencontrar.
 *
 * Lido daqui, a base sai do `BASE_URL` da propria compilacao, ha' uma so'
 * regra, e os ouvintes podem ligar-se UMA vez em vez de a cada navegacao — que
 * era o que perdia o gesto em curso quando o `touchstart` ficava com um
 * ouvinte e o `touchend` caia no seguinte.
 */
export function seccaoAtual(): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
  let caminho = window.location.pathname
  if (base && caminho.startsWith(base)) caminho = caminho.slice(base.length)
  if (!caminho.startsWith('/')) caminho = `/${caminho}`
  // '/gastos/' e '/gastos' sao o mesmo sitio; '/' fica '/'.
  return caminho.length > 1 ? caminho.replace(/\/+$/, '') : '/'
}

/** Distancia minima, em pixeis, para um arrasto contar como gesto. */
const DISTANCIA_MINIMA = 64

/**
 * O gesto tem de ser claramente horizontal. 1,6 e' generoso o suficiente para
 * um polegar, que nunca anda a direito, e apertado o suficiente para nao
 * roubar o arrasto a quem esta' so' a percorrer a pagina de cima a baixo.
 */
const RAZAO_HORIZONTAL = 1.6

/** Acima disto ja' nao e' um gesto, e' alguem com o dedo pousado no ecra. */
const TEMPO_MAXIMO_MS = 800

/**
 * Onde um arrasto horizontal NAO e' nosso.
 *
 * - `[data-sem-swipe]` — quem trata do proprio gesto marca-se assim. E' o caso
 *   da linha das despesas fixas, que se arrasta para apagar.
 * - `input`, e em especial os `type="range"` do Plano e do Investir: arrastar
 *   um slider e' arrastar um slider.
 * - `[role="dialog"]` — com uma folha aberta, o ecra de tras nao existe.
 * - qualquer caixa que role' de lado por si (uma tabela larga, uma fatura),
 *   detetada pela medida e nao por uma lista de classes que envelhece.
 */
function tratadoPorOutro(alvo: EventTarget | null): boolean {
  let no = alvo instanceof Element ? alvo : null
  while (no) {
    if (no.hasAttribute('data-sem-swipe')) return true
    const nome = no.tagName
    if (nome === 'INPUT' || nome === 'TEXTAREA' || nome === 'SELECT') return true
    if (no.getAttribute('role') === 'dialog' || no.getAttribute('role') === 'slider') return true
    if (no.scrollWidth > no.clientWidth + 1) {
      const overflow = getComputedStyle(no).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    no = no.parentElement
  }
  return false
}

export type Sentido = 'esquerda' | 'direita'

/**
 * Liga a escuta ao documento e devolve a funcao que a desliga.
 *
 * `aoMudar` recebe o caminho de destino e o sentido em que a seccao nova
 * entra, para a animacao poder ir ao encontro do dedo em vez de contra ele.
 * O caminho de destino e' relativo a` app: quem navega e' que lhe poe a base.
 */
export function ligarSwipe(aoMudar: (destino: string, sentido: Sentido) => void): () => void {
  let x0 = 0
  let y0 = 0
  let t0 = 0
  let valido = false

  const inicio = (e: TouchEvent) => {
    // Dois dedos e' um zoom, ou uma palma pousada. Nunca um gesto de seccao.
    valido = e.touches.length === 1 && !tratadoPorOutro(e.target)
    if (!valido) return
    x0 = e.touches[0].clientX
    y0 = e.touches[0].clientY
    t0 = Date.now()
  }

  const fim = (e: TouchEvent) => {
    if (!valido) return
    valido = false
    const toque = e.changedTouches[0]
    if (!toque) return

    const dx = toque.clientX - x0
    const dy = toque.clientY - y0
    if (Date.now() - t0 > TEMPO_MAXIMO_MS) return
    if (Math.abs(dx) < DISTANCIA_MINIMA) return
    if (Math.abs(dx) < Math.abs(dy) * RAZAO_HORIZONTAL) return

    const i = (SECCOES as readonly string[]).indexOf(seccaoAtual())
    // Fora dos quatro separadores nao ha' vizinhos: uma sub-pagina como o
    // Plano ou as Fixas nao pertence a` fila e nao se troca por arrasto.
    if (i === -1) return

    // dx < 0 e' o dedo a ir para a esquerda: empurra o conteudo para la' e a
    // seccao da direita entra. dx > 0 traz a da esquerda.
    const destinoIndice = dx < 0 ? i + 1 : i - 1
    if (destinoIndice < 0 || destinoIndice >= SECCOES.length) return

    aoMudar(SECCOES[destinoIndice], dx < 0 ? 'esquerda' : 'direita')
  }

  // Passivo: isto nunca chama `preventDefault`, e dize-lo ao browser deixa-o
  // continuar a rolar a pagina a 60 fps enquanto o dedo anda.
  document.addEventListener('touchstart', inicio, { passive: true })
  document.addEventListener('touchend', fim, { passive: true })
  return () => {
    document.removeEventListener('touchstart', inicio)
    document.removeEventListener('touchend', fim)
  }
}
