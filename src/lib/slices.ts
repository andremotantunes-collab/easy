import type { Breakdown } from './finance'
import { copy } from './copy'

/**
 * The categorical order is fixed and never cycled: the commitments in the
 * order the engine subtracts them — as fixas, o que este mes teve de
 * extraordinario, o que se investe e o que se poupa — then Sobras, which is
 * the remainder.
 * Colours are re-stepped greys validated for adjacent separation —
 * see DECISIONS.md.
 */
export const SLICE_ORDER = ['fixas', 'gastos', 'investimentos', 'poupanca', 'sobras'] as const
export type SliceKey = (typeof SLICE_ORDER)[number]

export const SLICE_COLOR: Record<SliceKey, string> = {
  sobras: 'var(--cat-sobras)',
  fixas: 'var(--cat-fixas)',
  gastos: 'var(--cat-custos)',
  investimentos: 'var(--cat-invest)',
  poupanca: 'var(--cat-poupanca)',
}

/** Second stop of each slice: the neighbour on the aurora wheel. */
export const SLICE_COLOR_2: Record<SliceKey, string> = {
  sobras: 'var(--cat-sobras-2)',
  fixas: 'var(--cat-fixas-2)',
  gastos: 'var(--cat-custos-2)',
  investimentos: 'var(--cat-invest-2)',
  poupanca: 'var(--cat-poupanca-2)',
}

export const SLICE_ROUTE: Record<SliceKey, string> = {
  sobras: '/plano',
  fixas: '/fixas',
  gastos: '/gastos',
  investimentos: '/investir',
  poupanca: '/plano',
}

/**
 * A fatia dos gastos so' aparece quando ha' gastos. Um mes ainda sem nada
 * registado nao mostra uma linha a dizer "0,00 €", que seria ruido a fingir
 * de informacao.
 */
export function slicesFrom(b: Breakdown) {
  return [
    {
      key: 'fixas' as const,
      label: copy.legenda.fixas,
      value: b.despesasFixas,
      color: SLICE_COLOR.fixas,
      color2: SLICE_COLOR_2.fixas,
    },
    ...(b.gastos > 0
      ? [
          {
            key: 'gastos' as const,
            label: copy.legenda.gastos,
            value: b.gastos,
            color: SLICE_COLOR.gastos,
            color2: SLICE_COLOR_2.gastos,
          },
        ]
      : []),
    {
      key: 'investimentos' as const,
      label: copy.legenda.investimentos,
      value: b.investimentos,
      color: SLICE_COLOR.investimentos,
      color2: SLICE_COLOR_2.investimentos,
    },
    {
      key: 'poupanca' as const,
      label: copy.legenda.poupanca,
      value: b.poupanca,
      color: SLICE_COLOR.poupanca,
      color2: SLICE_COLOR_2.poupanca,
    },
    {
      key: 'sobras' as const,
      label: copy.legenda.sobras,
      value: b.sobras,
      color: SLICE_COLOR.sobras,
      color2: SLICE_COLOR_2.sobras,
    },
  ]
}
