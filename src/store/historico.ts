import { create } from 'zustand'
import type { Breakdown } from '../lib/finance'
import type { Historico, MesFechado } from '../lib/historico'
import { clearHistorico, loadHistorico, mesDe, saveHistorico, virarMes } from '../lib/historico'

type HistoricoStore = {
  historico: Historico
  /** O mes que acabou de fechar nesta abertura, para a app poder avisar. */
  fechadoAgora: MesFechado | null
  /**
   * Corre uma vez por arranque. Recebe uma funcao e nao um numero porque o mes
   * que fecha e' o que estava aberto, e nao o de hoje: com custos proprios de
   * cada mes, arquivar a conta de hoje poria no registo de setembro o dentista
   * que se pagou em outubro.
   */
  abrir: (paraMes: (mes: string) => Breakdown, agora?: Date) => void
  dispensarAviso: () => void
  apagar: () => void
}

export const useHistorico = create<HistoricoStore>((set, get) => ({
  historico: loadHistorico(),
  fechadoAgora: null,

  abrir: (paraMes, agora = new Date()) => {
    const anterior = get().historico
    const b = paraMes(anterior.mesAberto ?? mesDe(agora))
    const { historico, fechado } = virarMes(anterior, agora, b)
    if (historico === get().historico && !fechado) return
    saveHistorico(historico)
    set({ historico, fechadoAgora: fechado ?? get().fechadoAgora })
  },

  dispensarAviso: () => set({ fechadoAgora: null }),

  apagar: () => {
    clearHistorico()
    set({ historico: loadHistorico(), fechadoAgora: null })
  },
}))
