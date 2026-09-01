/**
 * Budget persistence. localStorage only — no account, no server, no network.
 * The key is a technical identifier, so the brand is lowercase and dotless here.
 */
import type { Budget } from './types'

export const BUDGET_KEY = 'easy.budget.v1'
export const THEME_KEY = 'easy.theme.v1'
export const ONBOARDING_KEY = 'easy.onboarded.v1'
export const SCHEMA_VERSION = 1

export const defaultBudget: Budget = {
  rendimentoMensal: 0,
  extras: 0,
  modoDespesas: 'percentagem',
  despesasPercentagem: 50,
  despesasFixas: [],
  alocacao: { investimentos: 10, poupanca: 10 },
  diaDeRecebimento: 28,
  poupancaAcumulada: 0,
  taxaAnualEsperada: 5,
}

type Stored = { version: number; budget: Budget }

/**
 * Schema migrations. Deliberately present and deliberately empty: v1 is the
 * first shipped schema. New versions add a step here and bump SCHEMA_VERSION.
 */
const migrations: Record<number, (b: Budget) => Budget> = {
  // 1: (b) => ({ ...b, novoCampo: 0 }),
}

function migrate(stored: Stored): Budget {
  let budget = stored.budget
  for (let v = stored.version; v < SCHEMA_VERSION; v++) {
    const step = migrations[v]
    if (step) budget = step(budget)
  }
  return budget
}

/** Fills in anything a hand-edited or older payload is missing. */
function coerce(input: unknown): Budget {
  const b = (input ?? {}) as Partial<Budget>
  return {
    ...defaultBudget,
    ...b,
    alocacao: { ...defaultBudget.alocacao, ...(b.alocacao ?? {}) },
    despesasFixas: Array.isArray(b.despesasFixas) ? b.despesasFixas : [],
  }
}

export function loadBudget(): Budget | null {
  try {
    const raw = localStorage.getItem(BUDGET_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    if (typeof parsed?.version !== 'number') return coerce(parsed)
    return coerce(migrate(parsed))
  } catch {
    return null
  }
}

export function saveBudget(budget: Budget): void {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify({ version: SCHEMA_VERSION, budget }))
  } catch {
    // Private mode or a full quota: the app keeps working in memory.
  }
}

export function exportBudget(budget: Budget): string {
  return JSON.stringify({ version: SCHEMA_VERSION, budget }, null, 2)
}

export function importBudget(json: string): Budget {
  const parsed = JSON.parse(json) as Stored
  return coerce(parsed?.budget ?? parsed)
}

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function setOnboarded(done: boolean): void {
  try {
    if (done) localStorage.setItem(ONBOARDING_KEY, '1')
    else localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    // ignored
  }
}

export function clearBudgetStorage(): void {
  try {
    localStorage.removeItem(BUDGET_KEY)
    localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    // ignored
  }
}
