/**
 * The month roll-over.
 *
 * There is no server and nothing runs while the app is closed, so a month does
 * not close at midnight on the 1st — it closes the first time you OPEN the app
 * after the month has turned. That is the honest shape of it on a device-only
 * product, and the wording in the app says so.
 *
 * What it does: archives the month that was open, exactly as the plan stood.
 * What it deliberately does NOT do: touch a single number you wrote. The
 * accumulated savings stay yours to change. See DECISIONS.md.
 */
import { mesDe } from './format'
import type { Breakdown } from './finance'
import type { Money } from './types'

export { mesDe }

export const HISTORICO_KEY = 'easy.historico.v1'

/** Bounded so a device that keeps the app for a decade never grows unbounded. */
const MAX_MESES = 60

export type MesFechado = {
  /** 'aaaa-mm' of the month this record covers. */
  mes: string
  rendimentoTotal: Money
  despesasFixas: Money
  /** O que se gastou naquele mes, dia a dia. */
  gastos: Money
  investimentos: Money
  poupanca: Money
  sobras: Money
  /** When the app actually noticed, which is not the 1st. */
  fechadoEm: string
}

export type Historico = {
  /** The month the app had open last time, 'aaaa-mm'; null on a first run. */
  mesAberto: string | null
  meses: MesFechado[]
}

export const historicoVazio = (): Historico => ({ mesAberto: null, meses: [] })

/**
 * The whole rule, as a pure function: given what was stored, what time it is
 * and how the plan stands, return the new history and the month that closed.
 *
 * A gap of several months records ONE entry, for the month that was actually
 * open. The app knows nothing about the months it never saw, and inventing
 * them from today's plan would be writing fiction into a record.
 */
export function virarMes(
  historico: Historico,
  agora: Date,
  b: Breakdown,
): { historico: Historico; fechado: MesFechado | null } {
  const atual = mesDe(agora)

  // First run: there is no month to close, only one to start.
  if (!historico.mesAberto) {
    return { historico: { ...historico, mesAberto: atual }, fechado: null }
  }
  if (historico.mesAberto === atual) return { historico, fechado: null }

  const fechado: MesFechado = {
    mes: historico.mesAberto,
    rendimentoTotal: b.rendimentoTotal,
    despesasFixas: b.despesasFixas,
    gastos: b.gastos,
    investimentos: b.investimentos,
    poupanca: b.poupanca,
    sobras: b.sobras,
    fechadoEm: agora.toISOString(),
  }

  // Re-closing a month that is already on file replaces it rather than
  // doubling it: two devices, or a clock that went backwards.
  const meses = [...historico.meses.filter((m) => m.mes !== fechado.mes), fechado]
    .sort((x, y) => x.mes.localeCompare(y.mes))
    .slice(-MAX_MESES)

  return { historico: { mesAberto: atual, meses }, fechado }
}

/**
 * What the closed months put aside, up to and including `ate`.
 *
 * It is a sum of RECORDS, not a claim about a bank balance: it says what the
 * plan set aside in the months the app actually saw. The month in progress is
 * not in it — that month has not happened yet.
 */
export function poupadoAte(meses: MesFechado[], ate: string): { total: Money; quantos: number } {
  const conta = meses.filter((m) => m.mes <= ate)
  return {
    total: conta.reduce((soma, m) => soma + m.poupanca + m.investimentos, 0),
    quantos: conta.length,
  }
}

/** An archived month reads exactly like a live one, so every metric and the
 *  donut work on it without a second code path. */
export function comoBreakdown(m: MesFechado): Breakdown {
  return {
    rendimentoTotal: m.rendimentoTotal,
    despesasFixas: m.despesasFixas,
    gastos: m.gastos,
    investimentos: m.investimentos,
    poupanca: m.poupanca,
    sobras: m.sobras,
    emDefice: m.sobras < 0,
  }
}

export function loadHistorico(): Historico {
  try {
    const raw = localStorage.getItem(HISTORICO_KEY)
    if (!raw) return historicoVazio()
    const parsed = JSON.parse(raw) as Partial<Historico>
    return {
      mesAberto: typeof parsed?.mesAberto === 'string' ? parsed.mesAberto : null,
      // Um registo gravado antes disto existir nao tem o campo, e um numero em
      // falta a meio de uma soma e' pior do que um zero. O campo ja' se chamou
      // `custosDoMes`, e um registo gravado com esse nome ainda conta.
      meses: Array.isArray(parsed?.meses)
        ? parsed.meses.map((m) => ({
            ...m,
            gastos: m.gastos ?? (m as { custosDoMes?: Money }).custosDoMes ?? 0,
          }))
        : [],
    }
  } catch {
    return historicoVazio()
  }
}

export function saveHistorico(h: Historico): void {
  try {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(h))
  } catch {
    // Private mode or a full quota: the app keeps working in memory.
  }
}

export function clearHistorico(): void {
  try {
    localStorage.removeItem(HISTORICO_KEY)
  } catch {
    // ignored
  }
}
