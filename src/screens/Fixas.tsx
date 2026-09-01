import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Card, GhostButton, Label, PrimaryButton, Sheet, UndoToast } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../store/budget'
import { formatEUR } from '../lib/format'
import { copy } from '../lib/copy'
import type { FixedCategory, FixedExpense } from '../lib/types'

const CATEGORIAS: FixedCategory[] = [
  'casa', 'transportes', 'subscricoes', 'saude', 'creditos', 'outros',
]

/** Horizontal drag past the threshold reveals delete; release commits it. */
function SwipeRow({
  expense,
  onToggle,
  onDelete,
}: {
  expense: FixedExpense
  onToggle: () => void
  onDelete: () => void
}) {
  const [dx, setDx] = useState(0)
  const startX = useRef(0)
  const dragging = useRef(false)

  const THRESHOLD = 96

  return (
    <li className="relative overflow-hidden border-b border-[var(--border)] last:border-b-0">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-[var(--negative)]">
        <Trash2 size={18} strokeWidth={1.8} color="#FFFFFF" aria-hidden />
      </div>
      <div
        className="relative flex min-h-[56px] items-center gap-3 bg-[var(--bg)] py-2"
        style={{ transform: `translateX(${-dx}px)`, transition: dragging.current ? 'none' : 'transform 150ms ease-out' }}
        onPointerDown={(e) => {
          startX.current = e.clientX
          dragging.current = true
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          setDx(Math.max(0, Math.min(120, startX.current - e.clientX)))
        }}
        onPointerUp={() => {
          dragging.current = false
          if (dx > THRESHOLD) onDelete()
          setDx(0)
        }}
        onPointerCancel={() => {
          dragging.current = false
          setDx(0)
        }}
      >
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={expense.ativo}
          aria-label={expense.nome}
          className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
        >
          <span
            className="h-5 w-9 shrink-0 rounded-full p-[2px] transition-opacity duration-150"
            style={{ background: expense.ativo ? 'var(--accent)' : 'var(--surface-2)' }}
            aria-hidden
          >
            <span
              className="block h-4 w-4 rounded-full bg-white"
              style={{
                transform: expense.ativo ? 'translateX(16px)' : 'translateX(0)',
                transition: 'transform 150ms ease-out',
              }}
            />
          </span>
          <span
            className="t-body flex-1 truncate"
            style={{ opacity: expense.ativo ? 1 : 0.45 }}
          >
            {expense.nome}
          </span>
          <span
            className="t-body tnum font-semibold"
            style={{ opacity: expense.ativo ? 1 : 0.45 }}
          >
            {formatEUR(expense.valor)}
          </span>
        </button>
        <button
          onClick={onDelete}
          aria-label={`${copy.fixas.apagar} ${expense.nome}`}
          className="flex h-11 w-11 items-center justify-center text-[var(--text-muted)]"
        >
          <Trash2 size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
    </li>
  )
}

export function Fixas() {
  const { budget, set, addFixa, updateFixa, removeFixa, restoreFixa } = useBudget()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState(0)
  const [categoria, setCategoria] = useState<FixedCategory>('casa')
  const [undo, setUndo] = useState<{ expense: FixedExpense; index: number } | null>(null)

  const total = useMemo(
    () => budget.despesasFixas.reduce((s, e) => (e.ativo ? s + e.valor : s), 0),
    [budget.despesasFixas],
  )

  const grupos = useMemo(() => {
    const map = new Map<FixedCategory, FixedExpense[]>()
    for (const e of budget.despesasFixas) {
      const list = map.get(e.categoria) ?? []
      list.push(e)
      map.set(e.categoria, list)
    }
    return CATEGORIAS.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const)
  }, [budget.despesasFixas])

  const guardar = () => {
    if (!nome.trim() || valor <= 0) return
    addFixa({ nome: nome.trim(), valor, categoria, ativo: true })
    setNome('')
    setValor(0)
    setCategoria('casa')
    setSheetOpen(false)
  }

  const apagar = (e: FixedExpense) => {
    const index = budget.despesasFixas.findIndex((x) => x.id === e.id)
    removeFixa(e.id)
    setUndo({ expense: e, index })
  }

  return (
    <Screen title={copy.fixas.titulo}>
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={() => setSheetOpen(true)}
          aria-label={copy.fixas.adicionar}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)]"
        >
          <Plus size={20} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {budget.modoDespesas === 'percentagem' ? (
        <Card className="mb-3">
          <p className="t-note text-[var(--text-muted)]">{copy.fixas.modoAviso}</p>
          <GhostButton className="mt-3" onClick={() => set({ modoDespesas: 'lista' })}>
            {copy.fixas.usarLista}
          </GhostButton>
        </Card>
      ) : null}

      {budget.despesasFixas.length === 0 ? (
        <Card className="text-center">
          <p className="t-value">{copy.fixas.vazioTitulo}</p>
          <p className="t-note mt-2 text-[var(--text-muted)]">{copy.fixas.vazioFrase}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map(([cat, itens]) => (
            <section key={cat}>
              <Label className="mb-1">{copy.categorias[cat]}</Label>
              <ul>
                {itens.map((e) => (
                  <SwipeRow
                    key={e.id}
                    expense={e}
                    onToggle={() => updateFixa(e.id, { ativo: !e.ativo })}
                    onDelete={() => apagar(e)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Totals sit in a sticky footer so they stay visible while scrolling. */}
      <div
        className="sticky z-20 mt-4 rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--surface)] p-4"
        style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-baseline justify-between">
          <Label>{copy.fixas.totalMensal}</Label>
          <span className="t-title tnum">{formatEUR(total)}</span>
        </div>
        <p className="t-note mt-1 text-[var(--text-muted)]">
          {copy.fixas.totalAnual(formatEUR(total * 12))}
        </p>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={copy.fixas.adicionar}>
        <div className="space-y-3">
          <label className="block">
            <span className="t-label mb-2 block">{copy.fixas.nome}</span>
            <input
              value={nome}
              autoFocus
              placeholder={copy.fixas.nomePlaceholder}
              onChange={(e) => setNome(e.target.value)}
              className="t-value w-full rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 outline-none"
            />
          </label>
          <MoneyInput label={copy.fixas.valor} value={valor} onChange={setValor} />
          <div>
            <span className="t-label mb-2 block">{copy.fixas.categoria}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  aria-pressed={categoria === c}
                  className={
                    'min-h-[44px] rounded-full border px-4 text-sm transition-opacity duration-150 ' +
                    (categoria === c
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'border-[var(--border)] text-[var(--text)]')
                  }
                >
                  {copy.categorias[c]}
                </button>
              ))}
            </div>
          </div>
          <PrimaryButton onClick={guardar} disabled={!nome.trim() || valor <= 0}>
            {copy.fixas.guardar}
          </PrimaryButton>
        </div>
      </Sheet>

      {undo ? (
        <UndoToast
          message={copy.fixas.apagada(undo.expense.nome)}
          actionLabel={copy.fixas.desfazer}
          onAction={() => {
            restoreFixa(undo.expense, undo.index)
            setUndo(null)
          }}
          onDismiss={() => setUndo(null)}
        />
      ) : null}
    </Screen>
  )
}
