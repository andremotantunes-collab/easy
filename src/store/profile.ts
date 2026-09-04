import { create } from 'zustand'
import type { Profile } from '../lib/profile'
import {
  clearProfile, emptyProfile, getPhoto, hashPin, loadProfile, newSalt,
  removePhoto, saveProfile, setPhoto,
} from '../lib/profile'

type ProfileStore = {
  profile: Profile | null
  /** Object URL for the photo, refreshed whenever the blob changes. */
  fotoUrl: string | null
  /** True while a PIN exists and it has not been entered this session. */
  bloqueado: boolean
  criar: (nome: string) => void
  guardar: (patch: Partial<Profile>) => void
  carregarFoto: () => Promise<void>
  definirFoto: (file: File) => Promise<void>
  apagarFoto: () => Promise<void>
  definirPin: (pin: string) => Promise<void>
  removerPin: () => void
  trancar: () => void
  destrancar: () => void
  apagar: () => void
}

const inicial = loadProfile()

export const useProfile = create<ProfileStore>((set, get) => ({
  profile: inicial,
  fotoUrl: null,
  // A cold start with a PIN set is a locked start. That is what a lock is for.
  bloqueado: !!inicial?.pinHash,

  criar: (nome) => {
    const p = { ...emptyProfile(), nome: nome.trim() }
    saveProfile(p)
    set({ profile: p })
  },

  guardar: (patch) => {
    const p = { ...(get().profile ?? emptyProfile()), ...patch }
    saveProfile(p)
    set({ profile: p })
  },

  carregarFoto: async () => {
    const blob = await getPhoto()
    const anterior = get().fotoUrl
    if (anterior) URL.revokeObjectURL(anterior)
    set({ fotoUrl: blob ? URL.createObjectURL(blob) : null })
  },

  definirFoto: async (file) => {
    const blob = await setPhoto(file)
    const anterior = get().fotoUrl
    if (anterior) URL.revokeObjectURL(anterior)
    get().guardar({ temFoto: true })
    set({ fotoUrl: URL.createObjectURL(blob) })
  },

  apagarFoto: async () => {
    await removePhoto()
    const anterior = get().fotoUrl
    if (anterior) URL.revokeObjectURL(anterior)
    get().guardar({ temFoto: false })
    set({ fotoUrl: null })
  },

  definirPin: async (pin) => {
    const pinSalt = newSalt()
    get().guardar({ pinSalt, pinHash: await hashPin(pin, pinSalt) })
  },

  removerPin: () => {
    const p = { ...(get().profile ?? emptyProfile()) }
    delete p.pinHash
    delete p.pinSalt
    saveProfile(p)
    set({ profile: p, bloqueado: false })
  },

  trancar: () => set({ bloqueado: true }),
  destrancar: () => set({ bloqueado: false }),

  apagar: () => {
    clearProfile()
    const anterior = get().fotoUrl
    if (anterior) URL.revokeObjectURL(anterior)
    set({ profile: null, fotoUrl: null, bloqueado: false })
  },
}))
