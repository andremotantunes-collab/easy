import { useState } from 'react'
import { Screen } from '../components/Layout'
import { Card, Label } from '../components/ui'
import { useProfile } from '../store/profile'
import { copy } from '../lib/copy'

type Campo = {
  id: 'nome' | 'email' | 'telemovel' | 'nascimento' | 'nif'
  label: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  autoComplete?: string
  maxLength?: number
}

const CAMPOS: Campo[] = [
  { id: 'nome', label: copy.conta.nome, autoComplete: 'name' },
  { id: 'email', label: copy.conta.email, inputMode: 'email', autoComplete: 'email' },
  { id: 'telemovel', label: copy.conta.telemovel, inputMode: 'tel', autoComplete: 'tel' },
  { id: 'nascimento', label: copy.conta.nascimento, inputMode: 'numeric', maxLength: 10 },
  { id: 'nif', label: copy.conta.nif, inputMode: 'numeric', maxLength: 9 },
]

/** Details the app never calculates with. They are kept because they are yours. */
export function DadosPessoais() {
  const profile = useProfile((s) => s.profile)
  const guardar = useProfile((s) => s.guardar)
  const [tocado, setTocado] = useState(false)

  return (
    <Screen title={copy.conta.dados} back="/perfil">
      <Card className="mb-3">
        <div className="space-y-4">
          {CAMPOS.map((c) => (
            <label key={c.id} className="block">
              <span className="t-label mb-2 block">{c.label}</span>
              <input
                value={profile?.[c.id] ?? ''}
                inputMode={c.inputMode}
                autoComplete={c.autoComplete}
                maxLength={c.maxLength}
                enterKeyHint="done"
                placeholder={c.id === 'nascimento' ? 'dd/mm/aaaa' : ''}
                onChange={(e) => {
                  guardar({ [c.id]: e.target.value })
                  setTocado(true)
                }}
                className="t-body w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 outline-none"
                style={{ fontSize: 16 }}
              />
            </label>
          ))}
        </div>
        <p className="t-note mt-4 text-[var(--text-muted)]">{copy.conta.dadosAjuda}</p>
      </Card>

      <p className="t-note h-4 text-[var(--text-muted)]">{tocado ? copy.conta.guardado : ''}</p>

      <Label className="mt-2">{copy.definicoes.ondeFicam}</Label>
    </Screen>
  )
}
