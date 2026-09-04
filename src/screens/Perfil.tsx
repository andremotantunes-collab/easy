import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, LogOut } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { PinDots, PinKeypad } from '../components/PinPad'
import {
  Card, GhostButton, Group, Label, NavRow, PrimaryButton, Sheet, SwitchRow,
} from '../components/ui'
import { useBudget } from '../store/budget'
import { useProfile } from '../store/profile'
import { compute } from '../lib/finance'
import { mesDe, monthName } from '../lib/format'
import { useEUR } from '../lib/money'
import { pinDisponivel } from '../lib/profile'
import { useTheme } from '../lib/theme'
import type { ThemeChoice } from '../lib/theme'
import { copy } from '../lib/copy'

const VERSAO = '1.0.0'

export function Perfil() {
  const budget = useBudget((s) => s.budget)
  const toggleDiscreto = useBudget((s) => s.toggleDiscreto)
  const { profile, criar, definirFoto, definirPin, removerPin, trancar } = useProfile()
  const [tema, setTema] = useTheme()
  const navigate = useNavigate()
  const eur = useEUR()

  const fotoRef = useRef<HTMLInputElement>(null)
  const [nome, setNome] = useState('')
  const [pinSheet, setPinSheet] = useState(false)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [erro, setErro] = useState(false)

  const mesCorrente = useMemo(() => mesDe(new Date()), [])
  const b = useMemo(() => compute(budget, mesCorrente), [budget, mesCorrente])

  // The split as four whole percentages, in the same order as the donut.
  const reparticao = useMemo(() => {
    const t = b.rendimentoTotal
    const fixas = t > 0 ? Math.round((b.despesasFixas / t) * 100) : budget.despesasPercentagem
    const inv = budget.alocacao.investimentos
    const pou = budget.alocacao.poupanca
    return `${fixas}/${inv}/${pou}/${Math.max(0, 100 - fixas - inv - pou)}`
  }, [b, budget])

  const fixasValor =
    budget.modoDespesas === 'lista'
      ? copy.perfil.fixasLista(budget.despesasFixas.length)
      : copy.perfil.fixasPercentagem


  const opcoesTema: { id: ThemeChoice; label: string }[] = [
    { id: 'auto', label: copy.perfil.temaAuto },
    { id: 'light', label: copy.perfil.temaClaro },
    { id: 'dark', label: copy.perfil.temaEscuro },
  ]

  const fecharPin = () => {
    setPinSheet(false)
    setPin1('')
    setPin2('')
    setErro(false)
  }

  const confirmarPin = async (repetido: string) => {
    if (pin1 !== repetido) {
      setErro(true)
      setPin2('')
      return
    }
    await definirPin(pin1)
    fecharPin()
  }

  // Nothing exists until there is a name. One field, one button.
  if (!profile) {
    return (
      <Screen title={copy.perfil.titulo}>
        <Card>
          <Label>{copy.conta.criarTitulo}</Label>
          <p className="t-note mt-1 text-[var(--text-muted)]">{copy.conta.criarFrase}</p>
          <input
            value={nome}
            placeholder={copy.conta.nomePlaceholder}
            autoComplete="name"
            enterKeyHint="done"
            onChange={(e) => setNome(e.target.value)}
            className="t-value mt-4 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none"
          />
          <PrimaryButton className="mt-3" disabled={!nome.trim()} onClick={() => criar(nome)}>
            {copy.conta.criar}
          </PrimaryButton>
        </Card>
      </Screen>
    )
  }

  const criadoEm = new Date(profile.criadoEm)

  return (
    <Screen title={copy.perfil.titulo}>
      <Card className="mb-4 flex items-center gap-4">
        <button
          onClick={() => fotoRef.current?.click()}
          aria-label={copy.conta.mudarFoto}
          className="relative active:opacity-70"
        >
          <Avatar size={64} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)]">
            <Camera size={13} strokeWidth={2} aria-hidden />
          </span>
        </button>
        <input
          ref={fotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void definirFoto(f)
            e.target.value = ''
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="t-value truncate font-semibold">{profile.nome}</p>
          <p className="t-note tnum mt-1 truncate text-[var(--text-muted)]">
            {b.rendimentoTotal > 0
              ? copy.conta.resumo(eur(b.rendimentoTotal, { cents: false }), reparticao)
              : copy.conta.semRendimento}
          </p>
          <p className="t-note mt-1 truncate text-[var(--text-muted)]">
            {copy.conta.membroDesde(
              `${monthName(criadoEm).toLowerCase()} de ${criadoEm.getFullYear()}`,
            )}
          </p>
        </div>
      </Card>

      <Group className="mb-4">
        <NavRow label={copy.conta.dados} onClick={() => navigate('/perfil/dados')} />
        <NavRow
          label={copy.perfil.rendimento}
          value={eur(b.rendimentoTotal, { cents: false })}
          onClick={() => navigate('/plano')}
        />
        <NavRow label={copy.perfil.repartir} value={reparticao} onClick={() => navigate('/plano')} />
        <NavRow label={copy.perfil.fixas} value={fixasValor} onClick={() => navigate('/fixas')} />
        <NavRow label={copy.meses.todosTitulo} onClick={() => navigate('/meses')} />
        <NavRow label={copy.perfil.investir} onClick={() => navigate('/investir')} />
      </Group>

      <Group className="mb-4">
        <SwitchRow
          label={copy.perfil.discreto}
          help={copy.perfil.discretoAjuda}
          checked={budget.modoDiscreto}
          onChange={toggleDiscreto}
        />
        <NavRow
          label={copy.conta.seguranca}
          value={profile.pinHash ? copy.conta.mudarPin : copy.conta.definirPin}
          onClick={() => setPinSheet(true)}
        />
      </Group>

      <Card className="mb-4">
        <Label className="mb-2">{copy.perfil.tema}</Label>
        <div className="flex rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-1">
          {opcoesTema.map((o) => (
            <button
              key={o.id}
              onClick={() => setTema(o.id)}
              aria-pressed={tema === o.id}
              className={
                'min-h-[44px] flex-1 rounded-[9px] text-[15px] font-medium tracking-[-0.01em] transition-opacity duration-150 ' +
                (tema === o.id
                  ? 'bg-[var(--segment-active)] text-[var(--text)] shadow-[var(--shadow-pill)]'
                  : 'text-[var(--text-muted)]')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </Card>

      <Group className="mb-4">
        <NavRow label={copy.perfil.dados} onClick={() => navigate('/definicoes')} />
      </Group>

      {profile.pinHash ? (
        <GhostButton className="mb-4 flex items-center justify-center gap-2" onClick={trancar}>
          <LogOut size={18} strokeWidth={1.8} aria-hidden />
          {copy.conta.sair}
        </GhostButton>
      ) : (
        <p className="t-note mb-4 text-[var(--text-muted)]">{copy.conta.sairSemPin}</p>
      )}

      <p className="t-note text-[var(--text-muted)]">
        {copy.brand} · {copy.definicoes.versao} {VERSAO}
      </p>
      <p className="t-note mt-2 text-[var(--text-muted)]">{copy.investir.disclaimer}</p>

      <Sheet open={pinSheet} onClose={fecharPin} title={copy.conta.pin}>
        {!pinDisponivel() ? (
          <p className="t-body">{copy.conta.pinIndisponivel}</p>
        ) : (
          <div className="space-y-4">
            <p className="t-body text-center">
              {pin1.length < 4 ? copy.conta.pinNovo : copy.conta.pinRepetir}
            </p>
            <PinDots length={4} filled={pin1.length < 4 ? pin1.length : pin2.length} shake={erro} />
            <p className="t-note h-4 text-center text-[var(--negative)]">
              {erro ? copy.conta.pinDiferente : ''}
            </p>
            <PinKeypad
              value={pin1.length < 4 ? pin1 : pin2}
              onChange={(next) => {
                setErro(false)
                if (pin1.length < 4) setPin1(next)
                else {
                  setPin2(next)
                  if (next.length === 4) void confirmarPin(next)
                }
              }}
            />
            <p className="t-note text-[var(--text-muted)]">{copy.conta.pinAjuda}</p>
            {profile.pinHash ? (
              <GhostButton
                onClick={() => {
                  removerPin()
                  fecharPin()
                }}
              >
                {copy.conta.removerPin}
              </GhostButton>
            ) : null}
          </div>
        )}
      </Sheet>
    </Screen>
  )
}
