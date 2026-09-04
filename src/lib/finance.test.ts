import { describe, expect, it } from 'vitest'
import {
  compute, gastosDe, fundoEmergenciaMeses, mensalizado, nivelTaxaPoupanca, pesoDespesasFixas,
  projecao, sugestoesDefice, taxaPoupanca, totalFixas,
} from './finance'
import type { Budget } from './types'

const base: Budget = {
  rendimentoMensal: 240000, // 2 400,00 €
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
        { id: '1', nome: 'Renda', valor: 75000, categoria: 'casa', periodicidade: 'mensal', ativo: true },
        { id: '2', nome: 'Carro', valor: 18000, categoria: 'transportes', periodicidade: 'mensal', ativo: true },
        { id: '3', nome: 'Ginásio', valor: 4000, categoria: 'saude', periodicidade: 'mensal', ativo: false },
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

describe('métricas', () => {
  it('taxa de poupança e respetivo nível', () => {
    const r = compute(b())
    expect(taxaPoupanca(r)).toBeCloseTo(0.2, 10)
    expect(nivelTaxaPoupanca(0.25)).toBe('bom')
    expect(nivelTaxaPoupanca(0.2)).toBe('bom')
    expect(nivelTaxaPoupanca(0.15)).toBe('medio')
    expect(nivelTaxaPoupanca(0.05)).toBe('baixo')
    expect(taxaPoupanca(compute(b({ rendimentoMensal: 0 })))).toBe(0)
  })

  it('peso das despesas fixas', () => {
    expect(pesoDespesasFixas(compute(b()))).toBeCloseTo(0.5, 10)
    expect(pesoDespesasFixas(compute(b({ rendimentoMensal: 0 })))).toBe(0)
  })

  it('fundo de emergência em meses', () => {
    expect(fundoEmergenciaMeses(600_00, 100_00)).toBe(6)
    expect(fundoEmergenciaMeses(0, 100_00)).toBe(0)
    expect(fundoEmergenciaMeses(500_00, 0)).toBe(0)
  })
})

describe('despesas anuais diluídas', () => {
  const anual = (valor: number) => ({
    id: 'a', nome: 'IUC', valor, categoria: 'transportes' as const,
    periodicidade: 'anual' as const, ativo: true,
  })

  it('240 €/ano contam como 20,00 €/mês', () => {
    expect(mensalizado(anual(24000))).toBe(2000)
  })

  it('uma despesa mensal entra pelo valor tal como é cobrada', () => {
    expect(mensalizado({
      id: 'm', nome: 'Renda', valor: 75000, categoria: 'casa',
      periodicidade: 'mensal', ativo: true,
    })).toBe(75000)
  })

  it('arredonda ao cêntimo e nunca devolve fração', () => {
    // 100,00 €/ano = 8,3333... €/mes
    expect(mensalizado(anual(10000))).toBe(833)
    expect(Number.isInteger(mensalizado(anual(10000)))).toBe(true)
  })

  it('o total das fixas soma os mensalizados, não os valores cobrados', () => {
    const budget = b({
      modoDespesas: 'lista',
      despesasFixas: [
        { id: 'f1', nome: 'Renda', valor: 75000, categoria: 'casa', periodicidade: 'mensal', ativo: true },
        anual(24000),
      ],
    })
    expect(totalFixas(budget, 240000)).toBe(75000 + 2000)
    expect(compute(budget).despesasFixas).toBe(77000)
  })

  it('uma despesa anual inativa não conta', () => {
    const budget = b({
      modoDespesas: 'lista',
      despesasFixas: [{ ...anual(24000), ativo: false }],
    })
    expect(totalFixas(budget, 240000)).toBe(0)
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

describe('gastos', () => {
  const gasto = (data: string, valor: number, descricao = 'Jantar') => ({
    id: `${data}-${descricao}`,
    descricao,
    valor,
    categoria: 'alimentacao' as const,
    data,
  })

  it('conta os do mês pedido e mais nenhum', () => {
    const orcamento = b({
      gastos: [
        gasto('2026-09-03', 1990),
        gasto('2026-09-28', 4510, 'Supermercado'),
        gasto('2026-08-14', 50000, 'Dentista'),
      ],
    })
    expect(gastosDe(orcamento, '2026-09')).toBe(6500)
    expect(gastosDe(orcamento, '2026-08')).toBe(50000)
    expect(gastosDe(orcamento, '2026-07')).toBe(0)
  })

  it('o mês de um gasto sai do dia, incluindo o primeiro e o último', () => {
    const orcamento = b({ gastos: [gasto('2026-09-01', 100), gasto('2026-09-30', 200)] })
    expect(gastosDe(orcamento, '2026-09')).toBe(300)
  })

  it('saem do bolo, e não do que se investe nem do que se poupa', () => {
    const semGasto = compute(b(), '2026-09')
    const comGasto = compute(b({ gastos: [gasto('2026-09-03', 1990)] }), '2026-09')

    expect(comGasto.gastos).toBe(1990)
    // O que se investe e o que se poupa não se mexem: são uma decisão, não um
    // resto. O mês tem menos para gastar, e é só isso que muda.
    expect(comGasto.investimentos).toBe(semGasto.investimentos)
    expect(comGasto.poupanca).toBe(semGasto.poupanca)
    expect(comGasto.despesasFixas).toBe(semGasto.despesasFixas)
    expect(comGasto.sobras).toBe(semGasto.sobras - 1990)
  })

  it('cada gasto novo desce o bolo exatamente o seu valor', () => {
    let orcamento = b()
    let antes = compute(orcamento, '2026-09').sobras
    for (const [i, valor] of [1990, 350, 12000, 799].entries()) {
      orcamento = b({
        gastos: [...orcamento.gastos, gasto('2026-09-1' + i, valor, 'g' + i)],
      })
      const agora = compute(orcamento, '2026-09').sobras
      expect(antes - agora).toBe(valor)
      antes = agora
    }
  })

  it('as fatias continuam a somar o total, ao cêntimo', () => {
    const r = compute(b({ rendimentoMensal: 123457, gastos: [gasto('2026-09-09', 4321)] }), '2026-09')
    expect(r.despesasFixas + r.gastos + r.investimentos + r.poupanca + r.sobras).toBe(
      r.rendimentoTotal,
    )
  })

  it('um mês caro de mais entra em défice sem contaminar os outros', () => {
    const orcamento = b({ gastos: [gasto('2026-09-09', 200000)] })
    expect(compute(orcamento, '2026-09').emDefice).toBe(true)
    expect(compute(orcamento, '2026-10').emDefice).toBe(false)
    expect(compute(orcamento, '2026-10').gastos).toBe(0)
  })

  it('sem gastos nenhuns, a conta é exatamente a de antes', () => {
    const r = compute(b(), '2026-09')
    expect(r.gastos).toBe(0)
    expect(r.sobras).toBe(240000 - 120000 - 24000 - 24000)
  })
})
