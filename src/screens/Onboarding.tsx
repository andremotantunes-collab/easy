import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { MoneyInput } from '../components/MoneyInput'
import { Card, PrimaryButton } from '../components/ui'
import { Logo } from '../components/Logo'
import { useBudget } from '../store/budget'
import { setOnboarded } from '../lib/storage'
import { PRESETS, copy } from '../lib/copy'
import type { Preset } from '../lib/copy'
import { formatEUR } from '../lib/format'

/**
 * Two steps, skippable, under twenty seconds from the first tap to the number.
 * Nothing is asked here that the app can work out on its own.
 */
export function Onboarding() {
  const { budget, set, applyPreset } = useBudget()
  const navigate = useNavigate()
  const [passo, setPasso] = useState<1 | 2>(1)
  const [escolhido, setEscolhido] = useState<Preset['id']>('equilibrado')

  const terminar = (preset: Preset) => {
    applyPreset(preset)
    setOnboarded(true)
    navigate('/', { replace: true })
  }

  const saltar = () => {
    setOnboarded(true)
    navigate('/', { replace: true })
  }

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5"
      style={{
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}
    >
      <header className="flex items-center justify-between py-2">
        <span className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[1.25rem] font-bold tracking-[-0.025em]">{copy.brand}</span>
        </span>
        <button onClick={saltar} className="min-h-[44px] px-2 text-sm text-[var(--text-muted)]">
          {copy.onboarding.saltar}
        </button>
      </header>

      <p className="t-note mb-6 text-[var(--text-muted)]">{copy.onboarding.passo(passo, 2)}</p>

      {passo === 1 ? (
        <div className="flex flex-1 flex-col">
          <h1 className="t-title mb-2">{copy.onboarding.p1Titulo}</h1>
          <p className="t-body mb-6 text-[var(--text-muted)]">{copy.onboarding.p1Ajuda}</p>
          <MoneyInput
            value={budget.rendimentoMensal}
            onChange={(cents) => set({ rendimentoMensal: cents })}
            size="hero"
            autoFocus
            ariaLabel={copy.onboarding.p1Titulo}
          />
          <div className="flex-1" />
          <PrimaryButton
            onClick={() => setPasso(2)}
            disabled={budget.rendimentoMensal <= 0}
          >
            {copy.onboarding.p1Continuar}
          </PrimaryButton>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <h1 className="t-title mb-2">{copy.onboarding.p2Titulo}</h1>
          <p className="t-body mb-5 text-[var(--text-muted)]">{copy.onboarding.p2Ajuda}</p>

          <ul className="space-y-3">
            {PRESETS.map((p) => {
              const ativo = escolhido === p.id
              const sobras = Math.round((budget.rendimentoMensal * p.sobras) / 100)
              return (
                <Card
                  as="li"
                  key={p.id}
                  className={ativo ? '!border-[var(--accent)]' : ''}
                >
                  <button
                    onClick={() => setEscolhido(p.id)}
                    aria-pressed={ativo}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-value">{p.nome}</span>
                      {ativo ? (
                        <Check size={18} strokeWidth={2.4} className="text-[var(--accent)]" aria-hidden />
                      ) : null}
                    </div>
                    <p className="t-note mt-1 text-[var(--text-muted)]">{p.frase}</p>
                    <p className="t-note tnum mt-2 text-[var(--text-muted)]">
                      {copy.presets.fixas} {p.fixas} % · {copy.presets.investir} {p.investimentos} %
                      {' · '}
                      {copy.presets.poupar} {p.poupanca} % · {copy.presets.sobras} {p.sobras} %
                    </p>
                    <p className="t-value tnum mt-2 text-[var(--accent)]">
                      {formatEUR(sobras)}
                    </p>
                  </button>
                </Card>
              )
            })}
          </ul>

          <div className="flex-1" />
          <div className="mt-6 space-y-2">
            <PrimaryButton
              onClick={() => terminar(PRESETS.find((p) => p.id === escolhido)!)}
            >
              {copy.onboarding.ver}
            </PrimaryButton>
            <button
              onClick={() => setPasso(1)}
              className="min-h-[44px] w-full text-sm text-[var(--text-muted)]"
            >
              {copy.onboarding.voltar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
