import { describe, expect, it } from 'vitest'
import { categoriaSugerida, faturasReclamadas, porCategoria, porDia, serie, totais } from './gastos'
import type { Gasto } from './types'

const g = (data: string, valor: number, descricao = 'Jantar', categoria: Gasto['categoria'] = 'alimentacao'): Gasto => ({
  id: `${data}-${descricao}-${valor}`,
  descricao,
  valor,
  categoria,
  data,
})

// 15 de setembro de 2026, uma terça-feira. Fixo, porque uma série que depende
// de "hoje" só se testa com um "hoje" que não anda.
const HOJE = new Date(2026, 8, 15)

describe('a categoria que a descrição sugere', () => {
  it('apanha as palavras óbvias', () => {
    expect(categoriaSugerida('Jantar')).toBe('alimentacao')
    expect(categoriaSugerida('jantar com a Ana')).toBe('alimentacao')
    expect(categoriaSugerida('Gasolina')).toBe('transportes')
    expect(categoriaSugerida('Farmácia')).toBe('saude')
    expect(categoriaSugerida('Netflix')).toBe('lazer')
    expect(categoriaSugerida('Renda')).toBe('casa')
    expect(categoriaSugerida('Sapatos novos')).toBe('compras')
  })

  it('não se importa com acentos nem com maiúsculas', () => {
    expect(categoriaSugerida('CAFÉ')).toBe('alimentacao')
    expect(categoriaSugerida('cafe')).toBe('alimentacao')
    expect(categoriaSugerida('Almoço')).toBe('alimentacao')
    expect(categoriaSugerida('almoco')).toBe('alimentacao')
  })

  it('não apanha uma palavra a meio de outra', () => {
    // "cafe" está dentro de "cafeteira", e uma cafeteira não é um café.
    expect(categoriaSugerida('cafeteira')).toBe('outros')
    expect(categoriaSugerida('metropolitano')).toBe('outros')
  })

  it('duas palavras batem à mais específica primeiro', () => {
    // "uber eats" é comida; "uber" sozinho é transporte.
    expect(categoriaSugerida('Uber eats')).toBe('alimentacao')
    expect(categoriaSugerida('Uber para o aeroporto')).toBe('transportes')
  })

  it('sem correspondência responde "outros", em vez de adivinhar', () => {
    expect(categoriaSugerida('')).toBe('outros')
    expect(categoriaSugerida('   ')).toBe('outros')
    expect(categoriaSugerida('xpto 42')).toBe('outros')
  })
})

describe('somas por período', () => {
  const lista = [
    g('2026-09-15', 1990),               // hoje
    g('2026-09-15', 350, 'Café'),        // hoje
    g('2026-09-12', 4500, 'Supermercado'), // há 3 dias
    g('2026-09-02', 6000, 'Multa', 'outros'), // este mês, fora dos 7 dias
    g('2026-08-20', 12000, 'Dentista', 'saude'), // mês passado
    g('2025-12-31', 9000, 'Presente', 'compras'), // ano passado
  ]

  it('conta hoje, os últimos sete dias, o mês, o ano e tudo', () => {
    const t = totais(lista, HOJE)
    expect(t.hoje).toBe(1990 + 350)
    // Sete dias contando hoje: de 9 a 15 de setembro.
    expect(t.semana).toBe(1990 + 350 + 4500)
    expect(t.mes).toBe(1990 + 350 + 4500 + 6000)
    expect(t.ano).toBe(1990 + 350 + 4500 + 6000 + 12000)
    expect(t.tudo).toBe(1990 + 350 + 4500 + 6000 + 12000 + 9000)
  })

  it('a janela de sete dias inclui o sétimo dia e exclui o oitavo', () => {
    const t = totais([g('2026-09-09', 100), g('2026-09-08', 200)], HOJE)
    expect(t.semana).toBe(100)
  })

  it('sem gastos nenhuns dá zeros e não rebenta', () => {
    expect(totais([], HOJE)).toEqual({ hoje: 0, semana: 0, mes: 0, ano: 0, tudo: 0 })
  })
})

