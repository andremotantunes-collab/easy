import { create } from 'zustand'
import type {
  Budget, Gasto, GastoCategoria, Goal, LimitesPorCategoria, FixedExpense, Money,
} from '../lib/types'
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
  addGasto: (gasto: Omit<Gasto, 'id'>) => void
  updateGasto: (id: string, patch: Partial<Gasto>) => void
  removeGasto: (id: string) => Gasto | undefined
  restoreGasto: (gasto: Gasto, index: number) => void
  setLimite: (categoria: GastoCategoria, valor: Money | null) => void
  setObjetivo: (objetivo: Goal | null) => void
  applyPreset: (preset: Preset) => void
  toggleDiscreto: () => void
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

  addGasto: (gasto) =>
    set({
      budget: persist({
        ...get().budget,
        gastos: [...get().budget.gastos, { ...gasto, id: newId() }],
      }),
    }),

  /** Um `fatura: undefined` no patch tem de APAGAR o campo e nao ser ignorado,
   *  senao tirar a fatura de um gasto nao tirava nada. O spread faz isso: a
   *  chave existe no patch, logo sobrepoe-se. */
  updateGasto: (id, patch) =>
    set({
      budget: persist({
        ...get().budget,
        gastos: get().budget.gastos.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }),
    }),

  removeGasto: (id) => {
    const atuais = get().budget.gastos
    const removido = atuais.find((g) => g.id === id)
    set({ budget: persist({ ...get().budget, gastos: atuais.filter((g) => g.id !== id) }) })
    return removido
  },

  restoreGasto: (gasto, index) => {
    const proximos = [...get().budget.gastos]
    proximos.splice(Math.min(index, proximos.length), 0, gasto)
    set({ budget: persist({ ...get().budget, gastos: proximos }) })
  },

  /** `null` tira o limite. Uma categoria sem limite mostra o que gastaste e
   *  mais nada — nao se inventa um tecto por omissao. */
  setLimite: (categoria, valor) => {
    const limites: LimitesPorCategoria = { ...get().budget.limites }
    if (valor === null || valor <= 0) delete limites[categoria]
    else limites[categoria] = valor
    set({ budget: persist({ ...get().budget, limites }) })
  },

  /** `null` remove a meta. NAO mexe na `poupancaAcumulada`: o dinheiro nao
   *  desaparece por se apagar um objetivo sobre ele. */
  setObjetivo: (objetivo) => set({ budget: persist({ ...get().budget, objetivo }) }),

  applyPreset: (preset) =>
    set({
      budget: persist({
        ...get().budget,
        despesasPercentagem: preset.fixas,
        alocacao: { investimentos: preset.investimentos, poupanca: preset.poupanca },
      }),
    }),

  toggleDiscreto: () =>
    set({ budget: persist({ ...get().budget, modoDiscreto: !get().budget.modoDiscreto }) }),

  replace: (budget) => set({ budget: persist(budget) }),

  reset: () => set({ budget: persist({ ...defaultBudget }) }),
}))
