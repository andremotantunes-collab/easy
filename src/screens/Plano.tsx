import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Donut } from '../components/Donut'
import { Card, Label } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../store/budget'
import { compute } from '../lib/finance'
import { formatEUR, formatPercent } from '../lib/format'
import { PRESETS, copy } from '../lib/copy'
import { slicesFrom } from '../lib/slices'

function Slider({
  label,
  value,
  max,
  color,
  amount,
  onChange,
}: {
  label: string
  value: number
  max: number
  color: string
  amount: string
  onChange: (v: number) => void
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <div className="flex items-baseline gap-2">
          <span className="t-value tnum">{formatPercent(value / 100)}</span>
          <span className="t-note tnum w-[86px] text-right text-[var(--text-muted)]">{amount}</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={`${value} por cento`}
        style={{ accentColor: color }}
        onChange={(e) => onChange(Math.min(Number(e.target.value), max))}
      />
    </div>
  )
}

export function Plano() {
  const { budget, set, setAlocacao, applyPreset } = useBudget()
  const navigate = useNavigate()
  const [aviso, setAviso] = useState(false)

  const b = useMemo(() => compute(budget), [budget])
  const slices = useMemo(() => slicesFrom(b), [b])

  // In list mode the fixed costs are an absolute figure, so their share of the
  // income is what the sliders have to fit around.
  const fixasPct =
    budget.modoDespesas === 'lista'
      ? b.rendimentoTotal > 0
        ? (b.despesasFixas / b.rendimentoTotal) * 100
        : 0
      : budget.despesasPercentagem

  const livre = Math.max(0, 100 - fixasPct)
  const maxInvest = Math.max(0, livre - budget.alocacao.poupanca)
  const maxPoupanca = Math.max(0, livre - budget.alocacao.investimentos)
  const maxFixas = Math.max(0, 100 - budget.alocacao.investimentos - budget.alocacao.poupanca)

  const clamp = (requested: number, max: number, apply: (v: number) => void) => {
    const next = Math.min(requested, max)
    setAviso(requested > max)
    apply(next)
  }

  return (
    <Screen title={copy.plano.titulo}>
      {/* The live pair: drag a slider, these two move with it. */}
      <div className="mb-4 flex items-center gap-4">
        <Donut
          slices={slices}
          size={132}
          stroke={16}
          centerValue={formatEUR(b.sobras, { cents: false })}
          centerTone={b.emDefice ? 'negative' : 'normal'}
        />
        <div className="min-w-0 flex-1">
          <Label>{copy.plano.sobrasAgora}</Label>
          <div
            className="t-title tnum mt-1 truncate"
            style={{ color: b.emDefice ? 'var(--negative)' : 'var(--text)' }}
          >
            {formatEUR(b.sobras)}
          </div>
          <p className="t-note mt-1 text-[var(--text-muted)]">
            {copy.home.de(formatEUR(b.rendimentoTotal))}
          </p>
        </div>
      </div>

      <div className="mb-3 space-y-3">
        <MoneyInput
          label={copy.plano.rendimento}
          value={budget.rendimentoMensal}
          onChange={(cents) => set({ rendimentoMensal: cents })}
        />
        <div>
          <MoneyInput
            label={copy.plano.extras}
            value={budget.extras}
            onChange={(cents) => set({ extras: cents })}
          />
          <p className="t-note mt-1 text-[var(--text-muted)]">{copy.plano.extrasAjuda}</p>
        </div>
      </div>

      <Card className="mb-3">
        <Slider
          label={copy.plano.investimentos}
          value={budget.alocacao.investimentos}
          max={maxInvest}
          color="var(--cat-invest)"
          amount={formatEUR(b.investimentos)}
          onChange={(v) => clamp(v, maxInvest, (n) => setAlocacao({ investimentos: n }))}
        />
        <Slider
          label={copy.plano.poupanca}
          value={budget.alocacao.poupanca}
          max={maxPoupanca}
          color="var(--cat-poupanca)"
          amount={formatEUR(b.poupanca)}
          onChange={(v) => clamp(v, maxPoupanca, (n) => setAlocacao({ poupanca: n }))}
        />
        {aviso ? <p className="t-note mt-1 text-[var(--warning)]">{copy.plano.limite}</p> : null}
      </Card>

      <Card className="mb-3">
        <Label className="mb-2">{copy.plano.despesas}</Label>
        <div
          role="tablist"
          aria-label={copy.plano.despesas}
          className="mb-3 flex rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-1"
        >
          {(['percentagem', 'lista'] as const).map((modo) => (
            <button
              key={modo}
              role="tab"
              aria-selected={budget.modoDespesas === modo}
              onClick={() => set({ modoDespesas: modo })}
              className={
                'min-h-[44px] flex-1 rounded-[8px] text-sm font-medium transition-opacity duration-150 ' +
                (budget.modoDespesas === modo
                  ? 'bg-[var(--bg)] text-[var(--text)]'
                  : 'text-[var(--text-muted)]')
              }
            >
              {modo === 'percentagem' ? copy.plano.modoPercentagem : copy.plano.modoLista}
            </button>
          ))}
        </div>

        {budget.modoDespesas === 'percentagem' ? (
          <Slider
            label={copy.plano.despesas}
            value={budget.despesasPercentagem}
            max={maxFixas}
            color="var(--cat-fixas)"
            amount={formatEUR(b.despesasFixas)}
            onChange={(v) => clamp(v, maxFixas, (n) => set({ despesasPercentagem: n }))}
          />
        ) : (
          <button
            onClick={() => navigate('/fixas')}
            className="flex min-h-[44px] w-full items-center justify-between"
          >
            <span className="t-body">{copy.plano.verFixas}</span>
            <span className="flex items-center gap-1">
              <span className="t-value tnum">{formatEUR(b.despesasFixas)}</span>
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
            </span>
          </button>
        )}
        <p className="t-note mt-2 text-[var(--text-muted)]">{copy.plano.modoAjuda}</p>
      </Card>

      <Label className="mb-2">{copy.plano.presetsTitulo}</Label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              applyPreset(p)
              setAviso(false)
            }}
            className="min-h-[44px] rounded-full border border-[var(--border)] px-4 text-sm font-medium transition-opacity duration-150 active:opacity-70"
          >
            {p.nome}
          </button>
        ))}
      </div>
    </Screen>
  )
}
