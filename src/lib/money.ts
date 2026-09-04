/**
 * Discreet mode (Extra 2 of the brief): one tap replaces every euro amount on
 * screen with dots, and nothing else. Structure stays — the donut, the bars,
 * the labels and the percentages are all still there, so the shape of the
 * month is readable over your shoulder while the amounts are not.
 *
 * Editable fields are the deliberate exception: masking a number you are in
 * the middle of typing makes the field unusable. See DECISIONS.md.
 */
import { useBudget } from '../store/budget'
import { formatEUR } from './format'

/** Same character count as a four-digit amount, and it never reflows. */
export const MASCARA = '••••'

/** `formatEUR`, but it hides the amount when discreet mode is on. */
export function useEUR(): (cents: number, opts?: { cents?: boolean }) => string {
  const discreto = useBudget((s) => s.budget.modoDiscreto)
  return (cents, opts) => (discreto ? MASCARA : formatEUR(cents, opts))
}
