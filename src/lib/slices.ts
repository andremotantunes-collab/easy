import type { Breakdown } from './finance'
import { copy } from './copy'

/**
 * The categorical order is fixed and never cycled: Sobras first (it is the
 * point of the product), then the three commitments from largest concern to
 * smallest. Colours are re-stepped greys validated for adjacent separation —
 * see DECISIONS.md.
 */
export const SLICE_ORDER = ['sobras', 'fixas', 'investimentos', 'poupanca'] as const
export type SliceKey = (typeof SLICE_ORDER)[number]

export const SLICE_COLOR: Record<SliceKey, string> = {
  sobras: 'var(--cat-sobras)',
  fixas: 'var(--cat-fixas)',
  investimentos: 'var(--cat-invest)',
  poupanca: 'var(--cat-poupanca)',
}

export const SLICE_ROUTE: Record<SliceKey, string> = {
  sobras: '/plano',
  fixas: '/fixas',
  investimentos: '/investir',
  poupanca: '/plano',
}

export function slicesFrom(b: Breakdown) {
  return [
    { key: 'sobras' as const, label: copy.legenda.sobras, value: b.sobras, color: SLICE_COLOR.sobras },
    { key: 'fixas' as const, label: copy.legenda.fixas, value: b.despesasFixas, color: SLICE_COLOR.fixas },
    {
      key: 'investimentos' as const,
      label: copy.legenda.investimentos,
      value: b.investimentos,
      color: SLICE_COLOR.investimentos,
    },
    {
      key: 'poupanca' as const,
      label: copy.legenda.poupanca,
      value: b.poupanca,
      color: SLICE_COLOR.poupanca,
    },
  ]
}
