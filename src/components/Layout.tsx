import clsx from 'clsx'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Home, PiggyBank, Settings, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { copy } from '../lib/copy'
import { monthName } from '../lib/format'

const TABS = [
  { to: '/', label: copy.nav.inicio, Icon: Home },
  { to: '/plano', label: copy.nav.plano, Icon: SlidersHorizontal },
  { to: '/fixas', label: copy.nav.fixas, Icon: PiggyBank },
  { to: '/investir', label: copy.nav.investir, Icon: TrendingUp },
  { to: '/documentos', label: copy.nav.documentos, Icon: FileText },
]

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 py-2',
                  'transition-opacity duration-150',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} aria-hidden />
                  <span style={{ fontSize: 11, lineHeight: '13px' }}>{label}</span>
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
 * indicator.
 */
export function Screen({
  children,
  title,
  showHeader = true,
}: {
  children: ReactNode
  title?: string
  showHeader?: boolean
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="mx-auto w-full max-w-[440px] px-5">
      {showHeader ? (
        <header
          className="flex items-center justify-between py-4"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}
        >
          <span className="text-[17px] font-semibold tracking-tight">
            {title ?? copy.brand}
          </span>
          <div className="flex items-center gap-3">
            {pathname === '/' ? (
              <span className="t-note text-[var(--text-muted)]">{monthName(new Date())}</span>
            ) : null}
            <button
              onClick={() => navigate('/definicoes')}
              aria-label={copy.comum.definicoes}
              className="flex h-11 w-11 items-center justify-center -mr-3 text-[var(--text-muted)]"
            >
              <Settings size={20} strokeWidth={1.7} aria-hidden />
            </button>
          </div>
        </header>
      ) : null}
      <main className="pb-[calc(84px+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  )
}
