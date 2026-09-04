import { Delete } from 'lucide-react'
import { copy } from '../lib/copy'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar']

export function PinDots({ length, filled, shake }: { length: number; filled: number; shake?: boolean }) {
  return (
    <div
      className="flex justify-center gap-4"
      style={shake ? { animation: 'abanar 400ms ease-out' } : undefined}
    >
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full"
          style={{
            background: i < filled ? 'var(--accent)' : 'var(--surface-2)',
            transition: 'background 120ms ease-out',
          }}
          aria-hidden
        />
      ))}
    </div>
  )
}

/**
 * Its own keypad rather than a text field: four digits, 68px targets, and no
 * operating-system keyboard sliding up over the screen.
 */
export function PinKeypad({
  value,
  onChange,
  max = 4,
}: {
  value: string
  onChange: (next: string) => void
  max?: number
}) {
  return (
    <div className="mx-auto grid w-full max-w-[264px] grid-cols-3 justify-items-center gap-4">
      {TECLAS.map((t, i) =>
        t === '' ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            onClick={() =>
              onChange(t === 'apagar' ? value.slice(0, -1) : value.length < max ? value + t : value)
            }
            aria-label={t === 'apagar' ? copy.comum.voltar : t}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--surface)] text-[26px] font-medium active:opacity-60"
          >
            {t === 'apagar' ? <Delete size={22} strokeWidth={1.8} aria-hidden /> : t}
          </button>
        ),
      )}
    </div>
  )
}
