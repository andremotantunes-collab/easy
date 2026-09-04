import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { PinDots, PinKeypad } from '../components/PinPad'
import { PrimaryButton, Sheet } from '../components/ui'
import { useProfile } from '../store/profile'
import { useBudget } from '../store/budget'
import { checkPin } from '../lib/profile'
import { clearBudgetStorage } from '../lib/storage'
import { clearDocs } from '../lib/docs'
import { copy } from '../lib/copy'

/** The front door: the app opens here whenever a PIN is set. */
export function Bloqueio() {
  const profile = useProfile((s) => s.profile)
  const destrancar = useProfile((s) => s.destrancar)
  const apagarPerfil = useProfile((s) => s.apagar)
  const reset = useBudget((s) => s.reset)

  const [pin, setPin] = useState('')
  const [erro, setErro] = useState(false)
  const [esqueci, setEsqueci] = useState(false)

  useEffect(() => {
    if (pin.length !== 4 || !profile) return
    let vivo = true
    void checkPin(profile, pin).then((ok) => {
      if (!vivo) return
      if (ok) destrancar()
      else {
        setErro(true)
        setPin('')
      }
    })
    return () => {
      vivo = false
    }
  }, [pin, profile, destrancar])

  const recomecar = async () => {
    await clearDocs()
    clearBudgetStorage()
    reset()
    apagarPerfil()
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col items-center px-5"
      style={{ paddingTop: 'calc(48px + env(safe-area-inset-top))' }}
    >
      <Avatar size={72} />
      <p className="t-title mt-3">{profile?.nome || copy.brand}</p>
      <p className="t-body mt-1 text-[var(--text-muted)]">{copy.conta.entrar}</p>

      <div className="mt-7" aria-live="polite">
        <PinDots length={4} filled={pin.length} shake={erro} />
      </div>
      <p className="t-note mt-3 h-4 text-[var(--negative)]">{erro ? copy.conta.errado : ''}</p>

      <div className="mt-4 w-full">
        <PinKeypad
          value={pin}
          onChange={(next) => {
            setErro(false)
            setPin(next)
          }}
        />
      </div>

      <button
        onClick={() => setEsqueci(true)}
        className="mt-6 min-h-[44px] text-sm text-[var(--text-muted)] underline"
      >
        {copy.conta.esqueci}
      </button>

      <Sheet open={esqueci} onClose={() => setEsqueci(false)} title={copy.conta.esqueci}>
        <p className="t-body mb-4">{copy.conta.esqueciAviso}</p>
        <PrimaryButton
          className="!bg-[var(--negative)] !text-white"
          onClick={() => void recomecar()}
        >
          {copy.conta.esqueciBotao}
        </PrimaryButton>
      </Sheet>
    </div>
  )
}
