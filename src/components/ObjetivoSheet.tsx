import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GhostButton, PrimaryButton, Sheet } from './ui'
import { MoneyInput } from './MoneyInput'
import { useBudget } from '../store/budget'
import { compute, fundoEmergenciaMeses } from '../lib/finance'
import { OBJETIVO_SUGERIDO, lerObjetivo } from '../lib/goal'
import { anoDe, formatPercent, nomeDoMes } from '../lib/format'
import { useEUR } from '../lib/money'
import { copy } from '../lib/copy'

/** 'Junho de 2029'. O `nomeDoMes` da casa devolve minusculas, e um `capitalize`
 *  em CSS punha maiuscula em todas as palavras da frase — «Ao Ritmo De». */
function mesPorExtenso(mes: string): string {
  const nome = nomeDoMes(mes)
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${anoDe(mes)}`
}

/**
 * O objetivo, e o unico sitio onde ele existe.
 *
 * Chega-se aqui por duas portas, ambas discretas: um toque na linha «Poupanca»
 * da legenda do Inicio, e as Definicoes. Nao ha' terceira — nem badge, nem
 * contador, nem lembrete, nem uma linha no Inicio a dizer que isto esta' aqui.
 *
 * A folha vive num componente proprio precisamente por causa disso: as duas
 * portas tinham de abrir exatamente a mesma coisa, e duas copias do mesmo ecra
 * acabam sempre com uma delas a ganhar um aviso que a outra nao tem.
 */
export function ObjetivoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const budget = useBudget((s) => s.budget)
  const setObjetivo = useBudget((s) => s.setObjetivo)
  const set = useBudget((s) => s.set)
  const navigate = useNavigate()
  const eur = useEUR()

  const [aEditar, setAEditar] = useState(false)
  const [nome, setNome] = useState(OBJETIVO_SUGERIDO)
  const [alvo, setAlvo] = useState(0)
  const [jaTens, setJaTens] = useState(0)

  const objetivo = budget.objetivo

  // Cada abertura comeca do estado guardado. Sem isto, fechar a meio de uma
  // edicao e voltar a entrar mostrava o rascunho abandonado da vez anterior.
  useEffect(() => {
    if (!open) return
    setAEditar(false)
    setNome(objetivo?.nome ?? OBJETIVO_SUGERIDO)
    setAlvo(objetivo?.alvo ?? 0)
    setJaTens(budget.poupancaAcumulada)
    // Só a abertura reinicia o formulário: guardar não pode reescrever os
    // campos por baixo dos dedos de quem ainda está a escrever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const b = compute(budget)
  const leitura = objetivo ? lerObjetivo(objetivo, budget.poupancaAcumulada, b.poupanca) : null
  const mesesFundo = fundoEmergenciaMeses(budget.poupancaAcumulada, b.despesasFixas)

  const guardar = () => {
    if (!nome.trim() || alvo <= 0) return
    setObjetivo({
      nome: nome.trim(),
      alvo,
      criadoEm: objetivo?.criadoEm ?? new Date().toISOString(),
    })
    // Só na criação: a edição não mexe no pote, que tem o lugar dele nas
    // Definições e é partilhado com o fundo de emergência.
    if (!objetivo) set({ poupancaAcumulada: jaTens })
    setAEditar(false)
  }

  const remover = () => {
    // Não toca na `poupancaAcumulada`. O dinheiro é o mesmo antes e depois.
    setObjetivo(null)
    setAEditar(false)
  }

  // Tres estados, e nao dois. Sem objetivo, a folha abre numa linha e num
  // botao — nao num formulario: quem toca na «Poupanca» sem saber o que ha' la'
  // nao merece levar com tres campos vazios na cara.
  return (
    <Sheet open={open} onClose={onClose} title={copy.objetivo.titulo}>
      {!objetivo && !aEditar ? (
        <div className="space-y-3">
          <p className="t-body text-[var(--text-muted)]">{copy.objetivo.semObjetivo}</p>
          <GhostButton onClick={() => setAEditar(true)}>{copy.objetivo.definir}</GhostButton>
        </div>
      ) : aEditar ? (
        <div className="space-y-3">
          <label className="block">
            <span className="t-label mb-2 block">{copy.objetivo.nome}</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={OBJETIVO_SUGERIDO}
              className="t-value w-full rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 outline-none"
            />
          </label>

          <MoneyInput label={copy.objetivo.alvo} value={alvo} onChange={setAlvo} />

          {/* Só ao criar. Quem já tem dinheiro de parte escreve-o aqui uma vez;
              a partir daí o pote vive nas Definições, ao lado do fundo de
              emergência, porque é o mesmo dinheiro. */}
          {!objetivo ? (
            <MoneyInput label={copy.objetivo.jaTens} value={jaTens} onChange={setJaTens} />
          ) : null}

          <PrimaryButton onClick={guardar} disabled={!nome.trim() || alvo <= 0}>
            {copy.objetivo.guardar}
          </PrimaryButton>

          {objetivo ? (
            <GhostButton className="!text-[var(--negative)]" onClick={remover}>
              {copy.objetivo.remover}
            </GhostButton>
          ) : null}
        </div>
      ) : objetivo ? (
        <div className="space-y-4 text-center">
          <div>
            <h3 className="t-title">{objetivo.nome}</h3>
            <p className="t-body tnum mt-1">
              {eur(budget.poupancaAcumulada)}{' '}
              <span className="text-[var(--text-muted)]">
                {copy.objetivo.de(eur(objetivo.alvo))}
              </span>
            </p>
          </div>

          {/* Barra fina, cor de acento, sem gradiente e sem brilho. Os 300 ms
              são a única animação: uma barra que enche devagar transforma um
              número numa cerimónia, e isto não é uma cerimónia. */}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{
                  width: `${(leitura?.progresso ?? 0) * 100}%`,
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>
            <span className="t-note tnum shrink-0 text-[var(--text-muted)]">
              {formatPercent(leitura?.progresso ?? 0)}
            </span>
          </div>

          {leitura?.estado === 'atingido' ? (
            // "Objetivo atingido." e mais nada. Sem confetti, sem emoji, sem som.
            <p className="t-value" style={{ color: 'var(--positive)' }}>
              {copy.objetivo.atingido}
            </p>
          ) : (
            <div className="space-y-1">
              <p className="t-value tnum">{copy.objetivo.faltam(eur(leitura?.falta ?? 0))}</p>
              {leitura?.estado === 'a-caminho' && leitura.mesPrevisto ? (
                <p className="t-note text-[var(--text-muted)]">
                  {copy.objetivo.aoRitmo(eur(b.poupanca), mesPorExtenso(leitura.mesPrevisto))}
                </p>
              ) : null}
              {leitura?.estado === 'longe' ? (
                <p className="t-note text-[var(--text-muted)]">{copy.objetivo.longe}</p>
              ) : null}
              {leitura?.estado === 'parado' ? (
                <p className="t-note text-[var(--text-muted)]">{copy.objetivo.parado}</p>
              ) : null}
            </div>
          )}

          <hr className="border-[var(--border)]" />

          {/* A linha da honestidade. A Easy. tem um só pote de poupança, e o
              objetivo é uma meta sobre esse pote — não uma conta separada. Sem
              isto, a app estava a deixar acreditar que são dois montes.

              O corte é em «há fundo» e não em «o fundo está completo»: com 5,8
              meses de cobertura, dizer que este dinheiro *falta* para o fundo
              esconderia os 5,8 meses que já lá estão. A variante «ainda te
              falta» é para quem não tem cobertura nenhuma, onde é a única
              verdadeira. */}
          <p className="t-note text-[var(--text-muted)]">
            {mesesFundo > 0
              ? copy.objetivo.poteCoberto(mesesFundo.toFixed(1).replace('.', ','))
              : copy.objetivo.poteEmFalta}
          </p>

          {leitura?.estado === 'parado' ? (
            <GhostButton
              className="!mt-2"
              onClick={() => {
                onClose()
                navigate('/plano')
              }}
            >
              {copy.objetivo.verPlano}
            </GhostButton>
          ) : null}

          <GhostButton onClick={() => setAEditar(true)}>{copy.objetivo.editar}</GhostButton>
        </div>
      ) : null}
    </Sheet>
  )
}