describe('a série do gráfico', () => {
  it('7 dias dá sete pontos, o último é hoje, e os dias vazios valem zero', () => {
    const pontos = serie([g('2026-09-15', 1990), g('2026-09-13', 500)], '7dias', HOJE)
    expect(pontos).toHaveLength(7)
    expect(pontos[0].chave).toBe('2026-09-09')
    expect(pontos[6].chave).toBe('2026-09-15')
    expect(pontos[6].valor).toBe(1990)
    expect(pontos[4].valor).toBe(500)
    // Um dia sem gastos é um ponto a zero, e não um ponto que falta: sem isso
    // a linha ligava dias que não se seguem e mentia sobre o ritmo.
    expect(pontos[5].valor).toBe(0)
    expect(pontos.every((p) => typeof p.valor === 'number')).toBe(true)
  })

  it('soma dois gastos do mesmo dia num ponto só', () => {
    const pontos = serie([g('2026-09-15', 1990), g('2026-09-15', 350, 'Café')], '7dias', HOJE)
    expect(pontos[6].valor).toBe(2340)
  })

  it('30 dias dá trinta pontos e ignora o que ficou fora da janela', () => {
    const pontos = serie([g('2026-08-01', 5000), g('2026-09-15', 100)], '30dias', HOJE)
    expect(pontos).toHaveLength(30)
    expect(pontos.reduce((s, p) => s + p.valor, 0)).toBe(100)
  })

  it('12 meses acaba no mês corrente e agrupa por mês', () => {
    const pontos = serie(
      [g('2026-09-15', 100), g('2026-09-02', 200), g('2026-08-20', 300)],
      '12meses',
      HOJE,
    )
    expect(pontos).toHaveLength(12)
    expect(pontos[11].chave).toBe('2026-09')
    expect(pontos[11].valor).toBe(300)
    expect(pontos[10].chave).toBe('2026-08')
    expect(pontos[10].valor).toBe(300)
    expect(pontos[0].chave).toBe('2025-10')
  })

  it('anos vai do primeiro registo até este ano, sem saltar anos vazios', () => {
    const pontos = serie([g('2024-03-04', 100), g('2026-09-15', 200)], 'anos', HOJE)
    expect(pontos.map((p) => p.chave)).toEqual(['2024', '2025', '2026'])
    expect(pontos.map((p) => p.valor)).toEqual([100, 0, 200])
  })

  it('tudo vai mês a mês do primeiro registo até hoje', () => {
    const pontos = serie([g('2026-07-04', 100), g('2026-09-15', 200)], 'tudo', HOJE)
    expect(pontos.map((p) => p.chave)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(pontos.map((p) => p.valor)).toEqual([100, 0, 200])
  })

  it('sem gastos, os períodos de janela fixa mantêm-se e os abertos ficam vazios', () => {
    expect(serie([], '7dias', HOJE)).toHaveLength(7)
    expect(serie([], '12meses', HOJE)).toHaveLength(12)
    // Estes dois não têm princípio sem um primeiro registo: um gráfico vazio é
    // mais honesto do que um eixo inventado.
    expect(serie([], 'anos', HOJE)).toEqual([])
    expect(serie([], 'tudo', HOJE)).toEqual([])
  })

  it('atravessa a virada do ano sem se enganar', () => {
    const pontos = serie([g('2025-12-31', 100), g('2026-01-01', 200)], '12meses', new Date(2026, 0, 15))
    expect(pontos[11].chave).toBe('2026-01')
    expect(pontos[11].valor).toBe(200)
    expect(pontos[10].chave).toBe('2025-12')
    expect(pontos[10].valor).toBe(100)
  })
})

describe('agrupar para a lista', () => {
  it('por dia, do mais recente para trás, com o total de cada dia', () => {
    const dias = porDia([g('2026-09-12', 4500), g('2026-09-15', 1990), g('2026-09-15', 350, 'Café')])
    expect(dias.map((d) => d.dia)).toEqual(['2026-09-15', '2026-09-12'])
    expect(dias[0].total).toBe(2340)
    expect(dias[0].gastos).toHaveLength(2)
    expect(dias[1].total).toBe(4500)
  })

  it('por categoria, da que mais pesa para a que menos', () => {
    const cats = porCategoria([
      g('2026-09-15', 1990),
      g('2026-09-14', 12000, 'Dentista', 'saude'),
      g('2026-09-13', 350, 'Café'),
    ])
    expect(cats).toEqual([
      { categoria: 'saude', total: 12000 },
      { categoria: 'alimentacao', total: 2340 },
    ])
  })

  it('listas vazias dão listas vazias', () => {
    expect(porDia([])).toEqual([])
    expect(porCategoria([])).toEqual([])
  })
})

/**
 * Esta regra decide que ficheiros se APAGAM do disco. Um erro aqui nao da' um
 * ecra torto: da' uma fatura perdida, ou um ficheiro invisivel para sempre.
 */
describe('as faturas que um gasto reclama', () => {
  const comFatura = (id: string, chave?: string): Gasto => ({
    id,
    descricao: 'Oficina',
    valor: 8450,
    categoria: 'transportes',
    data: '2026-09-04',
    ...(chave ? { fatura: { nome: 't.png', tipo: 'image/png', tamanho: 10, blobKey: chave } } : {}),
  })

  it('reclama a chave de cada gasto que tenha fatura', () => {
    const chaves = faturasReclamadas([comFatura('a', 'fatura.1'), comFatura('b', 'fatura.2')])
    expect([...chaves].sort()).toEqual(['fatura.1', 'fatura.2'])
  })

  it('um gasto sem fatura não reclama nada, e não mete undefined no conjunto', () => {
    const chaves = faturasReclamadas([comFatura('a'), comFatura('b', 'fatura.1')])
    expect(chaves.has('fatura.1')).toBe(true)
    expect(chaves.size).toBe(1)
  })

  it('uma lista vazia reclama o conjunto vazio — e é por isso que quem varre tem de saber o que faz', () => {
    // Varrer com isto apaga TUDO. O `App.tsx` só chama a varredura depois de
    // confirmar que há mesmo um orçamento no disco; este teste está aqui para
    // que ninguém mude o retorno para «todas» a pensar que é mais seguro.
    expect(faturasReclamadas([]).size).toBe(0)
  })

  it('dois gastos a apontar ao mesmo ficheiro contam uma vez', () => {
    expect(faturasReclamadas([comFatura('a', 'fatura.1'), comFatura('b', 'fatura.1')]).size).toBe(1)
  })
})
