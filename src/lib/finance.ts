/**
 * The calculation engine. Pure functions, integer cents in and out.
 * Nothing here touches React, storage or the DOM.
 */
import type { Budget, Money } from './types'

export type Breakdown = {
  rendimentoTotal: Money
  despesasFixas: Money
  investimentos: Money
  poupanca: Money
  /** "O bolo" - what is genuinely free to spend. May be negative. */
  sobras: Money
  emDefice: boolean
}

/** Percentage of an amount in cents, rounded to the nearest cent. */
function pct(amount: Money, percentage: number): Money {
  return Math.round((amount * percentage) / 100)
}

export function totalFixas(budget: Budget, rendimentoTotal: Money): Money {
  return budget.modoDespesas === 'lista'
    ? budget.despesasFixas.reduce((sum, e) => (e.ativo ? sum + e.valor : sum), 0)
    : pct(rendimentoTotal, budget.despesasPercentagem)
}

/**
 * The order of operations is fixed by the spec:
 *   total -> fixas -> investimentos -> poupanca -> sobras (the remainder).
 * Because sobras is computed as a remainder rather than rounded on its own,
 * the four slices always add back up to the total, to the cent.
 */
export function compute(budget: Budget): Breakdown {
  const rendimentoTotal = budget.rendimentoMensal + budget.extras
  const despesasFixas = totalFixas(budget, rendimentoTotal)
  const investimentos = pct(rendimentoTotal, budget.alocacao.investimentos)
  const poupanca = pct(rendimentoTotal, budget.alocacao.poupanca)
  const sobras = rendimentoTotal - despesasFixas - investimentos - poupanca
  return {
    rendimentoTotal,
    despesasFixas,
    investimentos,
    poupanca,
    sobras,
    emDefice: sobras < 0,
  }
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** The next date on which money lands, given a payday between 1 and 28. */
export function proximoRecebimento(hoje: Date, diaDeRecebimento: number): Date {
  const dia = Math.min(28, Math.max(1, Math.round(diaDeRecebimento)))
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
  // On payday itself the whole next cycle is ahead of you, so roll forward.
  if (d.getTime() <= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

const DIA_MS = 24 * 60 * 60 * 1000

/** Whole days between today and the next payday. Never below 1. */
export function diasAteProximoRecebimento(hoje: Date, diaDeRecebimento: number): number {
  const alvo = proximoRecebimento(hoje, diaDeRecebimento)
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  // Round rather than floor: DST shifts make the raw difference 23h or 25h.
  return Math.max(1, Math.round((alvo.getTime() - inicio.getTime()) / DIA_MS))
}

// ---------------------------------------------------------------------------
// The six metrics
// ---------------------------------------------------------------------------

export type SavingsRateLevel = 'bom' | 'medio' | 'baixo'

export function porDia(sobras: Money, dias: number): Money {
  if (dias <= 0) return 0
  return Math.round(sobras / dias)
}

export function taxaPoupanca(b: Breakdown): number {
  if (b.rendimentoTotal <= 0) return 0
  return (b.investimentos + b.poupanca) / b.rendimentoTotal
}

export function nivelTaxaPoupanca(taxa: number): SavingsRateLevel {
  if (taxa >= 0.2) return 'bom'
  if (taxa >= 0.1) return 'medio'
  return 'baixo'
}

export function pesoDespesasFixas(b: Breakdown): number {
  if (b.rendimentoTotal <= 0) return 0
  return b.despesasFixas / b.rendimentoTotal
}

/** Months of fixed costs already covered by accumulated savings. */
export function fundoEmergenciaMeses(poupancaAcumulada: Money, despesasFixas: Money): number {
  if (despesasFixas <= 0) return 0
  return poupancaAcumulada / despesasFixas
}

export const META_FUNDO_MESES = 6

/** What a year of living exactly like this costs. */
export function custoVidaAnual(b: Breakdown): Money {
  return (b.despesasFixas + b.sobras) * 12
}

export type Projection = {
  total: Money
  capital: Money
  juro: Money
}

/**
 * Future value of a monthly annuity:
 *   FV = P * [((1 + r)^n - 1) / r],  r = annual rate / 12,  n = months.
 * At r = 0 the closed form divides by zero, so the limit (P * n) is used.
 */
export function projecao(mensal: Money, taxaAnualPct: number, anos: number): Projection {
  const n = Math.round(anos * 12)
  const r = taxaAnualPct / 100 / 12
  const capital = mensal * n
  if (n <= 0 || mensal === 0) return { total: 0, capital: 0, juro: 0 }
  const total = r === 0
    ? capital
    : Math.round(mensal * ((Math.pow(1 + r, n) - 1) / r))
  return { total, capital, juro: total - capital }
}

// ---------------------------------------------------------------------------
// Deficit guidance
// ---------------------------------------------------------------------------

/** Ordered suggestions shown when the plan does not balance. Never hides the number. */
export function sugestoesDefice(budget: Budget, b: Breakdown): string[] {
  const out: string[] = []
  if (budget.alocacao.investimentos > 0) {
    out.push('baixar-investimento')
  }
  if (b.despesasFixas > 0) {
    out.push('rever-fixas')
  }
  if (out.length === 0) out.push('aumentar-rendimento')
  return out
}
