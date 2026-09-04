import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { Screen } from '../components/Layout'
import { Grafico } from '../components/Grafico'
import { Bar, Card, GhostButton, Label, PrimaryButton, Sheet, UndoToast } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../store/budget'
import { compute, totalFixas } from '../lib/finance'
import {
  CATEGORIAS_GASTO,
  PERIODOS,
  categoriaSugerida,
  gastosDoMes,
  porCategoria,
  porDia,
  serie,
  totais,
} from '../lib/gastos'
import type { Periodo } from '../lib/gastos'
import { diaDe, diaPorExtenso, formatBytes, formatDate, mesDe, nomeDoMes } from '../lib/format'
import { getFaturaBlob, removeFatura, restoreFatura, saveFatura } from '../lib/docs'
import { saveBlob } from '../lib/download'
import { useEUR } from '../lib/money'
import { copy } from '../lib/copy'
import { SLICE_COLOR, SLICE_COLOR_2 } from '../lib/slices'
import type { Fatura, Gasto, GastoCategoria } from '../lib/types'

/** Uma fatura e' uma fotografia do talao ou um PDF. Nao ha' razao para abrir a
 *  galeria toda e o disco todo a alguem que quer anexar um papel. */
const TIPOS_FATURA = 'image/*,application/pdf'

/**
 * Os gastos do mês: o que está prometido às despesas fixas, e o que se foi
 * gastando dia a dia.
 *
 * O número que manda é o primeiro — quanto ainda há para gastar. Tudo o resto
 * no ecrã existe para explicar como é que ele chegou ali: o gráfico diz o
 * ritmo, as categorias dizem para onde foi, e a lista diz o quê.
 */
