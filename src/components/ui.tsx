import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function Card({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'li'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={clsx(
        'rounded-[var(--radius)] bg-[var(--surface)] p-4',
        'border border-[var(--card-border)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('t-label', className)}>{children}</div>
}

/** A thin 0–max bar. Used by the stat tiles; never the only carrier of meaning. */
export function Bar({
  ratio,
  color = 'var(--accent)',
  className,
}: {
  ratio: number
  color?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]', className)}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: 'width 180ms ease-out' }}
      />
    </div>
  )
}

export function StatTile({
  label,
  value,
  ratio,
  color,
  phrase,
  onClick,
}: {
  label: string
  value: string
  ratio: number
  color: string
  phrase: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={clsx(
        'flex min-h-[44px] flex-1 flex-col gap-2 rounded-[var(--radius)] bg-[var(--surface)] p-4 text-left',
        'border border-[var(--card-border)]',
      )}
    >
      <Label>{label}</Label>
      <div className="t-value tnum" style={{ color }}>
        {value}
      </div>
      <Bar ratio={ratio} color={color} />
      <div className="t-note text-[var(--text-muted)]">{phrase}</div>
    </Wrapper>
  )
}

/**
 * Counts from the previous value to the next one over ~220ms. The only
 * animation in the product besides the donut sweep and 150–200ms fades.
 */
export function useCountUp(value: number, duration = 220): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    const delta = value - origin
    if (delta === 0) return

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(origin + delta * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else from.current = value
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  useEffect(() => {
    from.current = shown
  }, [shown])

  return shown
}

/** Bottom sheet. Traps nothing fancy — Esc closes, backdrop closes. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'none' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[440px] rounded-t-[20px] bg-[var(--bg)] p-5"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--surface-2)]" />
        <h2 className="t-title mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** Single-slot undo toast. */
export function UndoToast({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  message: string
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 6000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      className="fixed left-1/2 z-40 w-[calc(100%-40px)] max-w-[400px] -translate-x-1/2"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--text)] px-4 py-3">
        <span className="t-note text-[var(--bg)]">{message}</span>
        <button
          onClick={onAction}
          className="min-h-[44px] px-2 text-sm font-semibold text-[var(--bg)] underline"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'min-h-[52px] w-full rounded-[var(--radius-sm)] bg-[var(--accent)] px-5',
        'text-base font-semibold text-[var(--accent-text)]',
        'transition-opacity duration-150 active:opacity-80 disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'min-h-[52px] w-full rounded-[var(--radius-sm)] border border-[var(--border)] px-5',
        'text-base font-medium text-[var(--text)]',
        'transition-opacity duration-150 active:opacity-70',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
