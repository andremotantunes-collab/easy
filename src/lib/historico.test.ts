import { describe, expect, it } from 'vitest'
import { comoBreakdown, historicoVazio, mesDe, poupadoAte, virarMes } from './historico'
import { useHistorico } from '../store/historico'
import type { Breakdown } from './finance'

const b: Breakdown = {
  rendimentoTotal: 240000,
  despesasFixas: 108000,
  gastos: 0,
  investimentos: 24000,
  poupanca: 24000,
  sobras: 84000,
  emDefice: false,
}

describe('virar o mês', () => {
  it('a primeira abertura não fecha nada, só marca o mês', () => {
    const r = virarMes(historicoVazio(), new Date(2026, 8, 3), b)
    expect(r.fechado).toBeNull()
    expect(r.historico.mesAberto).toBe('2026-09')
    expect(r.historico.meses).toEqual([])
  })

  it('abrir no mesmo mês não mexe em nada', () => {
    const antes = { mesAberto: '2026-09', meses: [] }
    const r = virarMes(antes, new Date(2026, 8, 28), b)
    expect(r.fechado).toBeNull()
    expect(r.historico).toBe(antes)
  })

  it('abrir no mês seguinte arquiva o que estava aberto', () => {
    const r = virarMes({ mesAberto: '2026-09', meses: [] }, new Date(2026, 9, 1), b)
    expect(r.fechado?.mes).toBe('2026-09')
    expect(r.fechado?.sobras).toBe(84000)
    expect(r.historico.mesAberto).toBe('2026-10')
    expect(r.historico.meses).toHaveLength(1)
  })

  it('três meses sem abrir arquivam UM registo, o do mês que estava aberto', () => {
    const r = virarMes({ mesAberto: '2026-09', meses: [] }, new Date(2026, 11, 14), b)
    expect(r.historico.meses.map((m) => m.mes)).toEqual(['2026-09'])
    expect(r.historico.mesAberto).toBe('2026-12')
  })

  it('atravessa a viragem do ano', () => {
    const r = virarMes({ mesAberto: '2026-12', meses: [] }, new Date(2027, 0, 1), b)
    expect(r.fechado?.mes).toBe('2026-12')
    expect(r.historico.mesAberto).toBe('2027-01')
  })

  it('fechar um mês que já está em ficheiro substitui, não duplica', () => {
    const primeiro = virarMes({ mesAberto: '2026-09', meses: [] }, new Date(2026, 9, 1), b)
    const outra = { ...primeiro.historico, mesAberto: '2026-09' }
    const segundo = virarMes(outra, new Date(2026, 9, 2), { ...b, sobras: 1 })
    expect(segundo.historico.meses).toHaveLength(1)
    expect(segundo.historico.meses[0].sobras).toBe(1)
  })

  it('guarda os meses por ordem', () => {
    let h = { mesAberto: '2026-09', meses: [] as never[] } as ReturnType<typeof historicoVazio>
    h = virarMes(h, new Date(2026, 9, 1), b).historico
    h = virarMes(h, new Date(2026, 10, 1), b).historico
    h = virarMes(h, new Date(2026, 11, 1), b).historico
    expect(h.meses.map((m) => m.mes)).toEqual(['2026-09', '2026-10', '2026-11'])
  })

  it('mesDe formata aaaa-mm com dois dígitos', () => {
    expect(mesDe(new Date(2026, 0, 9))).toBe('2026-01')
    expect(mesDe(new Date(2026, 11, 31))).toBe('2026-12')
  })
})

describe('o que os meses fechados guardaram', () => {
  const mes = (m: string, poupanca: number, investimentos: number) => ({
    mes: m, rendimentoTotal: 240000, despesasFixas: 100000, gastos: 0,
    investimentos, poupanca, sobras: 0, fechadoEm: '2026-01-01T00:00:00.000Z',
  })

  it('soma poupança e investimentos dos meses até ao escolhido', () => {
    const meses = [mes('2026-06', 22000, 22000), mes('2026-07', 24000, 24000), mes('2026-08', 24000, 24000)]
    expect(poupadoAte(meses, '2026-08')).toEqual({ total: 140000, quantos: 3 })
    expect(poupadoAte(meses, '2026-07')).toEqual({ total: 92000, quantos: 2 })
    expect(poupadoAte(meses, '2026-06')).toEqual({ total: 44000, quantos: 1 })
  })

  it('sem meses fechados não há nada guardado', () => {
    expect(poupadoAte([], '2026-09')).toEqual({ total: 0, quantos: 0 })
  })

  it('um mês anterior ao primeiro registo dá zero', () => {
    expect(poupadoAte([mes('2026-07', 24000, 24000)], '2026-05')).toEqual({ total: 0, quantos: 0 })
  })
})

describe('os gastos de um mês vão para o registo desse mês', () => {
  it('o registo guarda o que aquele mês teve de extraordinário', () => {
    const r = virarMes(
      { mesAberto: '2026-09', meses: [] },
      new Date(2026, 9, 2),
      { ...b, gastos: 15000 },
    )
    expect(r.fechado?.gastos).toBe(15000)
    expect(comoBreakdown(r.fechado!).gastos).toBe(15000)
  })

  /**
   * O caso que obrigou `abrir` a receber uma função em vez de um número: quem
   * fecha é o mês que estava aberto, e a conta que fica no registo tem de ser
   * a DELE. Com a conta de hoje, o dentista pago em outubro aparecia no
   * registo de setembro.
   */
  it('a conta arquivada é a do mês que fecha, não a de hoje', () => {
    localStorage.clear()
    useHistorico.setState({ historico: { mesAberto: '2026-09', meses: [] }, fechadoAgora: null })

    const pedidos: string[] = []
    useHistorico.getState().abrir((mes) => {
      pedidos.push(mes)
      return { ...b, gastos: mes === '2026-09' ? 15000 : 999999 }
    }, new Date(2026, 9, 2))

    expect(pedidos).toEqual(['2026-09'])
    const guardado = useHistorico.getState().historico.meses
    expect(guardado).toHaveLength(1)
    expect(guardado[0].mes).toBe('2026-09')
    expect(guardado[0].gastos).toBe(15000)
    expect(useHistorico.getState().historico.mesAberto).toBe('2026-10')
  })

  it('um registo gravado antes disto existir lê como zero', async () => {
    localStorage.clear()
    localStorage.setItem(
      'easy.historico.v1',
      JSON.stringify({
        mesAberto: '2026-09',
        meses: [{ mes: '2026-08', rendimentoTotal: 240000, despesasFixas: 100000, investimentos: 24000, poupanca: 24000, sobras: 92000, fechadoEm: '2026-09-01T10:00:00.000Z' }],
      }),
    )
    const { loadHistorico } = await import('./historico')
    expect(loadHistorico().meses[0].gastos).toBe(0)
  })
})
