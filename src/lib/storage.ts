/**
 * Budget persistence. localStorage only — no account, no server, no network.
 * The key is a technical identifier, so the brand is lowercase and dotless here.
 */
import type { Budget, Gasto, Goal, Money } from './types'

const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Um gasto so' conta se souber quando foi e quanto foi. */
function gastoValido(g: Gasto): boolean {
  return (
    !!g &&
    typeof g.data === 'string' &&
    DIA.test(g.data) &&
    typeof g.valor === 'number' &&
    Number.isFinite(g.valor)
  )
}

/** Um objetivo so' conta se souber para onde vai. Um payload editado a mao ou
 *  vindo de uma versao anterior pode trazer lixo no lugar dele. */
function objetivoValido(o: unknown): o is Goal {
  if (!o || typeof o !== 'object') return false
  const g = o as Partial<Goal>
  return (
    typeof g.nome === 'string' &&
    typeof g.alvo === 'number' &&
    Number.isFinite(g.alvo) &&
    g.alvo > 0
  )
}

export const BUDGET_KEY = 'easy.budget.v1'
export const THEME_KEY = 'easy.theme.v1'
export const ONBOARDING_KEY = 'easy.onboarded.v1'
export const SCHEMA_VERSION = 4

export const defaultBudget: Budget = {
  rendimentoMensal: 0,
  extras: 0,
  modoDespesas: 'percentagem',
  despesasPercentagem: 50,
  despesasFixas: [],
  gastos: [],
  limites: {},
  alocacao: { investimentos: 10, poupanca: 10 },
  poupancaAcumulada: 0,
  taxaAnualEsperada: 5,
  modoDiscreto: false,
  objetivo: null,
}

type Stored = { version: number; budget: Budget }

/**
 * Schema migrations, one per version step. A new version adds a step here and
 * bumps SCHEMA_VERSION.
 */
const migrations: Record<number, (b: Budget) => Budget> = {
  // v1 -> v2: expenses gained a billing period, and the budget a discreet mode.
  1: (b) => ({
    ...b,
    modoDiscreto: b.modoDiscreto ?? false,
    despesasFixas: (b.despesasFixas ?? []).map((e) => ({
      ...e,
      periodicidade: e.periodicidade ?? 'mensal',
    })),
  }),
  // v2 -> v3: um mes passou a poder ter custos so' dele. O passo seguinte
  // converte-os, por isso aqui basta deixa'-los passar intactos.
  2: (b) => b,
  // v3 -> v4: esses custos passaram a ser gastos, com dia e categoria. Um
  // custo antigo so' sabia o mes, por isso fica no dia 1 desse mes: e' a unica
  // coisa honesta a fazer com uma data que nunca chegou a ser guardada.
  3: (b) => {
    const velho = b as Budget & { custosDoMes?: CustoAntigo[] }
    const convertidos: Gasto[] = Array.isArray(velho.custosDoMes)
      ? velho.custosDoMes.map((c) => ({
          id: c.id,
          descricao: c.nome,
          valor: c.valor,
          categoria: 'outros',
          data: c.mes + '-01',
        }))
      : []
    const { custosDoMes: _antigos, ...resto } = velho
    return { ...resto, gastos: [...convertidos, ...(velho.gastos ?? [])], limites: velho.limites ?? {} }
  },
}

/** A forma que os custos do mes tinham na v3, so' para a migracao os ler. */
type CustoAntigo = { id: string; nome: string; valor: Money; mes: string }

function migrate(stored: Stored): Budget {
  let budget = stored.budget
  for (let v = stored.version; v < SCHEMA_VERSION; v++) {
    const step = migrations[v]
    if (step) budget = step(budget)
  }
  return budget
}

