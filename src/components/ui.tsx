import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

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
        'entra rounded-[var(--radius)] bg-[var(--surface)] p-4',
        'border border-[var(--card-border)] shadow-[var(--shadow-card)]',
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

/** A thin 0–max bar. Never the only carrier of meaning. */
export function Bar({
  ratio,
  color = 'var(--accent)',
  color2,
  className,
}: {
  ratio: number
  color?: string
  /** Second stop: the bar blends along its length, like a slice of the ring. */
  color2?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]', className)}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: color2 ? `linear-gradient(90deg, ${color}, ${color2})` : color,
          transition: 'width 300ms ease-out',
        }}
      />
    </div>
  )
}

/**
 * Uma metrica: rotulo, numero na cor dela, barra, e o veredicto numa pastilha.
 *
 * O veredicto era uma frase de duas linhas em cinzento — a coisa mais alta do
 * cartao a dizer o que o numero ja' tinha dito. Passou a ser uma pastilha de
 * uma palavra, na cor da metrica: quem quer o numero le' o numero, quem quer
 * saber se e' bom ou mau ve' a cor antes de ler.
 */
export function StatTile({
  label,
  value,
  ratio,
  color,
  color2,
  phrase,
  onClick,
}: {
  label: string
  value: string
  ratio: number
  color: string
  color2?: string
  phrase: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={clsx(
        'entra flex w-full flex-col items-start gap-2.5 rounded-[var(--radius)] p-4 text-left',
        'bg-[var(--surface)] border border-[var(--card-border)] shadow-[var(--shadow-card)]',
        onClick ? 'transition-opacity duration-150 active:opacity-60' : '',
      )}
      style={{
        // A lavagem da cor da propria metrica, a entrar pelo canto de cima e
        // gasta a quatro quintos. Onde `color-mix` nao e' entendido a
        // declaracao inteira cai e fica a superficie limpa — e' por isso que a
        // superficie continua a ser uma classe e nao faz parte deste gradiente.
        backgroundImage: `linear-gradient(152deg, color-mix(in srgb, ${color} 22%, transparent) 0%, transparent 80%)`,
      }}
    >
      <Label>{label}</Label>
      <div
        className="tnum leading-none"
        style={{ color, fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}
      >
        {value}
      </div>
      <Bar ratio={ratio} color={color} color2={color2} />
      <span
        className="t-note self-start rounded-full px-2 py-0.5 font-semibold"
        style={{
          color,
          // Sem `color-mix` fica so' a palavra na cor da metrica, que continua
          // a ler-se: a pastilha e' um reforco, nao o portador da informacao.
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        }}
      >
        {phrase}
      </span>
    </Wrapper>
  )
}

/**
 * Counts from the previous value to the next one over ~450ms. The hero is the
 * one number that earns an animation: it is what you came to see.
 */
export function useCountUp(value: number, duration = 450): number {
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

/**
 * A grouped list, iOS-style: one rounded surface, hairlines between rows.
 * The rows carry the whole of Perfil, so they are 56px tall and the entire
 * row is the target.
 */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'entra overflow-hidden rounded-[var(--radius)] bg-[var(--surface)]',
        'border border-[var(--card-border)] shadow-[var(--shadow-card)]',
        // The separator starts where the text starts, and the last row has
        // none: the card edge already ends the list.
        '[&>*:last-child_.sep]:border-b-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function NavRow({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center pl-4 text-left transition-opacity duration-150 active:opacity-60"
    >
      <span className="sep flex min-h-[56px] flex-1 items-center gap-3 border-b border-[var(--border)] pr-4">
        <span className="t-body flex-1 truncate">{label}</span>
        {value ? (
          <span className="t-body tnum shrink-0 text-[var(--text-muted)]">{value}</span>
        ) : null}
        <ChevronRight
          size={19}
          strokeWidth={2}
          className="-mr-1 shrink-0 text-[var(--text-muted)] opacity-60"
          aria-hidden
        />
      </span>
    </button>
  )
}

/** The same 36×20 switch the expense rows use, as a list row. */
export function SwitchRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string
  help?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center pl-4 text-left transition-opacity duration-150 active:opacity-60"
    >
      <span className="sep flex min-h-[64px] flex-1 items-center gap-3 border-b border-[var(--border)] py-2 pr-4">
      <span className="min-w-0 flex-1">
        <span className="t-body block">{label}</span>
        {help ? <span className="t-note block text-[var(--text-muted)]">{help}</span> : null}
      </span>
      <span
        className="h-5 w-9 shrink-0 rounded-full p-[2px]"
        style={{ background: checked ? 'var(--accent)' : 'var(--surface-2)' }}
        aria-hidden
      >
        <span
          className="block h-4 w-4 rounded-full bg-white shadow-[var(--shadow-pill)]"
          style={{
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        />
      </span>
      </span>
    </button>
  )
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
        style={{ animation: 'aparecer 200ms ease-out' }}
        onClick={onClose}
        aria-hidden
      />
      {/* Uma folha com uma fatura lá dentro pode passar a altura do ecrã. Sem
          o `max-h` e o scroll, o topo saía por cima e não havia como lá chegar. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[28px] bg-[var(--bg)] p-5"
        style={{
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          animation: 'subir 260ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--border)]" />
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
        'min-h-[52px] w-full rounded-[var(--radius)] bg-[var(--accent)] px-5',
        'text-base font-semibold text-[var(--accent-text)]',
        'transition-[transform,opacity] duration-200 active:translate-y-px disabled:opacity-40',
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
        'min-h-[52px] w-full rounded-[var(--radius)] px-5',
        'border-[1.5px] border-[var(--border)] bg-transparent',
        'text-base font-semibold text-[var(--accent)]',
        'transition-[transform,background-color] duration-200 active:translate-y-px active:bg-[var(--surface-2)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
