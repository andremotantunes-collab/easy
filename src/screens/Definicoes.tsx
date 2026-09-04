import { useRef, useState } from 'react'
import { Screen } from '../components/Layout'
import { Card, GhostButton, Label, PrimaryButton } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { ObjetivoSheet } from '../components/ObjetivoSheet'
import { useBudget } from '../store/budget'
import { clearBudgetStorage, exportBudget, importBudget } from '../lib/storage'
import { clearDocs } from '../lib/docs'
import { copy } from '../lib/copy'

/** The data page: what is stored, how to take it out, how to destroy it. */
export function Definicoes() {
  const { budget, set, replace, reset } = useBudget()
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState('')
  const [objetivoAberto, setObjetivoAberto] = useState(false)
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

  return (
    <Screen title={copy.definicoes.titulo} back="/perfil">
      <Card className="mb-3">
        <MoneyInput
          label={copy.definicoes.poupancaAcumulada}
          value={budget.poupancaAcumulada}
          onChange={(cents) => set({ poupancaAcumulada: cents })}
        />
        <p className="t-note mt-2 text-[var(--text-muted)]">
          {copy.definicoes.poupancaAcumuladaAjuda}
        </p>

        {/* A segunda porta para o objetivo, e a última. Está aqui, ao lado do
            pote, porque é sobre este pote que a meta é — e não em lado nenhum
            onde apareça sem se ir lá de propósito. */}
        <GhostButton className="mt-3" onClick={() => setObjetivoAberto(true)}>
          {budget.objetivo ? budget.objetivo.nome : copy.objetivo.definir}
        </GhostButton>
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

      <Card className="border-[var(--negative)]">
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

      <ObjetivoSheet open={objetivoAberto} onClose={() => setObjetivoAberto(false)} />
    </Screen>
  )
}
