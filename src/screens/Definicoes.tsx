import { useRef, useState } from 'react'
import { Screen } from '../components/Layout'
import { Card, GhostButton, Label, PrimaryButton } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../store/budget'
import { useTheme } from '../lib/theme'
import type { ThemeChoice } from '../lib/theme'
import { clearBudgetStorage, exportBudget, importBudget } from '../lib/storage'
import { clearDocs } from '../lib/docs'
import { copy } from '../lib/copy'

const VERSAO = '1.0.0'

export function Definicoes() {
  const { budget, set, replace, reset } = useBudget()
  const [tema, setTema] = useTheme()
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const exportar = () => {
    const blob = new Blob([exportBudget(budget)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'easy-orcamento.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const importar = async (file: File | undefined) => {
    if (!file) return
    try {
      replace(importBudget(await file.text()))
      setMsg(copy.definicoes.importarOk)
    } catch {
      setMsg(copy.definicoes.importarErro)
    }
  }

  const apagarTudo = async () => {
    await clearDocs()
    clearBudgetStorage()
    reset()
    window.location.href = '/'
  }

  const opcoesTema: { id: ThemeChoice; label: string }[] = [
    { id: 'auto', label: copy.definicoes.temaAuto },
    { id: 'light', label: copy.definicoes.temaClaro },
    { id: 'dark', label: copy.definicoes.temaEscuro },
  ]

  return (
    <Screen title={copy.definicoes.titulo}>
      <Card className="mb-3">
        <Label className="mb-2">{copy.definicoes.tema}</Label>
        <div className="flex rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-1">
          {opcoesTema.map((o) => (
            <button
              key={o.id}
              onClick={() => setTema(o.id)}
              aria-pressed={tema === o.id}
              className={
                'min-h-[44px] flex-1 rounded-[8px] text-sm font-medium transition-opacity duration-150 ' +
                (tema === o.id ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text-muted)]')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-3">
        <Label className="mb-2">{copy.definicoes.diaRecebimento}</Label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={28}
            step={1}
            value={budget.diaDeRecebimento}
            aria-label={copy.definicoes.diaRecebimento}
            onChange={(e) => set({ diaDeRecebimento: Number(e.target.value) })}
          />
          <span className="t-value tnum w-8 shrink-0 text-right">{budget.diaDeRecebimento}</span>
        </div>
        <p className="t-note mt-1 text-[var(--text-muted)]">
          {copy.definicoes.diaRecebimentoAjuda}
        </p>
      </Card>

      <Card className="mb-3">
        <MoneyInput
          label={copy.definicoes.poupancaAcumulada}
          value={budget.poupancaAcumulada}
          onChange={(cents) => set({ poupancaAcumulada: cents })}
        />
        <p className="t-note mt-2 text-[var(--text-muted)]">
          {copy.definicoes.poupancaAcumuladaAjuda}
        </p>
      </Card>

      <Card className="mb-3">
        <Label className="mb-3">{copy.definicoes.dados}</Label>
        <div className="space-y-2">
          <GhostButton onClick={exportar}>{copy.definicoes.exportar}</GhostButton>
          <GhostButton onClick={() => fileRef.current?.click()}>
            {copy.definicoes.importar}
          </GhostButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void importar(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {msg ? <p className="t-note mt-2 text-[var(--text-muted)]">{msg}</p> : null}
        <p className="t-note mt-3 text-[var(--text-muted)]">{copy.definicoes.ondeFicam}</p>
      </Card>

      <Card className="mb-3 border-[var(--negative)]">
        <Label className="!text-[var(--negative)]">{copy.definicoes.apagar}</Label>
        <p className="t-note mt-1 text-[var(--text-muted)]">{copy.definicoes.apagarAviso}</p>
        <label className="mt-3 block">
          <span className="t-note mb-2 block text-[var(--text-muted)]">
            {copy.definicoes.apagarConfirma}
          </span>
          <input
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            aria-label={copy.definicoes.apagarConfirma}
            className="t-value w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none"
          />
        </label>
        <PrimaryButton
          className="mt-3 !bg-[var(--negative)] !text-white"
          disabled={confirmar.trim().toUpperCase() !== copy.definicoes.apagarPalavra}
          onClick={() => void apagarTudo()}
        >
          {copy.definicoes.apagarBotao}
        </PrimaryButton>
      </Card>

      <p className="t-note text-[var(--text-muted)]">
        {copy.brand} · {copy.definicoes.versao} {VERSAO}
      </p>
      <p className="t-note mt-2 text-[var(--text-muted)]">{copy.investir.disclaimer}</p>
    </Screen>
  )
}
