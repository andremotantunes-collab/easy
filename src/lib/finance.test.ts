import { describe, expect, it } from 'vitest'
import {
  compute, custoVidaAnual, diasAteProximoRecebimento, fundoEmergenciaMeses,
  nivelTaxaPoupanca, pesoDespesasFixas, porDia, projecao, proximoRecebimento,
  sugestoesDefice, taxaPoupanca,
} from './finance'
import type { Budget } from './types'

const base: Budget = {
  rendimentoMensal: 240000, // 2 400,00 €
  extras: 0,
  modoDespesas: 'percentagem',
  despesasPercentagem: 50,
  despesasFixas: [],
  alocacao: { investimentos: 10, poupanca: 10 },
  diaDeRecebimento: 28,
  poupancaAcumulada: 0,
  taxaAnualEsperada: 5,
}

const b = (over: Partial<Budget> = {}): Budget => ({ ...base, ...over })

describe('compute - caso normal', () => {
  it('reparte 2 400 € pelo preset Equilibrado', () => {
    const r = compute(b())
    expect(r.rendimentoTotal).toBe(240000)
    expect(r.despesasFixas).toBe(120000)
    expect(r.investimentos).toBe(24000)
    expect(r.poupanca).toBe(24000)
    expect(r.sobras).toBe(72000) // 720,00 €
    expect(r.emDefice).toBe(false)
  })

  it('soma os extras ao rendimento antes de repartir', () => {
    const r = compute(b({ extras: 60000 }))
    expect(r.rendimentoTotal).toBe(300000)
    expect(r.despesasFixas).toBe(150000)
    expect(r.sobras).toBe(90000)
  })

  it('usa a lista de despesas no modo detalhado, ignorando as inativas', () => {
    const r = compute(b({
      modoDespesas: 'lista',
      despesasFixas: [
        { id: '1', nome: 'Renda', valor: 75000, categoria: 'casa', ativo: true },
        { id: '2', nome: 'Carro', valor: 18000, categoria: 'transportes', ativo: true },
        { id: '3', nome: 'Ginásio', valor: 4000, categoria: 'saude', ativo: false },
      ],
    }))
    expect(r.despesasFixas).toBe(93000)
    expect(r.sobras).toBe(240000 - 93000 - 24000 - 24000)
  })
})

describe('compute - limites', () => {
  it('rendimento zero não rebenta nem divide por zero', () => {
    const r = compute(b({ rendimentoMensal: 0 }))
    expect(r).toMatchObject({
      rendimentoTotal: 0, despesasFixas: 0, investimentos: 0, poupanca: 0, sobras: 0,
    })
    expect(r.emDefice).toBe(false)
    expect(taxaPoupanca(r)).toBe(0)
    expect(pesoDespesasFixas(r)).toBe(0)
  })

  it('défice mantém o número negativo visível e sugere pela ordem certa', () => {
    const budget = b({ despesasPercentagem: 90, alocacao: { investimentos: 15, poupanca: 10 } })
    const r = compute(budget)
    expect(r.sobras).toBeLessThan(0)
    expect(r.emDefice).toBe(true)
    expect(r.sobras).toBe(240000 - 216000 - 36000 - 24000) // -36 000 cêntimos
    expect(sugestoesDefice(budget, r)).toEqual(['baixar-investimento', 'rever-fixas'])
  })

  it('100 % alocado deixa exatamente zero de sobras', () => {
    const r = compute(b({ despesasPercentagem: 60, alocacao: { investimentos: 25, poupanca: 15 } }))
    expect(r.sobras).toBe(0)
    expect(r.emDefice).toBe(false)
    expect(taxaPoupanca(r)).toBeCloseTo(0.4, 10)
  })
})

