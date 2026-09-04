/**
 * The local account. There is no server anywhere in this product, so an
 * account here means exactly two things: who you are (a name, a photo, your
 * details) and a PIN that locks the app on this device.
 *
 * What the PIN is: a lock on the front door, so a phone handed to someone for
 * a second does not show your money. What it is NOT: encryption. The budget
 * stays readable in the browser's own storage for anyone with the device
 * unlocked and developer tools open. Saying otherwise would be a lie, and it
 * is written as such in the app. See DECISIONS.md.
 */
import { createStore, del, get, set } from 'idb-keyval'

export const PROFILE_KEY = 'easy.profile.v1'
const photoStore = createStore('easy-perfil', 'foto')
const PHOTO_KEY = 'foto'

export type Profile = {
  nome: string
  email: string
  telemovel: string
  nascimento: string // dd/mm/aaaa, as typed
  nif: string
  criadoEm: string // ISO
  temFoto: boolean
  /** Both absent until a PIN is set. */
  pinHash?: string
  pinSalt?: string
}

export const emptyProfile = (): Profile => ({
  nome: '',
  email: '',
  telemovel: '',
  nascimento: '',
  nif: '',
  criadoEm: new Date().toISOString(),
  temFoto: false,
})

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    return { ...emptyProfile(), ...(JSON.parse(raw) as Profile) }
  } catch {
    return null
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {
    // Private mode or a full quota: the app keeps working in memory.
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // ignored
  }
  void del(PHOTO_KEY, photoStore)
}

// ---------------------------------------------------------------------------
// PIN
// ---------------------------------------------------------------------------

const enc = new TextEncoder()

/** Salted SHA-256, so the stored value is not the PIN itself. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${pin}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function newSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A PIN can only be set where the platform gives us a real digest. */
export const pinDisponivel = (): boolean =>
  typeof crypto !== 'undefined' && !!crypto.subtle && !!crypto.getRandomValues

export async function checkPin(profile: Profile, pin: string): Promise<boolean> {
  if (!profile.pinHash || !profile.pinSalt) return true
  return (await hashPin(pin, profile.pinSalt)) === profile.pinHash
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export const getPhoto = (): Promise<Blob | undefined> => get<Blob>(PHOTO_KEY, photoStore)

/**
 * Square-cropped and capped at 256 px before it is stored: a phone photo is
 * several megabytes and this is rendered at 64.
 */
export async function setPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.min(256, side)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
    0, 0, size, size,
  )
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('sem imagem'))), 'image/jpeg', 0.85)
  })
  await set(PHOTO_KEY, blob, photoStore)
  return blob
}

export const removePhoto = (): Promise<void> => del(PHOTO_KEY, photoStore)
