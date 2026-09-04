import { useMemo, useState } from 'react'
import { Screen } from '../components/Layout'
import { Card, Label } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../store/budget'
import { compute, META_FUNDO_MESES, fundoEmergenciaMeses, projecao } from '../lib/finance'
import { formatPercent } from '../lib/format'
import { useEUR } from '../lib/money'
import { OPCOES_INVESTIMENTO, copy } from '../lib/copy'

function RiskDots({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${copy.investir.risco} ${level} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i <= level ? 'var(--text)' : 'var(--surface-2)' }}
          aria-hidden
        />
      ))}
    </span>
  )
}

/** Two-colour split bar: what you put in versus what it earned. */
function SplitBar({ capital, juro }: { capital: number; juro: number }) {
  const total = capital + juro
  const pct = total > 0 ? (capital / total) * 100 : 100
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div style={{ width: `${pct}%`, background: 'var(--cat-invest)' }} />
      <div
        style={{ width: `${100 - pct}%`, background: 'var(--accent)', marginLeft: 2 }}
      />
    </div>
  )
}

export function Investir() {
  const eur = useEUR()
  const { budget, set } = useBudget()
  const b = useMemo(() => compute(budget), [budget])

  const [mensal, setMensal] = useState(b.investimentos)
  const [taxa, setTaxa] = useState(budget.taxaAnualEsperada)
  const [anos, setAnos] = useState(10)

  const meses = fundoEmergenciaMeses(budget.poupancaAcumulada, b.despesasFixas)
  const fundoOk = meses >= META_FUNDO_MESES

  const dezAnos = useMemo(
    () => projecao(b.investimentos, budget.taxaAnualEsperada, 10),
    [b.investimentos, budget.taxaAnualEsperada],
  )
  const sim = useMemo(() => projecao(mensal, taxa, anos), [mensal, taxa, anos])

  return (
    <Screen title={copy.investir.titulo} back="/perfil">
      {/* Top of funnel: the emergency fund comes before any of this. */}
      <Card className="mb-3">
        <Label>{copy.investir.fundoAvisoTitulo}</Label>
        <p className="t-body mt-1">{copy.investir.fundoAviso}</p>
        <p
          className="t-note mt-2"
          style={{ color: fundoOk ? 'var(--positive)' : 'var(--warning)' }}
        >
          {fundoOk
            ? copy.investir.fundoCompleto
            : copy.investir.fundoEstado(meses.toFixed(1).replace('.', ','))}
        </p>
      </Card>

      <Card className="mb-3">
        <Label>{copy.investir.titulo}</Label>
        <div className="t-title tnum mt-1">{copy.investir.aInvestir(eur(b.investimentos))}</div>
        <p className="t-note mt-1 text-[var(--text-muted)]">
          {copy.investir.daoEm(10, eur(dezAnos.total))}
        </p>
      </Card>

      {/* Simulator */}
      <Card className="mb-3">
        <Label className="mb-3">{copy.investir.simulador}</Label>
        <div className="space-y-3">
          <MoneyInput label={copy.investir.porMes} value={mensal} onChange={setMensal} />

          <div>
            <div className="flex items-baseline justify-between">
              <Label>{copy.investir.taxaAnual}</Label>
              <span className="t-value tnum">{formatPercent(taxa / 100, 1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={taxa}
              aria-label={copy.investir.taxaAnual}
              onChange={(e) => {
                const v = Number(e.target.value)
                setTaxa(v)
                set({ taxaAnualEsperada: v })
              }}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label>{copy.investir.anos}</Label>
              <span className="t-value tnum">{anos}</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={anos}
              aria-label={copy.investir.anos}
              onChange={(e) => setAnos(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <Label>{copy.investir.resultado}</Label>
          <div className="t-hero tnum mt-1 break-all">{eur(sim.total, { cents: false })}</div>
          <SplitBar capital={sim.capital} juro={sim.juro} />
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: 'var(--cat-invest)' }}
                aria-hidden
              />
              <span className="t-body flex-1">{copy.investir.capital}</span>
              <span className="t-body tnum font-semibold">{eur(sim.capital)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: 'var(--accent)' }}
                aria-hidden
              />
              <span className="t-body flex-1">{copy.investir.juro}</span>
              <span className="t-body tnum font-semibold">{eur(sim.juro)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Five risk-profile cards. Descriptions only — no products, no brands. */}
      <Label className="mb-2">{copy.investir.opcoes}</Label>
      <ul className="space-y-3">
        {OPCOES_INVESTIMENTO.map((o) => (
          <Card as="li" key={o.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="t-value">{o.nome}</span>
              <RiskDots level={o.risco} />
            </div>
            <p className="t-body mt-2 text-[var(--text-muted)]">{o.frase}</p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <div className="flex gap-2">
                <dt className="t-note text-[var(--text-muted)]">{copy.investir.horizonte}</dt>
                <dd className="t-note">{o.horizonte}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="t-note text-[var(--text-muted)]">{copy.investir.liquidez}</dt>
                <dd className="t-note">{o.liquidez}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </ul>

      <p className="t-note mt-4 text-[var(--text-muted)]">{copy.investir.disclaimer}</p>
    </Screen>
  )
}
