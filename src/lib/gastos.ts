/**
 * Tudo o que se sabe fazer com uma lista de gastos, sem React e sem o DOM.
 *
 * Três trabalhos: adivinhar a categoria a partir do que se escreveu, somar por
 * período, e montar a série que o gráfico desenha. São funções puras porque é
 * a única maneira de as prender com testes — e um erro de soma aqui é um erro
 * no número que a app existe para mostrar.
 */
import { diaDe, mesDe } from './format'
import type { Gasto, GastoCategoria, Money } from './types'

export const CATEGORIAS_GASTO: GastoCategoria[] = [
  'alimentacao',
  'transportes',
  'casa',
  'saude',
  'lazer',
  'compras',
  'outros',
]

/** Sem acentos e em minúsculas: quem escreve depressa escreve "cafe". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * As palavras que decidem a categoria. Não é uma tentativa de perceber
 * português — é uma lista de coisas que se escrevem mesmo no telemóvel,
 * ordenada da categoria mais provável para a menos.
 *
 * A sugestão é só isso: o campo fica pré-escolhido e muda-se com um toque.
 */
const PALAVRAS: [GastoCategoria, string[]][] = [
  [
    'alimentacao',
    ['jantar', 'almoco', 'almoço', 'cafe', 'café', 'restaurante', 'supermercado', 'mercado',
     'continente', 'pingo', 'lidl', 'aldi', 'auchan', 'minipreco', 'padaria', 'pastelaria',
     'comida', 'pizza', 'sushi', 'hamburguer', 'lanche', 'brunch', 'takeaway', 'take away',
     'uber eats', 'glovo', 'bolt food', 'bebidas', 'cerveja'],
  ],
  [
    'transportes',
    ['gasolina', 'gasoleo', 'combustivel', 'uber', 'bolt', 'taxi', 'metro', 'comboio', 'cp',
     'autocarro', 'carris', 'portagem', 'via verde', 'estacionamento', 'parquimetro', 'parque',
     'oficina', 'pneus', 'inspecao', 'passe'],
  ],
  [
    'casa',
    ['renda', 'luz', 'agua', 'eletricidade', 'gas', 'internet', 'condominio', 'ikea', 'moveis',
     'limpeza', 'obras', 'ferramentas', 'jardim'],
  ],
  [
    'saude',
    ['farmacia', 'medico', 'dentista', 'consulta', 'analises', 'ginasio', 'oculos', 'lentes',
     'fisioterapia', 'psicologo', 'vacina', 'urgencia'],
  ],
  [
    'lazer',
    ['cinema', 'concerto', 'netflix', 'spotify', 'hbo', 'disney', 'viagem', 'hotel', 'ferias',
     'bilhete', 'festival', 'livro', 'jogo', 'playstation', 'steam', 'museu', 'teatro'],
  ],
  [
    'compras',
    ['roupa', 'sapatos', 'tenis', 'zara', 'hm', 'amazon', 'telemovel', 'telefone', 'portatil',
     'computador', 'auscultadores', 'presente', 'prenda', 'perfume', 'cabeleireiro'],
  ],
]

/**
 * A categoria que a descrição sugere. Sem correspondência, "outros" — que é
 * uma resposta honesta, ao contrário de adivinhar.
 */
export function categoriaSugerida(descricao: string): GastoCategoria {
  const texto = normalizar(descricao)
  if (!texto.trim()) return 'outros'
  for (const [categoria, palavras] of PALAVRAS) {
    for (const palavra of palavras) {
      const alvo = normalizar(palavra)
      // Fronteira de palavra à mão: "cafe" apanha "café da manhã" mas não
      // apanha "cafeteira" a meio de outra palavra.
      const i = texto.indexOf(alvo)
      if (i === -1) continue
      const antes = i === 0 ? ' ' : texto[i - 1]
      const depois = texto[i + alvo.length] ?? ' '
      if (!/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois)) return categoria
    }
  }
  return 'outros'
}

export const gastosDoMes = (gastos: Gasto[], mes: string): Gasto[] =>
  gastos.filter((g) => g.data.slice(0, 7) === mes)

const soma = (gastos: Gasto[]): Money => gastos.reduce((s, g) => s + g.valor, 0)

/** Do mais recente para trás, que é a ordem por que se procura um gasto. */
export function porDia(gastos: Gasto[]): { dia: string; gastos: Gasto[]; total: Money }[] {
  const mapa = new Map<string, Gasto[]>()
  for (const g of gastos) {
    const lista = mapa.get(g.data) ?? []
    lista.push(g)
    mapa.set(g.data, lista)
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, lista]) => ({ dia, gastos: lista, total: soma(lista) }))
}

export function porCategoria(
  gastos: Gasto[],
): { categoria: GastoCategoria; total: Money }[] {
  const mapa = new Map<GastoCategoria, Money>()
  for (const g of gastos) mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.valor)
  return CATEGORIAS_GASTO.filter((c) => mapa.has(c))
    .map((c) => ({ categoria: c, total: mapa.get(c)! }))
    .sort((a, b) => b.total - a.total)
}