/** Fills in anything a hand-edited or older payload is missing. */
function coerce(input: unknown): Budget {
  const b = (input ?? {}) as Partial<Budget>
  return {
    ...defaultBudget,
    ...b,
    alocacao: { ...defaultBudget.alocacao, ...(b.alocacao ?? {}) },
    // A hand-edited or pre-v2 payload can carry expenses without a period.
    despesasFixas: Array.isArray(b.despesasFixas)
      ? b.despesasFixas.map((e) => ({ ...e, periodicidade: e.periodicidade ?? 'mensal' }))
      : [],
    // Um gasto sem dia nao pertence a periodo nenhum, e um payload antigo ou
    // editado a mao pode nao o ter. Fora com ele, em vez de somar NaN.
    gastos: Array.isArray(b.gastos) ? b.gastos.filter(gastoValido) : [],
    limites: b.limites && typeof b.limites === 'object' ? b.limites : {},
    // Sem objetivo e' o estado normal, nao uma falha: qualquer coisa que nao
    // seja um objetivo inteiro volta a `null` em silencio.
    objetivo: objetivoValido(b.objetivo)
      ? { ...b.objetivo, criadoEm: b.objetivo.criadoEm ?? new Date().toISOString() }
      : null,
  }
}

export function loadBudget(): Budget | null {
  try {
    const raw = localStorage.getItem(BUDGET_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    if (typeof parsed?.version !== 'number') return coerce(parsed)
    return coerce(migrate(parsed))
  } catch {
    return null
  }
}

/**
 * A escrita e' adiada de proposito.
 *
 * `localStorage.setItem` e' sincrono, e um arrasto do slider chama isto a cada
 * evento de input — dezenas de vezes por segundo. Serializar o orcamento
 * inteiro e tocar no disco a cada frame e' o que fazia o cursor arrastar num
 * telemovel. Aqui so' fica a ultima versao pendente, e ela vai ao disco 250 ms
 * depois de o dedo parar.
 *
 * A promessa "um reload nao perde nada" mantem-se porque nada sai do ecra sem
 * passar por `pagehide` ou por `visibilitychange`, e ambos descarregam.
 */
let pendente: Budget | null = null
let agendada: ReturnType<typeof setTimeout> | null = null

function escrever(budget: Budget): void {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify({ version: SCHEMA_VERSION, budget }))
  } catch {
    // Private mode or a full quota: the app keeps working in memory.
  }
}

/** Leva ao disco o que estiver pendente, agora. */
export function flushBudget(): void {
  if (agendada !== null) {
    clearTimeout(agendada)
    agendada = null
  }
  if (pendente !== null) {
    escrever(pendente)
    pendente = null
  }
}

/** Esquece o que estava pendente — senao uma escrita a caminho ressuscitaria
 *  dados que o utilizador acabou de apagar. */
function descartarPendente(): void {
  if (agendada !== null) {
    clearTimeout(agendada)
    agendada = null
  }
  pendente = null
}

export function saveBudget(budget: Budget): void {
  pendente = budget
  if (agendada !== null) return
  agendada = setTimeout(() => {
    agendada = null
    if (pendente !== null) {
      escrever(pendente)
      pendente = null
    }
  }, 250)
}

if (typeof document !== 'undefined') {
  // `pagehide` e' o unico que o Safari de iOS dispara de forma fiavel quando a
  // app vai para tras; `visibilitychange` apanha o mudar de separador.
  window.addEventListener('pagehide', flushBudget)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushBudget()
  })
}

export function exportBudget(budget: Budget): string {
  return JSON.stringify({ version: SCHEMA_VERSION, budget }, null, 2)
}

export function importBudget(json: string): Budget {
  const parsed = JSON.parse(json) as Stored
  return coerce(parsed?.budget ?? parsed)
}

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function setOnboarded(done: boolean): void {
  try {
    if (done) localStorage.setItem(ONBOARDING_KEY, '1')
    else localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    // ignored
  }
}

export function clearBudgetStorage(): void {
  descartarPendente()
  try {
    localStorage.removeItem(BUDGET_KEY)
    localStorage.removeItem(ONBOARDING_KEY)
    localStorage.removeItem('easy.historico.v1')
  } catch {
    // ignored
  }
}
