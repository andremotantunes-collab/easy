/**
 * The calculation engine. Pure functions, integer cents in and out.
 * Nothing here touches React, storage or the DOM.
 */
import { mesDe } from './format'
import type { Budget, FixedExpense, Money } from './types'

export type Breakdown = {
  rendimentoTotal: Money
  despesasFixas: Money
  /** O que se gastou neste mes, dia a dia. */
  gastos: Money
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

/**
 * What one expense costs in a month. A yearly charge is spread over twelve,
 * rounded to the cent, because the whole product thinks in months.
 */
export function mensalizado(e: FixedExpense): Money {
  return e.periodicidade === 'anual' ? Math.round(e.valor / 12) : e.valor
}

export function totalFixas(budget: Budget, rendimentoTotal: Money): Money {
  return budget.modoDespesas === 'lista'
    ? budget.despesasFixas.reduce((sum, e) => (e.ativo ? sum + mensalizado(e) : sum), 0)
    : pct(rendimentoTotal, budget.despesasPercentagem)
}

/** O que se gastou num mes. O mes de um gasto sai do dia dele. */
export function gastosDe(budget: Budget, mes: string): Money {
  return budget.gastos.reduce((soma, g) => (g.data.slice(0, 7) === mes ? soma + g.valor : soma), 0)
}

/**
 * The order of operations is fixed by the spec:
 *   total -> fixas -> gastos -> investimentos -> poupanca -> sobras.
 * Because sobras is computed as a remainder rather than rounded on its own,
 * the slices always add back up to the total, to the cent.
 *
 * Os gastos entram DEPOIS das fixas e ANTES do que sobra, mas nao mexem no que
 * se investe nem no que se poupa: um jantar de 19,90 euros nao e' motivo para
 * deixar de investir — e' menos 19,90 para gastar. Quem quiser o contrario
 * mexe no plano, que e' uma decisao e nao um acidente.
 *
 * E' isto que faz o bolo descer a cada gasto registado: as sobras sao o resto,
 * e o resto encolhe.
 */
export function compute(budget: Budget, mes: string = mesDe(new Date())): Breakdown {
  const rendimentoTotal = budget.rendimentoMensal + budget.extras
  const despesasFixas = totalFixas(budget, rendimentoTotal)
  const gastos = gastosDe(budget, mes)
  const investimentos = pct(rendimentoTotal, budget.alocacao.investimentos)
  const poupanca = pct(rendimentoTotal, budget.alocacao.poupanca)
  const sobras = rendimentoTotal - despesasFixas - gastos - investimentos - poupanca
  return {
    rendimentoTotal,
    despesasFixas,
    gastos,
    investimentos,
    poupanca,
    sobras,
    emDefice: sobras < 0,
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type SavingsRateLevel = 'bom' | 'medio' | 'baixo'

/** How much of what comes in is kept: invested plus saved. */
export function taxaPoupanca(b: Breakdown): number {
  return b.rendimentoTotal > 0 ? (b.investimentos + b.poupanca) / b.rendimentoTotal : 0
}

export function nivelTaxaPoupanca(taxa: number): SavingsRateLevel {
  if (taxa >= 0.2) return 'bom'
  if (taxa >= 0.1) return 'medio'
  return 'baixo'
}

/** Fixed expenses as a share of income. Over half is the line worth flagging. */
export function pesoDespesasFixas(b: Breakdown): number {
  return b.rendimentoTotal > 0 ? b.despesasFixas / b.rendimentoTotal : 0
}

export function fundoEmergenciaMeses(poupancaAcumulada: Money, despesasFixas: Money): number {
  if (despesasFixas <= 0) return 0
  return poupancaAcumulada / despesasFixas
}

export const META_FUNDO_MESES = 6

/** What a year of living exactly like this costs. */
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
