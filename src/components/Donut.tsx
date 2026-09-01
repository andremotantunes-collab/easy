import { useEffect, useState } from 'react'

export type Slice = {
  key: string
  label: string
  value: number
  color: string
}

type Props = {
  slices: Slice[]
  size?: number
  stroke?: number
  /** Rendered in the hole. */
  centerLabel?: string
  centerValue: string
  centerTone?: 'normal' | 'negative'
  /** Optional coverage ring, used to show a deficit without hiding any slice. */
  coverage?: { covered: number; total: number }
}

const GAP_PX = 2

/**
 * Hand-written SVG donut: one <circle> per slice, positioned with
 * stroke-dasharray/offset. Separation between slices is structural — a 2px
 * gap in the surface colour — because the palette is deliberately near
 * monochrome and colour alone never carries the meaning.
 */
export function Donut({
  slices,
  size = 200,
  stroke = 22,
  centerLabel,
  centerValue,
  centerTone = 'normal',
  coverage,
}: Props) {
  const [progress, setProgress] = useState(0)
  const [sweeping, setSweeping] = useState(true)

  // One 400ms sweep on mount, and nothing else. The transition is then removed
  // so that dragging a slider redraws the ring on the same frame instead of
  // easing towards the new value 400ms late.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setProgress(1))
    const done = setTimeout(() => setSweeping(false), 450)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [])

  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0)

  let cursor = 0
  const drawn = slices.map((s) => {
    const value = Math.max(0, s.value)
    const arc = total > 0 ? (value / total) * c : 0
    const start = cursor
    cursor += arc

    // With round caps the stroke overshoots by stroke/2 at each end, so the
    // drawn length is shortened to compensate. Slivers too short for that fall
    // back to butt caps rather than inverting.
    const rounded = arc > stroke + GAP_PX + 1
    const len = rounded ? arc - stroke - GAP_PX : Math.max(0, arc - GAP_PX)
    const offset = rounded ? start + stroke / 2 + GAP_PX / 2 : start + GAP_PX / 2

    return { ...s, len, offset, rounded, visible: arc > 0.5 }
  })

  const coverRatio =
    coverage && coverage.total > 0 ? Math.min(1, Math.max(0, coverage.covered / coverage.total)) : 0

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Repartição do rendimento: ${slices.map((s) => s.label).join(', ')}`}
      style={{ display: 'block' }}
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* Track, so an empty budget still reads as a ring. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        {drawn.map((s) =>
          s.visible ? (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap={s.rounded ? 'round' : 'butt'}
              strokeDasharray={`${s.len * progress} ${c}`}
              strokeDashoffset={-s.offset}
              style={sweeping ? { transition: 'stroke-dasharray 400ms ease-out' } : undefined}
            />
          ) : null,
        )}

        {coverage ? (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r - stroke / 2 - 7}
              fill="none"
              stroke="var(--negative)"
              strokeWidth={4}
              strokeDasharray={`${c * ((r - stroke / 2 - 7) / r)} ${c}`}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r - stroke / 2 - 7}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={4}
              strokeDasharray={`${c * ((r - stroke / 2 - 7) / r) * coverRatio} ${c}`}
            />
          </>
        ) : null}
      </g>

      {centerLabel ? (
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          letterSpacing="0.06em"
          fill="var(--text-muted)"
        >
          {centerLabel.toUpperCase()}
        </text>
      ) : null}
      <text
        x="50%"
        y={centerLabel ? '62%' : '54%'}
        textAnchor="middle"
        fontSize="18"
        fontWeight="600"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        fill={centerTone === 'negative' ? 'var(--negative)' : 'var(--text)'}
      >
        {centerValue}
      </text>
    </svg>
  )
}
