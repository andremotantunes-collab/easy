/**
 * Formatting is hand-rolled rather than delegated to Intl so the output is
 * byte-identical everywhere: pt-PT rules, EUR, "1 234,56 €" with a
 * non-breaking space as the group separator and before the symbol.
 */

const NBSP = '\u00A0'

function groupInteger(digits: string): string {
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += NBSP
    out += digits[i]
  }
  return out
}

/** 240000 -> "2 400,00 €" */
export function formatEUR(cents: number, opts: { cents?: boolean } = {}): string {
  const withCents = opts.cents !== false
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  const int = groupInteger(String(withCents ? whole : Math.round(abs / 100)))
  const body = withCents ? `${int},${String(frac).padStart(2, '0')}` : int
  return `${negative ? '-' : ''}${body}${NBSP}€`
}

/** Same, but without the symbol - for inputs. */
export function formatAmount(cents: number): string {
  const abs = Math.abs(Math.round(cents))
  return `${cents < 0 ? '-' : ''}${groupInteger(String(Math.floor(abs / 100)))},${String(abs % 100).padStart(2, '0')}`
}

/** Parses whatever the user types into cents. Accepts "2400", "2.400,50", "2400,5". */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '')
  if (!cleaned) return 0
  const negative = cleaned.trimStart().startsWith('-')
  // Last separator wins as the decimal mark; everything else is grouping.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const sep = Math.max(lastComma, lastDot)
  let intPart = cleaned
  let decPart = ''
  if (sep > -1 && cleaned.length - sep - 1 <= 2) {
    intPart = cleaned.slice(0, sep)
    decPart = cleaned.slice(sep + 1)
  }
  const digits = intPart.replace(/\D/g, '') || '0'
  const dec = (decPart.replace(/\D/g, '') + '00').slice(0, 2)
  const value = Number(digits) * 100 + Number(dec)
  return negative ? -value : value
}

/** 0.1234 -> "12 %" (pt-PT puts a space before the sign). */
export function formatPercent(ratio: number, digits = 0): string {
  const pct = ratio * 100
  const rounded = pct.toFixed(digits).replace('.', ',')
  return `${rounded}${NBSP}%`
}

/** dd/mm/aaaa */
export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

/** "dia 28" style short form used next to the per-day figure. */
export function formatDayOfMonth(d: Date): string {
  return `dia ${d.getDate()}`
}

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MESES_ACENTUADOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function monthName(d: Date): string {
  return MESES_ACENTUADOS[d.getMonth()]
}
export function monthSlug(d: Date): string {
  return MESES[d.getMonth()]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}${NBSP}B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)}${NBSP}KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')}${NBSP}MB`
}