export function Gastos() {
  const budget = useBudget((s) => s.budget)
  const addGasto = useBudget((s) => s.addGasto)
  const updateGasto = useBudget((s) => s.updateGasto)
  const removeGasto = useBudget((s) => s.removeGasto)
  const restoreGasto = useBudget((s) => s.restoreGasto)
  const setLimite = useBudget((s) => s.setLimite)
  const navigate = useNavigate()
  const eur = useEUR()

  const agora = useMemo(() => new Date(), [])
  const mes = mesDe(agora)
  const b = useMemo(() => compute(budget, mes), [budget, mes])

  const [periodo, setPeriodo] = useState<Periodo>('7dias')
  const [aberto, setAberto] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [categoria, setCategoria] = useState<GastoCategoria>('outros')
  const [categoriaTocada, setCategoriaTocada] = useState(false)
  const [dia, setDia] = useState(() => diaDe(new Date()))
  const [undo, setUndo] = useState<{ gasto: Gasto; index: number; fatura: Blob | null } | null>(
    null,
  )
  const [limiteDe, setLimiteDe] = useState<GastoCategoria | null>(null)
  const [limiteValor, setLimiteValor] = useState(0)

  // A fatura do gasto que ainda nao existe. Fica em memoria e so' vai ao disco
  // no `guardar`: abrir a folha, escolher um ficheiro e desistir nao pode
  // deixar um blob orfao no IndexedDB para sempre.
  const [novaFatura, setNovaFatura] = useState<File | null>(null)
  const inputNova = useRef<HTMLInputElement>(null)

  // A apresentacao de um gasto que ja' existe. Guarda-se o ID e nao o objeto:
  // anexar uma fatura reescreve o gasto, e uma copia tirada na abertura
  // ficaria a mostrar o estado de antes.
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const inputDetalhe = useRef<HTMLInputElement>(null)
  const [aAnexar, setAAnexar] = useState(false)
  // Ambos guardam a CHAVE do ficheiro a que dizem respeito, e nao so' o
  // conteudo: assim o que se mostra deriva-se durante o render em vez de ser
  // limpo num efeito, e trocar de fatura nunca mostra a anterior por um frame.
  const [vista, setVista] = useState<{ chave: string; url: string; blob: Blob } | null>(null)
  const [emFalta, setEmFalta] = useState<string | null>(null)

  const doMes = useMemo(() => gastosDoMes(budget.gastos, mes), [budget.gastos, mes])
  const dias = useMemo(() => porDia(doMes), [doMes])
  const categorias = useMemo(() => porCategoria(doMes), [doMes])
  const contas = useMemo(() => totais(budget.gastos, agora), [budget.gastos, agora])
  const pontos = useMemo(
    () => serie(budget.gastos, periodo, agora),
    [budget.gastos, periodo, agora],
  )
  const fixas = useMemo(() => totalFixas(budget, b.rendimentoTotal), [budget, b.rendimentoTotal])

  const semRendimento = b.rendimentoTotal <= 0

  const detalhe = useMemo(
    () => budget.gastos.find((g) => g.id === detalheId) ?? null,
    [budget.gastos, detalheId],
  )

  /**
   * Le' o ficheiro da fatura aberta e faz-lhe um URL.
   *
   * O URL e' revogado na limpeza porque cada `createObjectURL` prende o blob
   * em memoria ate' alguem o soltar, e um ecra de gastos abre e fecha faturas
   * dezenas de vezes. O `vivo` existe porque a leitura e' assincrona: fechar a
   * folha antes de ela responder deixaria um URL a ser criado depois da
   * limpeza — e esse ninguem o revogava.
   */
  const chave = detalhe?.fatura?.blobKey ?? null
  useEffect(() => {
    const fatura = detalhe?.fatura
    if (!fatura) return
    let vivo = true
    let url: string | null = null
    void getFaturaBlob(fatura).then((blob) => {
      if (!vivo) return
      if (!blob) {
        setEmFalta(fatura.blobKey)
        return
      }
      url = URL.createObjectURL(blob)
      setVista({ chave: fatura.blobKey, url, blob })
    })
    return () => {
      vivo = false
      if (url) URL.revokeObjectURL(url)
    }
    // Só a chave importa: editar a descrição do gasto não recarrega o ficheiro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  // O que esta' mesmo em ecra: o estado guardado, mas so' se for deste ficheiro.
  const faturaVista = vista?.chave === chave ? vista : null
  const faturaEmFalta = emFalta !== null && emFalta === chave

  /** Anexa a um gasto que ja' existe: o ficheiro vai ao disco na hora, e a
   *  fatura que la' estivesse e' apagada em vez de ficar a ocupar espaco. */
  const anexar = async (gasto: Gasto, file: File | undefined) => {
    if (!file) return
    setAAnexar(true)
    try {
      const fatura = await saveFatura(file)
      await removeFatura(gasto.fatura)
      updateGasto(gasto.id, { fatura })
    } finally {
      setAAnexar(false)
    }
  }

  const tirarFatura = async (gasto: Gasto) => {
    await removeFatura(gasto.fatura)
    updateGasto(gasto.id, { fatura: undefined })
  }

  const guardar = async () => {
    if (!descricao.trim() || valor <= 0) return
    let fatura: Fatura | undefined
    if (novaFatura) {
      setAAnexar(true)
      try {
        fatura = await saveFatura(novaFatura)
      } finally {
        setAAnexar(false)
      }
    }
    addGasto({ descricao: descricao.trim(), valor, categoria, data: dia, fatura })
    setDescricao('')
    setValor(0)
    setCategoria('outros')
    setCategoriaTocada(false)
    setDia(diaDe(new Date()))
    setNovaFatura(null)
    setAberto(false)
  }

  const fecharNovo = () => {
    setNovaFatura(null)
    setAberto(false)
  }

  const escrever = (texto: string) => {
    setDescricao(texto)
    // A categoria segue o que se escreve até alguém lhe tocar. A partir daí é
    // uma escolha, e uma escolha não se desfaz sozinha à tecla seguinte.
    if (!categoriaTocada) setCategoria(categoriaSugerida(texto))
  }

  /**
   * Apagar um gasto apaga a fatura dele — senao o ficheiro ficava no disco sem
   * ninguem que soubesse dele, invisivel e para sempre. Mas o blob e' lido
   * ANTES, e guardado no desfazer: um toque em «Desfazer» tem de trazer o
   * papel de volta, e nao so' a linha.
   */
  const apagar = async (g: Gasto) => {
    const index = budget.gastos.findIndex((x) => x.id === g.id)
    const blob = g.fatura ? ((await getFaturaBlob(g.fatura)) ?? null) : null
    await removeFatura(g.fatura)
    removeGasto(g.id)
    if (detalheId === g.id) setDetalheId(null)
    setUndo({ gasto: g, index, fatura: blob })
  }

  const desfazerApagar = async () => {
    if (!undo) return
    if (undo.gasto.fatura && undo.fatura) await restoreFatura(undo.gasto.fatura, undo.fatura)
    restoreGasto(undo.gasto, undo.index)
    setUndo(null)
  }

  const abrirLimite = (c: GastoCategoria) => {
    setLimiteDe(c)
    setLimiteValor(budget.limites[c] ?? 0)
  }

  const totaisTopo: [string, number][] = [
    [copy.gastos.totalHoje, contas.hoje],
    [copy.gastos.totalSemana, contas.semana],
    [copy.gastos.totalMes, contas.mes],
  ]

  return (
    <Screen
      title={copy.gastos.titulo}
      right={
        <button
          onClick={() => setAberto(true)}
          aria-label={copy.gastos.novo}
          className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] active:opacity-80"
        >
          <Plus size={20} strokeWidth={2.2} aria-hidden />
        </button>
      }
    >
      {/* O número que manda: o que ainda há para gastar depois de tudo. */}
      <div className="pb-4">
        <Label>{copy.gastos.restaTitulo}</Label>
        <div
          className={b.emDefice ? 't-hero tnum mt-1' : 't-hero tnum iris mt-1'}
          style={b.emDefice ? { color: 'var(--negative)' } : undefined}
        >
          {eur(b.sobras)}
        </div>
        <p className="t-body mt-1 text-[var(--text-muted)]">
          {semRendimento ? copy.gastos.semRendimento : copy.gastos.jaGastaste(eur(contas.mes))}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {totaisTopo.map(([nome, total]) => (
          <Card key={nome} className="!p-3">
            <Label>{nome}</Label>
            <span className="t-value tnum mt-0.5 block">{eur(total)}</span>
          </Card>
        ))}
      </div>

      {/* O ritmo. As fatias de tempo são as mesmas em que se pensa: a semana,
          o mês, o ano, e a vida toda da app. */}
      <Card className="mb-4">
        {/* Em duas linhas em vez de um carrossel: cinco pastilhas não cabem
            numa linha a 390 px, e uma que fica meia escondida na margem
            parece um erro em vez de um convite a arrastar. */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                aria-pressed={periodo === p}
                className={
                  'min-h-[44px] rounded-full border px-3.5 text-[15px] transition-opacity duration-150 active:opacity-60 ' +
                  (periodo === p
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                    : 'border-[var(--border)] text-[var(--text-muted)]')
                }
              >
                {copy.gastos.periodos[p]}
              </button>
            ))}
          </div>
        </div>

        {pontos.length === 0 ? (
          <p className="t-note py-8 text-center text-[var(--text-muted)]">
            {copy.gastos.graficoVazio}
          </p>
        ) : (
          <Grafico
            pontos={pontos}
            eur={(v) => eur(v, { cents: false })}
            descricao={copy.gastos.graficoDescricao(
              copy.gastos.periodos[periodo],
              eur(pontos.reduce((s, p) => s + p.valor, 0)),
            )}
            rotulos={{ media: copy.gastos.media, maximo: copy.gastos.maximo }}
          />
        )}
      </Card>

      <Label className="mb-2">{copy.gastos.porCategoria}</Label>
      {categorias.length === 0 ? (
        <Card className="mb-4">
          <p className="t-note text-[var(--text-muted)]">{copy.gastos.semCategorias}</p>
        </Card>
      ) : (
        <Card className="mb-4">
          <ul>
            {categorias.map(({ categoria: c, total }) => {
              const limite = budget.limites[c]
              const parte = limite ? total / limite : contas.mes > 0 ? total / contas.mes : 0
              const excedeu = limite !== undefined && total > limite
              return (
                <li key={c}>
                  <button
                    onClick={() => abrirLimite(c)}
                    className="w-full py-2.5 text-left active:opacity-60"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="t-body flex-1 truncate">{copy.categoriasGasto[c]}</span>
                      <span
                        className="t-body tnum font-semibold"
                        style={excedeu ? { color: 'var(--negative)' } : undefined}
                      >
                        {eur(total)}
                      </span>
                    </span>
                    <Bar
                      className="mt-2"
                      ratio={Math.min(1, parte)}
                      color={excedeu ? 'var(--negative)' : SLICE_COLOR.gastos}
                      color2={excedeu ? 'var(--negative)' : SLICE_COLOR_2.gastos}
                    />
                    <span className="t-note mt-1 block text-[var(--text-muted)]">
                      {limite === undefined
                        ? copy.gastos.semLimite
                        : excedeu
                          ? copy.gastos.acima(eur(total - limite))
                          : `${copy.gastos.limiteDe(eur(limite))} · ${copy.gastos.restam(eur(limite - total))}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* As fixas estão aqui porque também são gastos do mês — mas já foram
          descontadas, e registá-las outra vez seria contá-las duas vezes. */}
      <Card className="mb-4">
        <div className="flex items-baseline justify-between">
          <Label>{copy.gastos.fixasTitulo}</Label>
          <span className="t-value tnum">{eur(fixas)}</span>
        </div>
        <p className="t-note mt-1 text-[var(--text-muted)]">{copy.gastos.fixasNota}</p>
        <GhostButton className="mt-3" onClick={() => navigate('/fixas')}>
          {copy.gastos.verFixas}
        </GhostButton>
      </Card>

      <Label className="mb-2 capitalize">{nomeDoMes(mes)}</Label>
      {dias.length === 0 ? (
        <Card className="text-center">
          <p className="t-value">{copy.gastos.vazioTitulo}</p>
          <p className="t-note mt-2 text-[var(--text-muted)]">{copy.gastos.vazioFrase}</p>
          <PrimaryButton className="mt-4" onClick={() => setAberto(true)}>
            {copy.gastos.novo}
          </PrimaryButton>
        </Card>
      ) : (
        <div className="space-y-4">
          {dias.map(({ dia: d, gastos, total }) => (
            <section key={d}>
              <div className="flex items-baseline justify-between">
                <Label>{diaPorExtenso(d, agora)}</Label>
                <span className="t-note tnum text-[var(--text-muted)]">{eur(total)}</span>
              </div>
              <ul>
                {gastos.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center border-b border-[var(--border)] last:border-b-0"
                  >
                    {/* A linha inteira abre o gasto. Era um bloco morto: dizia
                        o que foi e quanto, e não havia forma de lhe chegar. */}
                    <button
                      onClick={() => setDetalheId(g.id)}
                      className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 py-2 text-left active:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="t-body block truncate">{g.descricao}</span>
                        <span className="t-note flex items-center gap-1.5 text-[var(--text-muted)]">
                          {copy.categoriasGasto[g.categoria]}
                          {g.fatura ? (
                            <>
                              <Paperclip
                                size={12}
                                strokeWidth={2}
                                aria-hidden
                                className="shrink-0"
                              />
                              <span className="sr-only">{copy.gastos.temFatura}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className="t-body tnum shrink-0 font-semibold">{eur(g.valor)}</span>
                    </button>
                    <button
                      onClick={() => void apagar(g)}
                      aria-label={`${copy.gastos.apagar} ${g.descricao}`}
                      className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text-muted)]"
                    >
                      <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <GhostButton className="mt-4" onClick={() => navigate('/meses')}>
        {copy.gastos.verMeses}
      </GhostButton>

      <Sheet open={aberto} onClose={fecharNovo} title={copy.gastos.novo}>
        <div className="space-y-3">
          <label className="block">
            <span className="t-label mb-2 block">{copy.gastos.descricao}</span>
            <input
              value={descricao}
              autoFocus
              placeholder={copy.gastos.descricaoPlaceholder}
              onChange={(e) => escrever(e.target.value)}
              className="t-value w-full rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 outline-none"
            />
          </label>

          <MoneyInput label={copy.gastos.valor} value={valor} onChange={setValor} />

          <div>
            <span className="t-label mb-2 block">{copy.gastos.categoria}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategoria(c)
                    setCategoriaTocada(true)
                  }}
                  aria-pressed={categoria === c}
                  className={
                    'min-h-[44px] rounded-full border px-4 text-sm transition-opacity duration-150 ' +
                    (categoria === c
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'border-[var(--border)] text-[var(--text)]')
                  }
                >
                  {copy.categoriasGasto[c]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="t-label mb-2 block">{copy.gastos.quando}</span>
            <input
              type="date"
              value={dia}
              max={diaDe(new Date())}
              onChange={(e) => setDia(e.target.value || diaDe(new Date()))}
              className="t-value w-full rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 outline-none"
            />
          </label>

          {/* Anexar aqui, e não só depois: quem regista o jantar à mesa tem o
              talão na mão nesse momento e não volta lá amanhã. */}
          <div>
            <span className="t-label mb-2 block">{copy.gastos.fatura}</span>
            <input
              ref={inputNova}
              type="file"
              accept={TIPOS_FATURA}
              className="hidden"
              onChange={(e) => {
                setNovaFatura(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
            {novaFatura ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3">
                <Paperclip
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="t-body block truncate">{novaFatura.name}</span>
                  <span className="t-note tnum block text-[var(--text-muted)]">
                    {formatBytes(novaFatura.size)}
                  </span>
                </span>
                <button
                  onClick={() => setNovaFatura(null)}
                  aria-label={copy.gastos.tirarFatura}
                  className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text-muted)] active:opacity-60"
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
            ) : (
              <GhostButton
                className="flex items-center justify-center gap-2"
                onClick={() => inputNova.current?.click()}
              >
                <Paperclip size={18} strokeWidth={1.8} aria-hidden />
                {copy.gastos.anexarFatura}
              </GhostButton>
            )}
          </div>

          <PrimaryButton
            onClick={() => void guardar()}
            disabled={!descricao.trim() || valor <= 0 || aAnexar}
          >
            {aAnexar ? copy.gastos.aAnexar : copy.gastos.guardar}
          </PrimaryButton>
        </div>
      </Sheet>

      <Sheet
        open={limiteDe !== null}
        onClose={() => setLimiteDe(null)}
        title={limiteDe ? copy.categoriasGasto[limiteDe] : ''}
      >
        <div className="space-y-3">
          <MoneyInput
            label={copy.gastos.definirLimite}
            value={limiteValor}
            onChange={setLimiteValor}
            autoFocus
          />
          <p className="t-note text-[var(--text-muted)]">{copy.gastos.limiteAjuda}</p>
          <PrimaryButton
            onClick={() => {
              if (limiteDe) setLimite(limiteDe, limiteValor > 0 ? limiteValor : null)
              setLimiteDe(null)
            }}
          >
            {copy.gastos.guardarLimite}
          </PrimaryButton>
        </div>
      </Sheet>

      {/* A apresentação do gasto: o que foi, quanto, quando — e o papel. */}
      <Sheet
        open={detalhe !== null}
        onClose={() => setDetalheId(null)}
        title={detalhe?.descricao ?? copy.gastos.detalhe}
      >
        {detalhe ? (
          <div className="space-y-4">
            <div>
              <div className="t-hero tnum iris">{eur(detalhe.valor)}</div>
              <p className="t-note mt-1 text-[var(--text-muted)]">
                {copy.categoriasGasto[detalhe.categoria]} ·{' '}
                {formatDate(new Date(`${detalhe.data}T00:00:00`))}
              </p>
            </div>

            <input
              ref={inputDetalhe}
              type="file"
              accept={TIPOS_FATURA}
              className="hidden"
              onChange={(e) => {
                void anexar(detalhe, e.target.files?.[0])
                e.target.value = ''
              }}
            />

            <div>
              <span className="t-label mb-2 block">{copy.gastos.fatura}</span>

              {!detalhe.fatura ? (
                <div className="space-y-2">
                  <PrimaryButton
                    onClick={() => inputDetalhe.current?.click()}
                    disabled={aAnexar}
                  >
                    {aAnexar ? copy.gastos.aAnexar : copy.gastos.anexarFatura}
                  </PrimaryButton>
                  <p className="t-note text-[var(--text-muted)]">{copy.gastos.semFaturaAjuda}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Um orçamento importado traz o bilhete da fatura mas não o
                      ficheiro: os blobs não cabem no JSON. Dizer isso é melhor
                      do que uma moldura vazia sem explicação. */}
                  {faturaEmFalta ? (
                    <Card>
                      <p className="t-note text-[var(--text-muted)]">
                        {copy.gastos.faturaEmFalta}
                      </p>
                    </Card>
                  ) : detalhe.fatura.tipo.startsWith('image/') && faturaVista ? (
                    // Sem `w-full`: a moldura toma o tamanho da fotografia em
                    // vez de reservar meio ecrã em branco a um talão pequeno.
                    <img
                      src={faturaVista.url}
                      alt={detalhe.fatura.nome}
                      className="mx-auto max-h-[45dvh] max-w-full rounded-[var(--radius-sm)]"
                    />
                  ) : detalhe.fatura.tipo === 'application/pdf' && faturaVista ? (
                    <object
                      data={faturaVista.url}
                      type="application/pdf"
                      className="h-[45dvh] w-full rounded-[var(--radius-sm)]"
                      aria-label={detalhe.fatura.nome}
                    >
                      <p className="t-note text-[var(--text-muted)]">
                        {copy.gastos.faturaSemPreVisualizacao}
                      </p>
                    </object>
                  ) : faturaVista ? (
                    <Card>
                      <p className="t-note text-[var(--text-muted)]">
                        {copy.gastos.faturaSemPreVisualizacao}
                      </p>
                    </Card>
                  ) : null}

                  <p className="t-note tnum text-[var(--text-muted)]">
                    {detalhe.fatura.nome} · {formatBytes(detalhe.fatura.tamanho)}
                  </p>

                  {/* Duas ações a par, e a destrutiva sozinha e discreta: uma
                      pilha de quatro botões empurrava a fatura para fora. */}
                  <div className="grid grid-cols-2 gap-2">
                    <GhostButton
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        faturaVista && saveBlob(faturaVista.blob, detalhe.fatura!.nome)
                      }
                      disabled={!faturaVista}
                    >
                      <Download size={18} strokeWidth={1.8} aria-hidden />
                      {copy.gastos.descarregarFatura}
                    </GhostButton>
                    <GhostButton
                      className="flex items-center justify-center gap-2"
                      onClick={() => inputDetalhe.current?.click()}
                      disabled={aAnexar}
                    >
                      <Paperclip size={18} strokeWidth={1.8} aria-hidden />
                      {aAnexar ? copy.gastos.aAnexar : copy.gastos.substituirFatura}
                    </GhostButton>
                  </div>
                  <button
                    onClick={() => void tirarFatura(detalhe)}
                    disabled={aAnexar}
                    className="t-note flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[var(--negative)] active:opacity-60"
                  >
                    <X size={15} strokeWidth={2} aria-hidden />
                    {copy.gastos.tirarFatura}
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </Sheet>

      {undo ? (
        <UndoToast
          message={copy.gastos.apagado(undo.gasto.descricao)}
          actionLabel={copy.gastos.desfazer}
          onAction={() => void desfazerApagar()}
          onDismiss={() => setUndo(null)}
        />
      ) : null}
    </Screen>
  )
}
