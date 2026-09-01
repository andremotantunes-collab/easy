import { create } from 'zustand'
import type { Budget, FixedExpense } from '../lib/types'
import { defaultBudget, loadBudget, saveBudget } from '../lib/storage'
import type { Preset } from '../lib/copy'

type BudgetStore = {
  budget: Budget
  set: (patch: Partial<Budget>) => void
  setAlocacao: (patch: Partial<Budget['alocacao']>) => void
  addFixa: (expense: Omit<FixedExpense, 'id'>) => void
  updateFixa: (id: string, patch: Partial<FixedExpense>) => void
  removeFixa: (id: string) => FixedExpense | undefined
  restoreFixa: (expense: FixedExpense, index: number) => void
  applyPreset: (preset: Preset) => void
  replace: (budget: Budget) => void
  reset: () => void
}

/** Every mutation writes through to localStorage; a reload loses nothing. */
function persist(budget: Budget): Budget {
  saveBudget(budget)
  return budget
}

export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useBudget = create<BudgetStore>((set, get) => ({
  budget: loadBudget() ?? defaultBudget,

  set: (patch) => set({ budget: persist({ ...get().budget, ...patch }) }),

  setAlocacao: (patch) =>
    set({
      budget: persist({
        ...get().budget,
        alocacao: { ...get().budget.alocacao, ...patch },
      }),
    }),

  addFixa: (expense) =>
    set({
      budget: persist({
        ...get().budget,
        despesasFixas: [...get().budget.despesasFixas, { ...expense, id: newId() }],
      }),
    }),

  updateFixa: (id, patch) =>
    set({
      budget: persist({
        ...get().budget,
        despesasFixas: get().budget.despesasFixas.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      }),
    }),

  removeFixa: (id) => {
    const current = get().budget.despesasFixas
    const removed = current.find((e) => e.id === id)
    set({
      budget: persist({ ...get().budget, despesasFixas: current.filter((e) => e.id !== id) }),
    })
    return removed
  },

  restoreFixa: (expense, index) => {
    const next = [...get().budget.despesasFixas]
    next.splice(Math.min(index, next.length), 0, expense)
    set({ budget: persist({ ...get().budget, despesasFixas: next }) })
  },

  applyPreset: (preset) =>
    set({
      budget: persist({
        ...get().budget,
        despesasPercentagem: preset.fixas,
        alocacao: { investimentos: preset.investimentos, poupanca: preset.poupanca },
      }),
    }),

  replace: (budget) => set({ budget: persist(budget) }),

  reset: () => set({ budget: persist({ ...defaultBudget }) }),
}))
