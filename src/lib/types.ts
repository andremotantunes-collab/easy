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
 * A fatura de um gasto: o talao do jantar, a fatura da oficina.
 *
 * O ficheiro em si vive no IndexedDB, ao lado dos documentos — um blob nao
 * cabe no localStorage e nao tem nada que la' estar. Aqui fica so' o bilhete
 * que lhe chama: o nome para mostrar, o tipo para saber se se pre-visualiza, e
 * a chave para o ir buscar.
 *
 * NAO entra no indice dos Documentos de proposito: um ano de taloes de cafe'
 * afogava os contratos e os recibos de vencimento que la' estao.
 */
export type Fatura = {
  nome: string
  tipo: string      // mime
  tamanho: number
  blobKey: string   // chave IndexedDB, no mesmo armazem dos documentos
}

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
  /** A fatura, quando ha' uma. Opcional: a esmagadora maioria dos gastos do
   *  dia a dia nao tem papel nenhum, e obrigar a um seria um imposto. */
  fatura?: Fatura
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
  /** A meta sobre a poupanca acumulada, quando existe. `null` por omissao, e
   *  invisivel em todo o lado menos onde se vai ve'-la de proposito. */
  objetivo: Goal | null
}

/**
 * O objetivo: UM so', opcional, e discreto por desenho.
 *
 * Nao tem `valorJaJuntado` nenhum, e essa ausencia e' a feature. A Easy. tem um
 * SO' pote de poupanca — `poupancaAcumulada` — e o objetivo e' uma meta sobre
 * esse pote, nao uma conta a` parte. Guardar aqui um segundo saldo era abrir a
 * porta a dois numeros a discordarem um do outro, e a app teria de escolher em
 * qual mentir.
 */
export type Goal = {
  nome: string
  alvo: Money
  criadoEm: string  // ISO
}

export type Doc = {
  id: string
  nome: string
  tipo: string      // mime
  tamanho: number
  criadoEm: string  // ISO
  blobKey: string   // chave IndexedDB
}
