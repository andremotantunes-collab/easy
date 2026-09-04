import { useEffect, useId, useState } from 'react'

export type Slice = {
  key: string
  label: string
  value: number
  color: string
  /** Second stop. Given both, the slice is drawn as a gradient. */
  color2?: string
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

/**
 * Hand-written SVG donut: one <circle> per slice, positioned with
 * stroke-dasharray/offset.
 *
 * The ring is continuous — butt caps, no gap between slices — so it reads as
 * one closed circle instead of four arcs that stop short of each other. The
 * job colour alone is not asked to do is done by the legend beside it, where
 * every slice carries name, value and share. See DECISIONS.md.
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
  // Gradient ids have to be unique per instance: two donuts on one page would
  // otherwise both resolve to whichever set of defs rendered last.
  const uid = useId().replace(/[:]/g, '')

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

    // A hair of overdraw past the end of each arc: without it, antialiasing
    // leaves a pale seam between two neighbours at some sizes.
    const last = start + arc >= c - 0.01

    // The gradient axis is the chord of THIS arc, not a fixed diagonal of the
    // square: from where the slice starts on the ring to where it ends. Drawn
    // any other way, a slice lying across the axis shows almost no blend and
    // two neighbours meet at mismatched colours.
    const mid = size / 2
    const a0 = (start / c) * 2 * Math.PI
    const a1 = ((start + arc) / c) * 2 * Math.PI
    const eixo = {
      x1: mid + r * Math.cos(a0),
      y1: mid + r * Math.sin(a0),
      x2: mid + r * Math.cos(a1),
      y2: mid + r * Math.sin(a1),
    }

    return { ...s, len: last ? arc : arc + 0.75, offset: start, eixo, visible: arc > 0.5 }
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
      <defs>
        {/* One gradient per slice, its axis the chord of that slice's arc, so
            the blend runs along the ring instead of across the square. */}
        {drawn.map((s) =>
          s.color2 ? (
            <linearGradient
              key={s.key}
              id={`${uid}-${s.key}`}
              gradientUnits="userSpaceOnUse"
              x1={s.eixo.x1}
              y1={s.eixo.y1}
              x2={s.eixo.x2}
              y2={s.eixo.y2}
            >
              <stop offset="0%" stopColor={s.color} />
              <stop offset="100%" stopColor={s.color2} />
            </linearGradient>
          ) : null,
        )}
      </defs>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* The track sits under every slice now that the ring is continuous:
            it closes the circle while the sweep is still drawing, and no
            antialiasing seam shows the card through.

            A sombra vive aqui e nao no grupo inteiro: o grupo muda de
            geometria a cada frame enquanto se arrasta um slider, e um filtro
            sobre ele era refeito outras tantas vezes. A pista nunca muda, e
            como as fatias juntas formam exatamente este anel, a sombra
            desenhada e' a mesma. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
          style={{ filter: 'drop-shadow(var(--donut-sombra))' }}
        />
        {drawn.map((s) =>
          s.visible ? (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color2 ? `url(#${uid}-${s.key})` : s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
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

      {/* The hole carries the total. Both sizes scale with the ring, so the
          same component reads right at 188 on the home screen and at 132
          beside the sliders. */}
      {centerLabel ? (
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          fontSize={Math.max(9, Math.round(size * 0.052))}
          fontWeight="500"
          letterSpacing="0.09em"
          fill="var(--text-muted)"
        >
          {centerLabel.toUpperCase()}
        </text>
      ) : null}
      <text
        x="50%"
        y={centerLabel ? '63%' : '55%'}
        textAnchor="middle"
        fontSize={Math.round(size * (centerLabel ? 0.132 : 0.15))}
        fontWeight="650"
        letterSpacing="-0.02em"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        fill={centerTone === 'negative' ? 'var(--negative)' : 'var(--text)'}
      >
        {centerValue}
      </text>
    </svg>
  )
}
