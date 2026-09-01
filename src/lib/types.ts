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
  valor: Money
  categoria: FixedCategory
  ativo: boolean
}

export type Budget = {
  rendimentoMensal: Money      // liquido, o que entra na conta
  extras: Money                // freelance, subsidios, rendas recebidas
  modoDespesas: 'percentagem' | 'lista'
  despesasPercentagem: number  // modo simples
  despesasFixas: FixedExpense[]// modo detalhado
  alocacao: Allocation
  diaDeRecebimento: number     // 1-28
  /** Added to the briefing model: the emergency-fund metric needs a stock of
   *  savings, not just the monthly flow. See DECISIONS.md. */
  poupancaAcumulada: Money
  /** Editable expected annual return for the projection, in percent. */
  taxaAnualEsperada: number
}

export type DocTag = 'contrato' | 'recibo' | 'seguro' | 'imposto' | 'banco' | 'outro'

export type Doc = {
  id: string
  nome: string
  tipo: string      // mime
  tamanho: number
  tags: DocTag[]
  criadoEm: string  // ISO
  blobKey: string   // chave IndexedDB
}
