import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download, FileImage, FileSpreadsheet, FileText, File as FileIcon, Plus, Trash2,
} from 'lucide-react'
import { Screen } from '../components/Layout'
import { Card, GhostButton, Group, PrimaryButton, Sheet, UndoToast } from '../components/ui'
import { addFiles, getBlob, listDocs, removeDoc, restoreDoc } from '../lib/docs'
import type { Doc } from '../lib/types'
import { formatBytes, formatDate } from '../lib/format'
import { copy } from '../lib/copy'
import { createZip, safeFileName } from '../lib/zip'

function iconFor(tipo: string) {
  if (tipo.startsWith('image/')) return FileImage
  if (tipo === 'application/pdf') return FileText
  if (tipo.includes('sheet') || tipo.includes('csv')) return FileSpreadsheet
  return FileIcon
}

/** Anchor-triggered save. The blob is local, so nothing touches the network. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function Documentos() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [preview, setPreview] = useState<{ doc: Doc; url: string; blob: Blob } | null>(null)
  const [undo, setUndo] = useState<{ doc: Doc; blob: Blob; index: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => setDocs(await listDocs()), [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files) return
    const list = Array.from(files)
    if (list.length === 0) return
    await addFiles(list)
    await refresh()
  }

  const abrir = async (doc: Doc) => {
    const blob = await getBlob(doc)
    if (!blob) return
    setPreview({ doc, url: URL.createObjectURL(blob), blob })
  }

  const fecharPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const apagar = async (doc: Doc) => {
    const blob = await getBlob(doc)
    const index = docs.findIndex((d) => d.id === doc.id)
    await removeDoc(doc)
    await refresh()
    if (blob) setUndo({ doc, blob, index })
  }

  const exportarTudo = async () => {
    setExporting(true)
    try {
      const taken = new Set<string>()
      const entries = []
      for (const doc of docs) {
        const blob = await getBlob(doc)
        if (!blob) continue
        entries.push({
          name: safeFileName(doc.nome, taken),
          data: new Uint8Array(await blob.arrayBuffer()),
          date: new Date(doc.criadoEm),
        })
      }
      saveBlob(createZip(entries), 'easy-documentos.zip')
    } finally {
      setExporting(false)
    }
  }

  const isImage = preview?.doc.tipo.startsWith('image/')
  const isPdf = preview?.doc.tipo === 'application/pdf'

  return (
    <Screen
      title={copy.documentos.titulo}
      right={
        <button
          onClick={() => inputRef.current?.click()}
          aria-label={copy.documentos.adicionar}
          className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] active:opacity-80"
        >
          <Plus size={20} strokeWidth={2.2} aria-hidden />
        </button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void onFiles(e.dataTransfer.files)
        }}
        className="rounded-[var(--radius)]"
        style={dragging ? { outline: '2px dashed var(--accent)', outlineOffset: 4 } : undefined}
      >
        {docs.length === 0 ? (
          <Card className="text-center">
            <p className="t-value">
              {dragging ? copy.documentos.largar : copy.documentos.vazioTitulo}
            </p>
            <p className="t-note mt-2 text-[var(--text-muted)]">{copy.documentos.vazioFrase}</p>
            <GhostButton className="mt-4" onClick={() => inputRef.current?.click()}>
              {copy.documentos.adicionar}
            </GhostButton>
          </Card>
        ) : (
          <Group>
            <ul>
              {docs.map((doc) => {
                const Icon = iconFor(doc.tipo)
                return (
                  <li
                    key={doc.id}
                    className="flex items-center border-b border-[var(--border)] last:border-b-0"
                  >
                    <button
                      onClick={() => void abrir(doc)}
                      className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left active:opacity-60"
                    >
                      <Icon
                        size={22}
                        strokeWidth={1.6}
                        aria-hidden
                        className="shrink-0 text-[var(--text-muted)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="t-body block truncate">{doc.nome}</span>
                        <span className="t-note tnum block text-[var(--text-muted)]">
                          {formatBytes(doc.tamanho)} · {formatDate(new Date(doc.criadoEm))}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => void apagar(doc)}
                      aria-label={`${copy.documentos.apagar} ${doc.nome}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text-muted)] active:opacity-60"
                    >
                      <Trash2 size={17} strokeWidth={1.8} aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Group>
        )}
      </div>

      <Card className="mt-4">
        <p className="t-note text-[var(--text-muted)]">{copy.documentos.aviso}</p>
        <GhostButton
          className="mt-3 flex items-center justify-center gap-2"
          onClick={() => void exportarTudo()}
          disabled={docs.length === 0 || exporting}
        >
          <Download size={18} strokeWidth={1.8} aria-hidden />
          {exporting ? copy.documentos.aExportar : copy.documentos.exportar}
        </GhostButton>
      </Card>

      <Sheet open={!!preview} onClose={fecharPreview} title={preview?.doc.nome ?? ''}>
        {preview ? (
          <div className="space-y-3">
            {isImage ? (
              <img
                src={preview.url}
                alt={preview.doc.nome}
                className="max-h-[50dvh] w-full rounded-[var(--radius-sm)] object-contain"
              />
            ) : isPdf ? (
              <object
                data={preview.url}
                type="application/pdf"
                className="h-[50dvh] w-full rounded-[var(--radius-sm)]"
                aria-label={preview.doc.nome}
              >
                <p className="t-note text-[var(--text-muted)]">
                  {copy.documentos.semPreVisualizacao}
                </p>
              </object>
            ) : (
              <p className="t-note text-[var(--text-muted)]">{copy.documentos.semPreVisualizacao}</p>
            )}
            <PrimaryButton onClick={() => saveBlob(preview.blob, preview.doc.nome)}>
              {copy.documentos.descarregar}
            </PrimaryButton>
          </div>
        ) : null}
      </Sheet>

      {undo ? (
        <UndoToast
          message={copy.documentos.apagado(undo.doc.nome)}
          actionLabel={copy.documentos.desfazer}
          onAction={() => {
            void restoreDoc(undo.doc, undo.blob, undo.index).then(refresh)
            setUndo(null)
          }}
          onDismiss={() => setUndo(null)}
        />
      ) : null}
    </Screen>
  )
}
