/** Money is always an integer number of cents. Never a float. */
export type Money = number

export type Allocation = {
  investimentos: number // % 0-100
  poupanca: number      // % 0-100 (objetivos, fundo de emergencia)
}

export type FixedCategory =
  | 'casa' | 'transportes' | 'subscricoes' | 'saude' | 'creditos' | 'outros'

export type FixedExpense = {
  id: string
  nome: string
  /** The amount as it is actually charged, monthly or yearly. */
  valor: Money
  periodicidade: 'mensal' | 'anual'
  categoria: FixedCategory
  ativo: boolean
}

/** As categorias do dia a dia. Sao outras que as das despesas fixas de
 *  proposito: ninguem paga "credito" ao almoco nem "alimentacao" ao banco. */
export type GastoCategoria =
  | 'alimentacao'
  | 'transportes'
  | 'casa'
  | 'saude'
  | 'lazer'
  | 'compras'
  | 'outros'

/**
 * Um gasto: o jantar de 19,90 €, a gasolina, a farmacia.
 *
 * Tem um DIA e nao um mes, porque a pergunta "quanto gastei esta semana?" nao
 * se responde com um mes, e porque o grafico precisa de saber quando. O mes a
 * que pertence sai do dia, e nao ao contrario — assim nao ha' dois campos a
 * poderem discordar um do outro.
 */
export type Gasto = {
  id: string
  descricao: string
  valor: Money
  categoria: GastoCategoria
  /** 'aaaa-mm-dd' — o dia em que aconteceu. */
  data: string
}

/** Limite mensal por categoria, quando existe. Uma categoria sem limite
 *  aparece com o que gastaste e nada mais: nao se inventa um tecto. */
export type LimitesPorCategoria = Partial<Record<GastoCategoria, Money>>

export type Budget = {
  rendimentoMensal: Money      // liquido, o que entra na conta
  extras: Money                // freelance, subsidios, rendas recebidas
  modoDespesas: 'percentagem' | 'lista'
  despesasPercentagem: number  // modo simples
  despesasFixas: FixedExpense[]// modo detalhado
  /** Tudo o que se gastou, dia a dia. Guardados todos juntos, filtrados
   *  pelo periodo que se esta' a ver. */
  gastos: Gasto[]
  /** Tecto mensal por categoria, para as categorias que tenham um. */
  limites: LimitesPorCategoria
  alocacao: Allocation
  /** Added to the briefing model: the emergency-fund metric needs a stock of
   *  savings, not just the monthly flow. See DECISIONS.md. */
  poupancaAcumulada: Money
  /** Editable expected annual return for the projection, in percent. */
  taxaAnualEsperada: number
  /** Hides every euro amount on screen, without hiding the structure. */
  modoDiscreto: boolean
}

export type Doc = {
  id: string
  nome: string
  tipo: string      // mime
  tamanho: number
  criadoEm: string  // ISO
  blobKey: string   // chave IndexedDB
}