describe('arredondamentos', () => {
  // A soma das fatias tem de bater certo com o total, ao cêntimo, mesmo quando
  // as percentagens não dividem o rendimento de forma exata.
  const casos = [100033, 99999, 1, 123457, 333333, 700001]
  for (const rendimentoMensal of casos) {
    it(`as 4 fatias somam o total para ${rendimentoMensal} cêntimos`, () => {
      const r = compute(b({
        rendimentoMensal,
        despesasPercentagem: 33,
        alocacao: { investimentos: 33, poupanca: 33 },
      }))
      expect(r.despesasFixas + r.investimentos + r.poupanca + r.sobras)
        .toBe(r.rendimentoTotal)
    })
  }

  it('todas as fatias são inteiros de cêntimos', () => {
    const r = compute(b({ rendimentoMensal: 123457, despesasPercentagem: 37 }))
    for (const v of [r.despesasFixas, r.investimentos, r.poupanca, r.sobras]) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('dias até ao próximo recebimento', () => {
  it('conta dentro do mesmo mês', () => {
    expect(diasAteProximoRecebimento(new Date(2026, 0, 5), 28)).toBe(23)
  })

  it('fevereiro de 28 dias', () => {
    // 1/2 -> 28/2
    expect(diasAteProximoRecebimento(new Date(2026, 1, 1), 28)).toBe(27)
    // 31/1 -> 28/2 (janeiro tem 31)
    expect(diasAteProximoRecebimento(new Date(2026, 0, 31), 28)).toBe(28)
  })

  it('mês de 30 dias', () => {
    // 10/4 -> 1/5, abril tem 30
    expect(diasAteProximoRecebimento(new Date(2026, 3, 10), 1)).toBe(21)
  })

  it('mês de 31 dias', () => {
    // 5/1 -> 1/2, janeiro tem 31
    expect(diasAteProximoRecebimento(new Date(2026, 0, 5), 1)).toBe(27)
  })

  it('no próprio dia de recebimento aponta para o ciclo seguinte', () => {
    expect(diasAteProximoRecebimento(new Date(2026, 2, 28), 28)).toBe(31) // 28/3 -> 28/4
    expect(proximoRecebimento(new Date(2026, 2, 28), 28).getMonth()).toBe(3)
  })

  it('trava o dia fora do intervalo 1-28', () => {
    expect(proximoRecebimento(new Date(2026, 0, 5), 31).getDate()).toBe(28)
    expect(proximoRecebimento(new Date(2026, 0, 5), 0).getDate()).toBe(1)
  })

  it('nunca devolve menos de um dia', () => {
    expect(diasAteProximoRecebimento(new Date(2026, 0, 27), 28)).toBeGreaterThanOrEqual(1)
  })
})

describe('métricas', () => {
  it('por dia divide as sobras pelos dias que faltam', () => {
    expect(porDia(72000, 30)).toBe(2400) // 24,00 €/dia
    expect(porDia(72000, 0)).toBe(0)
  })

  it('taxa de poupança e respetivo nível', () => {
    const r = compute(b())
    expect(taxaPoupanca(r)).toBeCloseTo(0.2, 10)
    expect(nivelTaxaPoupanca(0.2)).toBe('bom')
    expect(nivelTaxaPoupanca(0.15)).toBe('medio')
    expect(nivelTaxaPoupanca(0.05)).toBe('baixo')
  })

  it('peso das despesas fixas', () => {
    expect(pesoDespesasFixas(compute(b()))).toBeCloseTo(0.5, 10)
  })

  it('fundo de emergência em meses', () => {
    expect(fundoEmergenciaMeses(288000, 120000)).toBeCloseTo(2.4, 10)
    expect(fundoEmergenciaMeses(288000, 0)).toBe(0)
  })

  it('custo de vida anual são as fixas mais o bolo, vezes 12', () => {
    expect(custoVidaAnual(compute(b()))).toBe((120000 + 72000) * 12)
  })
})

describe('juro composto', () => {
  it('bate certo com o valor conhecido de 200 €/mês a 5 % em 10 anos', () => {
    const p = projecao(20000, 5, 10)
    // 31 056,46 € - confirmado à mão a partir de FV = P·[((1+r)^n−1)/r]
    expect(p.total).toBe(3105646)
    expect(p.capital).toBe(20000 * 120)
    expect(p.juro).toBe(p.total - p.capital)
  })

  it('coincide com a acumulação mês a mês feita de forma independente', () => {
    const mensal = 20000
    const r = 0.05 / 12
    let saldo = 0
    for (let i = 0; i < 120; i++) saldo = saldo * (1 + r) + mensal
    expect(projecao(mensal, 5, 10).total).toBe(Math.round(saldo))
  })

  it('taxa zero devolve apenas o capital entregue', () => {
    const p = projecao(20000, 0, 10)
    expect(p.total).toBe(2400000)
    expect(p.juro).toBe(0)
  })

  it('entradas vazias devolvem zero', () => {
    expect(projecao(0, 5, 10)).toEqual({ total: 0, capital: 0, juro: 0 })
    expect(projecao(20000, 5, 0)).toEqual({ total: 0, capital: 0, juro: 0 })
  })
})
