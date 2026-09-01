import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { formatAmount, parseAmount } from '../lib/format'

type Props = {
  value: number // cents
  onChange: (cents: number) => void
  label?: string
  placeholder?: string
  autoFocus?: boolean
  size?: 'normal' | 'hero'
  id?: string
  /** Used when the field has a visible heading instead of its own label. */
  ariaLabel?: string
}

/**
 * Currency field with a live mask. `inputMode="decimal"` gets the numeric
 * keypad on iOS while still allowing the comma, and the value is kept in cents
 * so nothing ever round-trips through a float.
 */
export function MoneyInput({
  value,
  onChange,
  label,
  placeholder = '0,00',
  autoFocus,
  size = 'normal',
  id,
  ariaLabel,
}: Props) {
  const [text, setText] = useState(() => (value ? formatAmount(value) : ''))
  const focused = useRef(false)
  const ref = useRef<HTMLInputElement>(null)

  // Re-sync when the value changes from elsewhere (a preset, an import),
  // but never while the user is mid-keystroke.
  useEffect(() => {
    if (!focused.current) setText(value ? formatAmount(value) : '')
  }, [value])

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <label className="block">
      {label ? <span className="t-label mb-2 block">{label}</span> : null}
      <div
        className={clsx(
          'flex items-baseline gap-2 rounded-[var(--radius-sm)] bg-[var(--surface)] px-4',
          'border border-[var(--card-border)]',
          size === 'hero' ? 'py-3' : 'py-3',
        )}
      >
        <input
          id={id}
          ref={ref}
          value={text}
          inputMode="decimal"
          enterKeyHint="done"
          placeholder={placeholder}
          aria-label={label ?? ariaLabel}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
            setText(value ? formatAmount(value) : '')
          }}
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            onChange(parseAmount(raw))
          }}
          className={clsx(
            'tnum w-full min-w-0 bg-transparent outline-none',
            size === 'hero' ? 't-hero' : 't-value',
          )}
        />
        <span
          className={clsx(
            'shrink-0 text-[var(--text-muted)]',
            size === 'hero' ? 't-title' : 't-value',
          )}
        >
          €
        </span>
      </div>
    </label>
  )
}
