import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Screen } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { Donut } from '../components/Donut'
import { ObjetivoSheet } from '../components/ObjetivoSheet'
import {
  Bar, Card, GhostButton, Label, PrimaryButton, StatTile, useCountUp,
} from '../components/ui'
import { useBudget } from '../store/budget'
import { useProfile } from '../store/profile'
import { useHistorico } from '../store/historico'
import {
  compute, nivelTaxaPoupanca, pesoDespesasFixas, sugestoesDefice, taxaPoupanca,
} from '../lib/finance'
import { comoBreakdown, poupadoAte } from '../lib/historico'
import type { MesFechado } from '../lib/historico'
import { anoDe, formatDate, formatPercent, mesCurto, mesDe, nomeDoMes } from '../lib/format'
import { useEUR } from '../lib/money'
import { copy } from '../lib/copy'
import { SLICE_ROUTE, slicesFrom } from '../lib/slices'

/**
 * This month and the months before it, on one screen. A past month is the same
 * picture seen later, not a different destination — so the strip changes WHICH
 * month the screen is about, and everything below it follows.
 *
 * A record never moves: change today's plan and September stays as September
 * was on the day it closed.
 */
export function Inicio() {
  const budget = useBudget((s) => s.budget)
  const toggleDiscreto = useBudget((s) => s.toggleDiscreto)
  const profile = useProfile((s) => s.profile)
  const historico = useHistorico((s) => s.historico)
  const fechadoAgora = useHistorico((s) => s.fechadoAgora)
  const dispensarAviso = useHistorico((s) => s.dispensarAviso)
  const navigate = useNavigate()
  const [objetivoAberto, setObjetivoAberto] = useState(false)
  const eur = useEUR()

  const [params, setParams] = useSearchParams()

  const agora = useMemo(() => new Date(), [])
  const mesCorrente = mesDe(agora)
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

  const meses = useMemo(
    () => [...historico.meses.filter((m) => m.mes !== mesCorrente), corrente],
    [historico.meses, mesCorrente, corrente],
  )

  // O mes que se esta' a ver vive no URL e nao no componente: assim o botao
  // "voltar" do telemovel desfaz a escolha, e a lista de Todos os meses pode
  // abrir o Inicio ja' no mes certo. Um mes que nao exista cai no corrente.
  const pedido = params.get('mes')
  const escolhido = pedido && meses.some((m) => m.mes === pedido) ? pedido : mesCorrente
  const escolher = (mes: string) =>
    setParams(mes === mesCorrente ? {} : { mes }, { replace: true })

  const registo = meses.find((m) => m.mes === escolhido) ?? corrente
  const atual = registo.mes === mesCorrente
  const bm = useMemo(() => (atual ? b : comoBreakdown(registo)), [atual, b, registo])

  const slices = useMemo(() => slicesFrom(bm), [bm])
  const vazio = atual && bm.rendimentoTotal <= 0

  const taxa = taxaPoupanca(bm)
  const peso = pesoDespesasFixas(bm)
  const nivel = nivelTaxaPoupanca(taxa)
  const pesoAlto = peso > 0.5

  // O que os meses fechados puseram de lado, até ao mês que está a ver-se.
  const poupado = useMemo(
    () => poupadoAte(historico.meses, registo.mes),
    [historico.meses, registo.mes],
  )

  const heroValue = useCountUp(bm.sobras)
  const share = bm.rendimentoTotal > 0 ? bm.sobras / bm.rendimentoTotal : 0

  const taxaColor =
    nivel === 'bom' ? 'var(--positive)' : nivel === 'medio' ? 'var(--warning)' : 'var(--negative)'
  const taxaColor2 = nivel === 'bom' ? 'var(--cat-poupanca)' : 'var(--cat-invest)'

  const primeiroNome = (profile?.nome ?? '').trim().split(/\s+/)[0]

  return (
    <Screen
      title={primeiroNome ? copy.home.ola(primeiroNome) : undefined}
      left={profile ? <Avatar size={34} /> : <Logo size={30} />}
      right={
        <span className="t-note capitalize text-[var(--text-muted)]">{nomeDoMes(registo.mes)}</span>
      }
    >
      {fechadoAgora ? (
        <Card className="mb-4">
          <Label>{copy.meses.mesFechadoTitulo(nomeDoMes(fechadoAgora.mes))}</Label>
          <p className="t-body mt-1 text-[var(--text-muted)]">{copy.meses.mesFechadoFrase}</p>
          <div className="mt-3 flex gap-2">
            <GhostButton
              onClick={() => {
                escolher(fechadoAgora.mes)
                dispensarAviso()
              }}
            >
              {copy.meses.verMes}
            </GhostButton>
            <GhostButton onClick={dispensarAviso}>{copy.meses.dispensar}</GhostButton>
          </div>
        </Card>
      ) : null}

      {/* A fita só aparece quando há mais do que um mês para ver. */}
      {meses.length > 1 ? (
        <div className="-mx-5 mb-4 overflow-x-auto px-5">
          <div className="flex w-max gap-2">
            {meses.map((m) => {
              const ativo = m.mes === escolhido
              return (
                <button
                  key={m.mes}
                  onClick={() => escolher(m.mes)}
                  aria-pressed={ativo}
                  className={
                    'flex min-h-[52px] min-w-[66px] flex-col items-center justify-center rounded-[var(--radius-sm)] px-3 ' +
                    'transition-opacity duration-150 active:opacity-60 ' +
                    (ativo
                      ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'border border-[var(--card-border)] bg-[var(--surface)] text-[var(--text-muted)]')
                  }
                >
                  <span className="text-[15px] font-semibold capitalize">{mesCurto(m.mes)}</span>
                  <span className="tnum text-[11px] opacity-80">{anoDe(m.mes)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {vazio ? (
        <Card className="mt-2">
          <Label>{copy.home.vazioTitulo}</Label>
          <p className="t-body mt-1 text-[var(--text-muted)]">{copy.home.vazioFrase}</p>
          <PrimaryButton className="mt-4" onClick={() => navigate('/plano')}>
            {copy.home.vazioBotao}
          </PrimaryButton>
        </Card>
      ) : (
        <>
          <button
            onClick={toggleDiscreto}
            aria-pressed={budget.modoDiscreto}
            className="block w-full pt-1 pb-5 text-left active:opacity-70"
          >
            <Label>{copy.home.heroLabel}</Label>
            <div
              className={bm.emDefice ? 't-hero tnum mt-1' : 't-hero tnum iris mt-1'}
              style={bm.emDefice ? { color: 'var(--negative)' } : undefined}
            >
              {eur(heroValue)}
            </div>
            <p className="t-body mt-1 text-[var(--text-muted)]">
              {copy.home.heroSub(formatPercent(share), eur(bm.rendimentoTotal, { cents: false }))}
            </p>
          </button>

          {/* O acumulado vem logo a seguir ao número do mês: primeiro o que
              tens agora, depois o que já ficou para trás. Fica deliberadamente
              mais leve do que o Hero — dois números grandes seguidos competem
              um com o outro e nenhum ganha. */}
          {poupado.quantos > 0 ? (
            <Card className="mb-4 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <Label>{copy.meses.poupadoTitulo}</Label>
                <span
                  className="tnum iris mt-0.5 block"
                  style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}
                >
                  {eur(poupado.total)}
                </span>
              </span>
              <span className="t-note shrink-0 text-right text-[var(--text-muted)]">
                {copy.meses.poupadoFrase(poupado.quantos)}
                {!atual ? (
                  <span className="block capitalize">{copy.meses.poupadoAte(nomeDoMes(registo.mes))}</span>
                ) : null}
              </span>
            </Card>
          ) : null}

          {bm.emDefice ? (
            <Card className="mb-4 border-[var(--negative)]">
              <Label className="!text-[var(--negative)]">{copy.home.deficeTitulo}</Label>
              <p className="t-body mt-1">{copy.home.deficeFrase}</p>
              {atual ? (
                <ol className="mt-3 space-y-1">
                  {sugestoesDefice(budget, bm).map((s, i) => (
                    <li key={s} className="t-note text-[var(--text-muted)]">
                      {i + 1}. {copy.home.sugestoes[s]}
                    </li>
                  ))}
                </ol>
              ) : null}
            </Card>
          ) : null}

          <Card className="mb-4">
            {!atual ? (
              <p className="t-note mb-2 text-[var(--text-muted)]">
                {copy.meses.fechado(formatDate(new Date(registo.fechadoEm)))}
              </p>
            ) : null}

            <div className="flex justify-center py-1">
              <Donut
                slices={slices}
                size={188}
                stroke={24}
                centerLabel={copy.home.mesLabel}
                centerValue={eur(bm.rendimentoTotal, { cents: false })}
                centerTone={bm.emDefice ? 'negative' : 'normal'}
                coverage={
                  bm.emDefice
                    ? {
                        covered: bm.rendimentoTotal,
                        total: bm.despesasFixas + bm.investimentos + bm.poupanca,
                      }
                    : undefined
                }
              />
            </div>

            {/* Name, value, share and a bar on every row, so colour is never
                alone and the four are comparable without reading numbers. */}
            <ul className="mt-2">
              {slices.map((s) => {
                const parte = bm.rendimentoTotal > 0 ? s.value / bm.rendimentoTotal : 0
                const negativa = s.key === 'sobras' && bm.emDefice
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => {
                        if (!atual) return
                        // A porta discreta. Esta linha é, em pixels, idêntica
                        // às outras: mesmo tipo, mesma cor, mesmo quadrado,
                        // mesma barra, sem seta, sem badge, sem `aria` a mais.
                        // A única diferença está no destino, e um ecrã não
                        // mostra destinos.
                        if (s.key === 'poupanca') setObjetivoAberto(true)
                        else navigate(SLICE_ROUTE[s.key])
                      }}
                      className="w-full py-2.5 text-left active:opacity-60"
                    >
                      <span className="flex items-center gap-3">
                        <span className="t-body flex-1 truncate">{s.label}</span>
                        <span
                          className="t-body tnum font-semibold"
                          style={negativa ? { color: 'var(--negative)' } : undefined}
                        >
                          {eur(s.value)}
                        </span>
                        <span className="t-note tnum w-11 shrink-0 text-right text-[var(--text-muted)]">
                          {formatPercent(parte)}
                        </span>
                      </span>
                      <Bar className="mt-2" ratio={parte} color={s.color} color2={s.color2} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Label className="mb-2">{copy.metricas.titulo}</Label>
          {/* A tinta quase preta das fixas (--cat-fixas) é a cor certa para uma
              fatia do anel e a errada para um veredicto: um mês saudável ficava
              com o cartão apagado, e um mês saudável é a maioria dos meses.
              Contas que cabem são o azul-ciano da casa; contas pesadas é que
              ganham o âmbar. */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={copy.metricas.taxaPoupanca}
              value={formatPercent(taxa)}
              ratio={taxa / 0.3}
              color={taxaColor}
              color2={taxaColor2}
              phrase={copy.metricas.taxaPoupancaFrase[nivel]}
              onClick={atual ? () => navigate('/plano') : undefined}
            />
            <StatTile
              label={copy.metricas.pesoFixas}
              value={formatPercent(peso)}
              ratio={peso}
              color={pesoAlto ? 'var(--warning)' : 'var(--cat-sobras)'}
              color2={pesoAlto ? 'var(--cat-invest)' : 'var(--cat-sobras-2)'}
              phrase={pesoAlto ? copy.metricas.pesoFixasFrase.alto : copy.metricas.pesoFixasFrase.ok}
              onClick={atual ? () => navigate('/fixas') : undefined}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!atual ? (
              <GhostButton onClick={() => escolher(mesCorrente)}>
                {copy.meses.voltarAoMes}
              </GhostButton>
            ) : null}
            {meses.length > 1 ? (
              <GhostButton onClick={() => navigate('/meses')}>{copy.meses.todos}</GhostButton>
            ) : null}
          </div>
        </>
      )}

      {/* Fica fora do `vazio ? :` de propósito: a folha é montada sempre, mas
          só se abre por um toque. Nada no ecrã por cima dela lhe faz referência. */}
      <ObjetivoSheet open={objetivoAberto} onClose={() => setObjetivoAberto(false)} />
    </Screen>
  )
}
