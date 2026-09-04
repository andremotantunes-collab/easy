import clsx from 'clsx'
import type { ReactNode } from 'react'
import { ChevronLeft, FileText, Home, User, Wallet } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { copy } from '../lib/copy'

/**
 * Quatro separadores: o mes, o que se gastou nele, os papeis, e tudo o que e'
 * uma definicao. Os meses continuam a viver todos no primeiro ecra — um mes
 * anterior e' a mesma coisa vista mais tarde, e nao um destino diferente.
 *
 * Os Gastos ganharam separador proprio quando deixaram de ser uma lista e
 * passaram a ser um sitio onde se entra varias vezes por dia: um gasto
 * registado tres toques abaixo do Perfil nao se regista.
 */
const TABS = [
  { to: '/', label: copy.nav.inicio, Icon: Home },
  { to: '/gastos', label: copy.nav.gastos, Icon: Wallet },
  { to: '/documentos', label: copy.nav.documentos, Icon: FileText },
  { to: '/perfil', label: copy.nav.perfil, Icon: User },
]

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 select-none border-t border-[var(--border)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // A material rather than a colour: the content scrolls under it and
        // stays faintly visible, which is what tells you the page continues.
        background: 'var(--material)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
      aria-label={copy.nav.inicio}
    >
      <ul className="mx-auto flex max-w-[440px] items-stretch">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-2',
                  'transition-opacity duration-150 active:opacity-60',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* O indicador do item ativo, no acento, como manda o modelo. */}
                  <span
                    className="absolute top-0 h-[2.5px] w-8 rounded-b-full"
                    style={{ background: isActive ? 'var(--accent)' : 'transparent' }}
                    aria-hidden
                  />
                  <Icon size={23} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden />
                  <span
                    style={{
                      fontSize: 10.5,
                      lineHeight: '13px',
                      fontWeight: 500,
                      letterSpacing: '0.005em',
                    }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * One column, 20px side padding, capped at 440px so it stays a phone layout on
 * a desktop window. Bottom padding clears the fixed tab bar and the home
 * indicator; the header clears the notch.
 *
 * `back` turns the header into a sub-page header: it takes the path to return
 * to rather than history, so a deep link never walks out of the app.
 */
export function Screen({
  children,
  title,
  back,
  left,
  right,
}: {
  children: ReactNode
  title?: string
  back?: string
  /** Sits before the title: the avatar on the home screen. */
  left?: ReactNode
  right?: ReactNode
}) {
  const navigate = useNavigate()

  // A top-level screen with nothing else in its header gets the large title;
  // a sub-page or a screen that leads with an avatar keeps the compact one.
  const grande = !back && !left

  return (
    <div className="mx-auto w-full max-w-[440px] px-5">
      <header
        className={grande ? 'flex items-end gap-1 pb-3 pt-4' : 'flex items-center gap-1 py-3'}
        style={{ paddingTop: `calc(${grande ? 16 : 12}px + env(safe-area-inset-top))` }}
      >
        {back ? (
          <button
            onClick={() => navigate(back)}
            aria-label={copy.comum.voltar}
            className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text)] active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.9} aria-hidden />
          </button>
        ) : null}
        {left ? <div className="shrink-0 pr-1">{left}</div> : null}
        <h1
          className={
            grande
              ? 'truncate text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em]'
              : 'truncate text-[1.25rem] font-bold tracking-[-0.025em]'
          }
        >
          {title ?? copy.brand}
        </h1>
        {right ? <div className="ml-auto pl-3">{right}</div> : null}
      </header>
      <main className="pb-[calc(88px+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  )
}
