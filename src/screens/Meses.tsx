import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Card, Label } from '../components/ui'
import { useBudget } from '../store/budget'
import { useHistorico } from '../store/historico'
import { compute } from '../lib/finance'
import { comoBreakdown, poupadoAte } from '../lib/historico'
import type { MesFechado } from '../lib/historico'
import { anoDe, mesDe, nomeDoMes } from '../lib/format'
import { useEUR } from '../lib/money'
import { copy } from '../lib/copy'
import { slicesFrom } from '../lib/slices'
import type { Breakdown } from '../lib/finance'

/**
 * Uma fita por mês, com as fatias na mesma ordem e nas mesmas cores do anel.
 * É o que deixa comparar dois meses sem ler um único número: um mês com o
 * dentista pago tem a faixa laranja que os outros não têm.
 */
function Fita({ b }: { b: Breakdown }) {
  const total = b.rendimentoTotal
  const fatias = slicesFrom(b).filter((s) => s.value > 0)
  if (total <= 0 || fatias.length === 0) {
    return <span className="mt-2 block h-1.5 rounded-full bg-[var(--surface-2)]" aria-hidden />
  }
  return (
    <span className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full" aria-hidden>
      {fatias.map((s) => (
        <span
          key={s.key}
          className="block h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${Math.max(1, (s.value / total) * 100)}%`,
            background: `linear-gradient(90deg, ${s.color}, ${s.color2})`,
          }}
        />
      ))}
    </span>
  )
}

/**
 * Todos os meses que a app viu, do mais recente para trás.
 *
 * Um mês fechado é um registo e não se reescreve — tocar num abre o Início
 * nesse mês, que é onde a fotografia inteira está.
 */
export function Meses() {
  const budget = useBudget((s) => s.budget)
  const historico = useHistorico((s) => s.historico)
  const navigate = useNavigate()
  const eur = useEUR()

  const mesCorrente = useMemo(() => mesDe(new Date()), [])
  const b = useMemo(() => compute(budget, mesCorrente), [budget, mesCorrente])

  const corrente: MesFechado = useMemo(
    () => ({
      mes: mesCorrente,
      rendimentoTotal: b.rendimentoTotal,
      despesasFixas: b.despesasFixas,
      gastos: b.gastos,
      investimentos: b.investimentos,
      poupanca: b.poupanca,
      sobras: b.sobras,
      fechadoEm: '',
    }),
    [b, mesCorrente],
  )

  // Do mais recente para trás: o mês que interessa está sempre no topo.
  const linhas = useMemo(
    () =>
      [...historico.meses.filter((m) => m.mes !== mesCorrente), corrente].sort((x, y) =>
        y.mes.localeCompare(x.mes),
      ),
    [historico.meses, mesCorrente, corrente],
  )

  const guardado = useMemo(
    () => poupadoAte(historico.meses, mesCorrente),
    [historico.meses, mesCorrente],
  )

  return (
    <Screen title={copy.meses.todosTitulo} back="/">
      {guardado.quantos > 0 ? (
        <Card className="mb-4">
          <Label>{copy.meses.totalGuardado}</Label>
          <span
            className="tnum iris mt-0.5 block"
            style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {eur(guardado.total)}
          </span>
          <p className="t-note mt-1 text-[var(--text-muted)]">
            {copy.meses.totalGuardadoFrase(guardado.quantos)}
          </p>
        </Card>
      ) : (
        <Card className="mb-4">
          <p className="t-value">{copy.meses.todosVazio}</p>
          <p className="t-note mt-2 text-[var(--text-muted)]">{copy.meses.todosVazioFrase}</p>
        </Card>
      )}

      {/* As duas colunas são nomeadas uma vez, aqui, e não em cada linha:
          repetir "Guardou" cinco vezes é ruído a fingir de informação. */}
      <div className="flex items-baseline gap-2 pb-1">
        <span className="t-label flex-1">{copy.meses.colunaMes}</span>
        <span className="t-label w-[86px] text-right">{copy.meses.colunaGuardado}</span>
        <span className="t-label w-[86px] text-right">{copy.meses.colunaSobras}</span>
        <span className="w-[18px] shrink-0" aria-hidden />
      </div>

      <ul>
        {linhas.map((m) => {
          const bm = m.mes === mesCorrente ? b : comoBreakdown(m)
          const aDecorrer = m.mes === mesCorrente
          return (
            <li key={m.mes}>
              <button
                onClick={() => navigate(aDecorrer ? '/' : `/?mes=${m.mes}`)}
                className="w-full border-b border-[var(--border)] py-3 text-left active:opacity-60"
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="t-body block truncate">
                      <span className="capitalize">{nomeDoMes(m.mes)}</span>{' '}
                      <span className="tnum text-[var(--text-muted)]">{anoDe(m.mes)}</span>
                    </span>
                    {aDecorrer ? (
                      <span className="t-note block text-[var(--text-muted)]">
                        {copy.meses.aDecorrerNota}
                      </span>
                    ) : null}
                  </span>
                  <span className="t-body tnum w-[86px] shrink-0 text-right font-semibold">
                    {eur(bm.investimentos + bm.poupanca)}
                  </span>
                  <span
                    className="t-body tnum w-[86px] shrink-0 text-right font-semibold"
                    style={bm.emDefice ? { color: 'var(--negative)' } : undefined}
                  >
                    {eur(bm.sobras)}
                  </span>
                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    className="shrink-0 self-center text-[var(--text-muted)] opacity-60"
                    aria-hidden
                  />
                </span>
                <Fita b={bm} />
              </button>
            </li>
          )
        })}
      </ul>

      <p className="t-note mt-4 text-[var(--text-muted)]">{copy.meses.comoFunciona}</p>
    </Screen>
  )
}
