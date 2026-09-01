import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Donut } from '../components/Donut'
import { Card, GhostButton, Label, StatTile, useCountUp } from '../components/ui'
import { useBudget } from '../store/budget'
import {
  compute, diasAteProximoRecebimento, nivelTaxaPoupanca, pesoDespesasFixas,
  porDia, proximoRecebimento, sugestoesDefice, taxaPoupanca,
} from '../lib/finance'
import { formatDayOfMonth, formatEUR, formatPercent } from '../lib/format'
import { copy } from '../lib/copy'
import { SLICE_ROUTE, slicesFrom } from '../lib/slices'

export function Inicio() {
  const budget = useBudget((s) => s.budget)
  const navigate = useNavigate()
  const hoje = useMemo(() => new Date(), [])

  const b = useMemo(() => compute(budget), [budget])
  const slices = useMemo(() => slicesFrom(b), [b])

  const dias = diasAteProximoRecebimento(hoje, budget.diaDeRecebimento)
  const diario = porDia(b.sobras, dias)
  const taxa = taxaPoupanca(b)
  const peso = pesoDespesasFixas(b)
  const nivel = nivelTaxaPoupanca(taxa)

  // The hero counts to its new value; everything else updates instantly.
  const heroValue = useCountUp(b.sobras)

  const taxaColor =
    nivel === 'bom' ? 'var(--positive)' : nivel === 'medio' ? 'var(--warning)' : 'var(--negative)'
  const pesoAlto = peso > 0.5

  return (
    <Screen>
      {/* Hero — the one number the product exists to show. */}
      <section className="pt-2 pb-6">
        <Label>{copy.home.heroLabel}</Label>
        <div
          className="t-hero tnum mt-1"
          style={{ color: b.emDefice ? 'var(--negative)' : 'var(--text)' }}
        >
          {formatEUR(heroValue)}
        </div>
        <p className="t-body mt-1 text-[var(--text-muted)]">
          {copy.home.de(formatEUR(b.rendimentoTotal))}
        </p>
      </section>

      {b.emDefice ? (
        <Card className="mb-3 border-[var(--negative)]">
          <Label className="!text-[var(--negative)]">{copy.home.deficeTitulo}</Label>
          <p className="t-body mt-1">{copy.home.deficeFrase}</p>
          <ol className="mt-3 space-y-1">
            {sugestoesDefice(budget, b).map((s, i) => (
              <li key={s} className="t-note text-[var(--text-muted)]">
                {i + 1}. {copy.home.sugestoes[s]}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {/* Donut */}
      <div className="flex justify-center py-2">
        <Donut
          slices={slices}
          centerLabel={copy.legenda.sobras}
          centerValue={formatEUR(b.sobras, { cents: false })}
          centerTone={b.emDefice ? 'negative' : 'normal'}
          coverage={
            b.emDefice
              ? {
                  covered: b.rendimentoTotal,
                  total: b.despesasFixas + b.investimentos + b.poupanca,
                }
              : undefined
          }
        />
      </div>

      {/* Legend — name + value + % on every row, so colour is never alone. */}
      <ul className="mb-3 mt-2">
        {slices.map((s) => {
          const share = b.rendimentoTotal > 0 ? s.value / b.rendimentoTotal : 0
          return (
            <li key={s.key}>
              <button
                onClick={() => navigate(SLICE_ROUTE[s.key])}
                className="flex min-h-[44px] w-full items-center gap-3 border-b border-[var(--border)] py-2 text-left last:border-b-0"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: s.color }}
                  aria-hidden
                />
                <span className="t-body flex-1 truncate">{s.label}</span>
                <span className="t-body tnum font-semibold">{formatEUR(s.value)}</span>
                <span className="t-note tnum w-12 shrink-0 text-right text-[var(--text-muted)]">
                  {formatPercent(share)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Per day */}
      <Card className="mb-3">
        <Label>{copy.home.porDiaLabel}</Label>
        {b.emDefice ? (
          <p className="t-value mt-1 text-[var(--negative)]">{copy.home.porDiaDefice}</p>
        ) : (
          <>
            <div className="t-title tnum mt-1">{formatEUR(diario)}</div>
            <p className="t-note mt-1 text-[var(--text-muted)]">
              {copy.home.porDiaFrase(
                formatEUR(diario),
                formatDayOfMonth(proximoRecebimento(hoje, budget.diaDeRecebimento)),
              )}
            </p>
          </>
        )}
      </Card>

      {/* Two stat tiles */}
      <div className="mb-4 flex gap-3">
        <StatTile
          label={copy.metricas.taxaPoupanca}
          value={formatPercent(taxa)}
          ratio={taxa / 0.3}
          color={taxaColor}
          phrase={copy.metricas.taxaPoupancaFrase[nivel]}
          onClick={() => navigate('/plano')}
        />
        <StatTile
          label={copy.metricas.pesoFixas}
          value={formatPercent(peso)}
          ratio={peso}
          color={pesoAlto ? 'var(--warning)' : 'var(--text)'}
          phrase={pesoAlto ? copy.metricas.pesoFixasFrase.alto : copy.metricas.pesoFixasFrase.ok}
          onClick={() => navigate('/fixas')}
        />
      </div>

      <GhostButton onClick={() => navigate('/plano')} className="flex items-center justify-center gap-1">
        {copy.home.ajustar}
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
      </GhostButton>
    </Screen>
  )
}
