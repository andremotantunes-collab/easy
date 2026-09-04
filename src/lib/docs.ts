/**
 * Document storage. Blobs live in IndexedDB and never leave the device:
 * no upload, no fetch, no sync. The metadata index lives in the same store so
 * that a single "apagar tudo" clears both.
 */
import { clear, createStore, del, delMany, get, keys, set } from 'idb-keyval'
import type { Doc, Fatura } from './types'

const store = createStore('easy-docs', 'blobs')
const INDEX_KEY = 'docs.index.v1'

export async function listDocs(): Promise<Doc[]> {
  const index = await get<Doc[]>(INDEX_KEY, store)
  return Array.isArray(index) ? index : []
}

async function writeIndex(docs: Doc[]): Promise<void> {
  await set(INDEX_KEY, docs, store)
}

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`

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

export async function clearDocs(): Promise<void> {
  await clear(store)
}

/* --- Faturas ------------------------------------------------------------ *
 *
 * A fatura de um gasto vive no MESMO armazem dos documentos, e por duas
 * razoes: um `clear` do armazem apaga tudo o que e' ficheiro de uma vez — o
 * "apagar tudo" nao pode deixar taloes para tras — e nao ha' razao para abrir
 * uma segunda base de dados para guardar a mesma coisa.
 *
 * O que NAO partilha e' o indice. Um talao nao e' um documento no sentido em
 * que a app usa a palavra, e a lista dos Documentos ficaria ilegivel. Por isso
 * as chaves sao `fatura.<id>` e nada disto toca em `writeIndex`: quem sabe que
 * a fatura existe e' o gasto, que guarda o bilhete dela.
 */

const faturaKey = (): string => `fatura.${newId()}`

/** Guarda o ficheiro e devolve o bilhete para o gasto agarrar. */
export async function saveFatura(file: File): Promise<Fatura> {
  const blobKey = faturaKey()
  await set(blobKey, file, store)
  return {
    nome: file.name || 'fatura',
    tipo: file.type || 'application/octet-stream',
    tamanho: file.size,
    blobKey,
  }
}

export async function getFaturaBlob(fatura: Fatura): Promise<Blob | undefined> {
  return get<Blob>(fatura.blobKey, store)
}

export async function removeFatura(fatura: Fatura | undefined): Promise<void> {
  if (fatura) await del(fatura.blobKey, store)
}

/** Poe uma fatura apagada de volta na chave que era a dela — o caminho do
 *  desfazer, que so' funciona se a chave for a mesma que o gasto guardou. */
export async function restoreFatura(fatura: Fatura, blob: Blob): Promise<void> {
  await set(fatura.blobKey, blob, store)
}

/**
 * Apaga os ficheiros de fatura que nenhum gasto reclama.
 *
 * Quem sabe que uma fatura existe e' o gasto que guarda o bilhete dela. Se um
 * caminho largar o bilhete sem apagar o ficheiro, o ficheiro fica no disco
 * para sempre: invisivel, sem forma de la' chegar, e a ocupar espaco a serio —
 * uma fatura e' uma fotografia de telemovel.
 *
 * Foi um bot a encontra'-lo: importar um orcamento substitui a lista de gastos
 * inteira, e com ela todos os bilhetes. Em vez de remendar so' esse caminho,
 * isto varre pela regra — o que nao esta' reclamado nao tem dono — e serve
 * para qualquer caminho que venha a existir.
 *
 * A lista de reclamadas vem de fora, e tem de vir do orcamento REAL. Chamar
 * isto com um orcamento vazio apaga tudo, e e' por isso que quem chama tem
 * primeiro de garantir que leu mesmo o que estava no disco.
 */
export async function limparFaturasOrfas(reclamadas: Set<string>): Promise<number> {
  const todas = await keys(store)
  const soltas = todas
    .map(String)
    .filter((k) => k.startsWith('fatura.') && !reclamadas.has(k))
  if (soltas.length) await delMany(soltas, store)
  return soltas.length
}

