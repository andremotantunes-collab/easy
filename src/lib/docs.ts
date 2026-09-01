/**
 * Document storage. Blobs live in IndexedDB and never leave the device:
 * no upload, no fetch, no sync. The metadata index lives in the same store so
 * that a single "apagar tudo" clears both.
 */
import { clear, createStore, del, get, keys, set } from 'idb-keyval'
import type { Doc, DocTag } from './types'

const store = createStore('easy-docs', 'blobs')
const INDEX_KEY = 'docs.index.v1'

export const TAGS: DocTag[] = ['contrato', 'recibo', 'seguro', 'imposto', 'banco', 'outro']

export async function listDocs(): Promise<Doc[]> {
  const index = await get<Doc[]>(INDEX_KEY, store)
  return Array.isArray(index) ? index : []
}

async function writeIndex(docs: Doc[]): Promise<void> {
  await set(INDEX_KEY, docs, store)
}

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Guesses a starting tag from the file name, so the grid is useful immediately. */
function guessTag(name: string): DocTag {
  const n = name.toLowerCase()
  if (/contrato|arrendamento|contract/.test(n)) return 'contrato'
  if (/recibo|fatura|invoice/.test(n)) return 'recibo'
  if (/seguro|apolice|apólice/.test(n)) return 'seguro'
  if (/irs|imposto|financas|finanças|iuc|imi/.test(n)) return 'imposto'
  if (/banco|extrato|iban|nib/.test(n)) return 'banco'
  return 'outro'
}

export async function addFiles(files: File[]): Promise<Doc[]> {
  const docs = await listDocs()
  const created: Doc[] = []

  for (const file of files) {
    const id = newId()
    const blobKey = `blob.${id}`
    await set(blobKey, file, store)
    created.push({
      id,
      nome: file.name,
      tipo: file.type || 'application/octet-stream',
      tamanho: file.size,
      tags: [guessTag(file.name)],
      criadoEm: new Date().toISOString(),
      blobKey,
    })
  }

  await writeIndex([...created, ...docs])
  return created
}

export async function getBlob(doc: Doc): Promise<Blob | undefined> {
  return get<Blob>(doc.blobKey, store)
}

export async function removeDoc(doc: Doc): Promise<void> {
  await del(doc.blobKey, store)
  await writeIndex((await listDocs()).filter((d) => d.id !== doc.id))
}

/** Puts a deleted document back, blob and all — the undo path. */
export async function restoreDoc(doc: Doc, blob: Blob, index: number): Promise<void> {
  await set(doc.blobKey, blob, store)
  const docs = await listDocs()
  docs.splice(Math.min(index, docs.length), 0, doc)
  await writeIndex(docs)
}

export async function setTags(id: string, tags: DocTag[]): Promise<void> {
  await writeIndex((await listDocs()).map((d) => (d.id === id ? { ...d, tags } : d)))
}

export async function clearDocs(): Promise<void> {
  await clear(store)
}

export async function countDocs(): Promise<number> {
  return (await keys(store)).length
}