// ---------------------------------------------------------------------------
// Períodos
// ---------------------------------------------------------------------------

export type Periodo = '7dias' | '30dias' | '12meses' | 'anos' | 'tudo'

export const PERIODOS: Periodo[] = ['7dias', '30dias', '12meses', 'anos', 'tudo']

export type Ponto = {
  /** 'aaaa-mm-dd', 'aaaa-mm' ou 'aaaa', conforme o passo do período. */
  chave: string
  etiqueta: string
  valor: Money
}

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'aaaa-mm-dd' -> Date local, sem passar por UTC. */
function comoData(dia: string): Date {
  return new Date(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)))
}

function somarPorChave(gastos: Gasto[], tamanho: number): Map<string, Money> {
  const mapa = new Map<string, Money>()
  for (const g of gastos) {
    const chave = g.data.slice(0, tamanho)
    mapa.set(chave, (mapa.get(chave) ?? 0) + g.valor)
  }
  return mapa
}

/**
 * A série que o gráfico desenha.
 *
 * Os buracos são preenchidos com zero de propósito: um dia sem gastos é um
 * ponto a zero, não um ponto que não existe. Sem isso a linha ligava
 * segunda-feira a quinta-feira como se quarta não tivesse acontecido, e o
 * gráfico mentia sobre o ritmo.
 */
export function serie(gastos: Gasto[], periodo: Periodo, hoje = new Date()): Ponto[] {
  if (periodo === '7dias' || periodo === '30dias') {
    const quantos = periodo === '7dias' ? 7 : 30
    const porDiaMapa = somarPorChave(gastos, 10)
    const pontos: Ponto[] = []
    for (let i = quantos - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i)
      const chave = diaDe(d)
      pontos.push({
        chave,
        etiqueta: quantos === 7 ? DIAS_CURTOS[d.getDay()] : String(d.getDate()),
        valor: porDiaMapa.get(chave) ?? 0,
      })
    }
    return pontos
  }

  if (periodo === '12meses') {
    const porMes = somarPorChave(gastos, 7)
    const pontos: Ponto[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const chave = mesDe(d)
      pontos.push({ chave, etiqueta: MESES_CURTOS[d.getMonth()], valor: porMes.get(chave) ?? 0 })
    }
    return pontos
  }

  if (gastos.length === 0) return []

  if (periodo === 'anos') {
    const porAno = somarPorChave(gastos, 4)
    const primeiro = Number([...porAno.keys()].sort()[0])
    const ultimo = hoje.getFullYear()
    const pontos: Ponto[] = []
    for (let ano = primeiro; ano <= ultimo; ano++) {
      const chave = String(ano)
      pontos.push({ chave, etiqueta: chave, valor: porAno.get(chave) ?? 0 })
    }
    return pontos
  }

  // 'tudo': por mês, do primeiro registo até hoje.
  const porMes = somarPorChave(gastos, 7)
  const primeiro = [...porMes.keys()].sort()[0]
  const inicio = comoData(`${primeiro}-01`)
  const pontos: Ponto[] = []
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  while (cursor <= fim) {
    const chave = mesDe(cursor)
    pontos.push({
      chave,
      etiqueta:
        cursor.getMonth() === 0
          ? String(cursor.getFullYear())
          : MESES_CURTOS[cursor.getMonth()],
      valor: porMes.get(chave) ?? 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return pontos
}

export type Totais = {
  hoje: Money
  semana: Money
  mes: Money
  ano: Money
  tudo: Money
}

/** Os mesmos números que o cabeçalho mostra, calculados de uma vez só. */
export function totais(gastos: Gasto[], hoje = new Date()): Totais {
  const diaHoje = diaDe(hoje)
  const mesAtual = mesDe(hoje)
  const ano = String(hoje.getFullYear())
  // "Semana" são os últimos sete dias, contando hoje — e não a semana do
  // calendário: a pergunta é "quanto gastei ultimamente", não "que dia é".
  const haSeteDias = diaDe(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6))
  return {
    hoje: soma(gastos.filter((g) => g.data === diaHoje)),
    semana: soma(gastos.filter((g) => g.data >= haSeteDias && g.data <= diaHoje)),
    mes: soma(gastos.filter((g) => g.data.slice(0, 7) === mesAtual)),
    ano: soma(gastos.filter((g) => g.data.slice(0, 4) === ano)),
    tudo: soma(gastos),
  }
}

/**
 * As chaves de ficheiro que uma lista de gastos reclama.
 *
 * Vive aqui e nao no `docs.ts` por uma razao pratica: o `docs.ts` abre o
 * IndexedDB assim que e' importado, e no `jsdom` dos testes nao ha' IndexedDB
 * nenhum. Uma regra desta importancia — e' ela que decide que ficheiros se
 * apagam — tinha de ficar num sitio onde os testes lhe chegassem.
 */
export function faturasReclamadas(gastos: Gasto[]): Set<string> {
  return new Set(gastos.map((g) => g.fatura?.blobKey).filter((k): k is string => !!k))
}
