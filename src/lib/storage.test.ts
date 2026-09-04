/**
 * A escrita do orcamento e' adiada de proposito — e' o que tira o arrasto do
 * slider. Estes testes prendem as tres promessas que isso obriga a manter:
 * coalescer, descarregar, e nao ressuscitar o que foi apagado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BUDGET_KEY,
  SCHEMA_VERSION,
  clearBudgetStorage,
  defaultBudget,
  flushBudget,
  loadBudget,
  saveBudget,
} from './storage'

const orcamento = (rendimento: number) => ({ ...defaultBudget, rendimentoMensal: rendimento })

describe('persistencia do orcamento', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    flushBudget()
    vi.useRealTimers()
  })

  it('nao toca no disco a cada chamada: um arrasto inteiro da uma escrita', () => {
    const escrever = vi.spyOn(Storage.prototype, 'setItem')
    for (let i = 1; i <= 40; i++) saveBudget(orcamento(i * 100))
    expect(escrever).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)
    expect(escrever).toHaveBeenCalledTimes(1)
    // E o que fica e' o ultimo valor, nao o primeiro.
    expect(loadBudget()?.rendimentoMensal).toBe(4000)
    escrever.mockRestore()
  })

  it('descarrega a pedido, sem esperar pelo temporizador', () => {
    saveBudget(orcamento(1234))
    expect(localStorage.getItem(BUDGET_KEY)).toBeNull()

    flushBudget()
    expect(loadBudget()?.rendimentoMensal).toBe(1234)
  })

  it('uma escrita pendente nao ressuscita dados apagados', () => {
    saveBudget(orcamento(999))
    clearBudgetStorage()

    // O tempo passa: se a escrita adiada ainda estivesse viva, voltava agora.
    vi.advanceTimersByTime(1000)
    expect(localStorage.getItem(BUDGET_KEY)).toBeNull()
    expect(loadBudget()).toBeNull()
  })

  it('esconder a app leva ao disco o que estava pendente', () => {
    saveBudget(orcamento(777))
    // O Safari de iOS despacha isto quando a app vai para tras; e' a ultima
    // oportunidade que ha' de escrever.
    window.dispatchEvent(new Event('pagehide'))
    expect(loadBudget()?.rendimentoMensal).toBe(777)
  })
})

describe('migração dos custos do mês para gastos', () => {
  beforeEach(() => localStorage.clear())

  it('um orçamento gravado na v2 ganha a lista vazia, sem perder nada', () => {
    localStorage.setItem(
      BUDGET_KEY,
      JSON.stringify({
        version: 2,
        budget: {
          rendimentoMensal: 240000,
          extras: 0,
          modoDespesas: 'lista',
          despesasPercentagem: 50,
          despesasFixas: [
            { id: 'f1', nome: 'Renda', valor: 75000, periodicidade: 'mensal', categoria: 'casa', ativo: true },
          ],
          alocacao: { investimentos: 10, poupanca: 10 },
          poupancaAcumulada: 264000,
          taxaAnualEsperada: 5,
          modoDiscreto: false,
        },
      }),
    )
    const lido = loadBudget()
    expect(lido?.gastos).toEqual([])
    expect(lido?.limites).toEqual({})
    expect(lido?.rendimentoMensal).toBe(240000)
    expect(lido?.despesasFixas).toHaveLength(1)
  })

  /**
   * O passo que interessa: um custo da v3 só sabia o mês. Fica no dia 1 desse
   * mês — a única coisa honesta a fazer com uma data que nunca foi guardada —
   * e continua a contar no mesmo mês, que é o que não pode mudar.
   */
  it('um custo da v3 vira um gasto no dia 1 do mês dele', () => {
    localStorage.setItem(
      BUDGET_KEY,
      JSON.stringify({
        version: 3,
        budget: {
          ...defaultBudget,
          gastos: undefined,
          custosDoMes: [
            { id: 'c1', nome: 'Dentista', valor: 12000, mes: '2026-08' },
            { id: 'c2', nome: 'Multa', valor: 6000, mes: '2026-09' },
          ],
        },
      }),
    )
    const lido = loadBudget()
    expect(lido?.gastos).toEqual([
      { id: 'c1', descricao: 'Dentista', valor: 12000, categoria: 'outros', data: '2026-08-01' },
      { id: 'c2', descricao: 'Multa', valor: 6000, categoria: 'outros', data: '2026-09-01' },
    ])
    // E o campo antigo não fica para trás a duplicar o mesmo dinheiro.
    expect((lido as unknown as { custosDoMes?: unknown }).custosDoMes).toBeUndefined()
  })

  it('um gasto sem dia válido é descartado: não pertence a período nenhum', () => {
    localStorage.setItem(
      BUDGET_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        budget: {
          ...defaultBudget,
          gastos: [
            { id: 'g1', descricao: 'Jantar', valor: 1990, categoria: 'alimentacao', data: '2026-09-03' },
            { id: 'g2', descricao: 'Sem dia', valor: 5000, categoria: 'outros' },
            { id: 'g3', descricao: 'Dia torto', valor: 5000, categoria: 'outros', data: '2026-9-3' },
            { id: 'g4', descricao: 'Sem valor', categoria: 'outros', data: '2026-09-04' },
          ],
        },
      }),
    )
    expect(loadBudget()?.gastos).toEqual([
      { id: 'g1', descricao: 'Jantar', valor: 1990, categoria: 'alimentacao', data: '2026-09-03' },
    ])
  })

  it('a fatura de um gasto sobrevive ao disco: o bilhete tem de voltar inteiro', () => {
    // O blob vive no IndexedDB; o que passa por aqui e' so' a chave que lhe
    // chama. Se o `coerce` a deixasse cair, o ficheiro continuava la' e mais
    // ninguem saberia dele — um orfao invisivel.
    const comFatura = {
      ...defaultBudget,
      gastos: [
        {
          id: 'g1',
          descricao: 'Oficina',
          valor: 8450,
          categoria: 'transportes' as const,
          data: '2026-09-04',
          fatura: {
            nome: 'talao.png',
            tipo: 'image/png',
            tamanho: 44_000,
            blobKey: 'fatura.abc-123',
          },
        },
        // O vizinho sem fatura tem de continuar sem ela, e nao ganhar uma vazia.
        {
          id: 'g2',
          descricao: 'Café',
          valor: 90,
          categoria: 'alimentacao' as const,
          data: '2026-09-04',
        },
      ],
    }
    saveBudget(comFatura)
    flushBudget()

    const lido = loadBudget()
    expect(lido?.gastos[0].fatura).toEqual(comFatura.gastos[0].fatura)
    expect(lido?.gastos[1].fatura).toBeUndefined()
  })

  it('a ida e volta pelo disco preserva os gastos e os limites', () => {
    saveBudget({
      ...defaultBudget,
      gastos: [{ id: 'g1', descricao: 'Multa', valor: 6000, categoria: 'outros', data: '2026-10-02' }],
      limites: { alimentacao: 30000 },
    })
    flushBudget()
    const lido = loadBudget()
    expect(lido?.gastos).toEqual([
      { id: 'g1', descricao: 'Multa', valor: 6000, categoria: 'outros', data: '2026-10-02' },
    ])
    expect(lido?.limites).toEqual({ alimentacao: 30000 })
  })
})
