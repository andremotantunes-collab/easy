import clsx from 'clsx'
import { useEffect } from 'react'
import { useProfile } from '../store/profile'

/** Initials, in the accent, until there is a photo. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

export function Avatar({ size = 64, className }: { size?: number; className?: string }) {
  const profile = useProfile((s) => s.profile)
  const fotoUrl = useProfile((s) => s.fotoUrl)
  const carregarFoto = useProfile((s) => s.carregarFoto)

  useEffect(() => {
    if (profile?.temFoto && !fotoUrl) void carregarFoto()
  }, [profile?.temFoto, fotoUrl, carregarFoto])

  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-[var(--surface-2)]',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {fotoUrl ? (
        <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-semibold text-[var(--accent)]"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {iniciais(profile?.nome ?? '')}
        </span>
      )}
    </span>
  )
}
