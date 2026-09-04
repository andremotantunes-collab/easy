import { describe, expect, it } from 'vitest'
import { HORIZONTE_MAXIMO_MESES, lerObjetivo } from './goal'
import { defaultBudget } from './storage'
import type { Goal } from './types'

const objetivo = (alvo: number): Goal => ({
  nome: 'Carro',
  alvo,
  criadoEm: '2026-01-01T00:00:00.000Z',
})

/** 4 de setembro de 2026, o dia em que isto foi escrito. Fixo, porque uma data
 *  prevista calculada a partir de `new Date()` muda de resultado em janeiro. */
const HOJE = new Date(2026, 8, 4)

describe('o objetivo', () => {
  it('o caso do desenho: 6 200 de 14 000, a 240 por mês', () => {
    const r = lerObjetivo(objetivo(14_000_00), 6_200_00, 240_00, HOJE)
    expect(r.estado).toBe('a-caminho')
    // 44 %, que e' o que o desenho mostra.
    expect(Math.round(r.progresso * 100)).toBe(44)
    expect(r.falta).toBe(7_800_00)
    // 7 800 / 240 = 32,5 -> 33 meses.
    expect(r.mesesQueFaltam).toBe(33)
    // Setembro de 2026 + 33 meses = junho de 2029.
    expect(r.mesPrevisto).toBe('2029-06')
  })

  it('os meses arredondam sempre PARA CIMA: meio mês a faltar ainda é um mês', () => {
    // 100 a faltar, 99 por mes: 1,01 meses. Um mes nao chega.
    expect(lerObjetivo(objetivo(100_00), 0, 99_00, HOJE).mesesQueFaltam).toBe(2)
    // E um numero redondo nao ganha um mes a mais por causa do teto.
    expect(lerObjetivo(objetivo(100_00), 0, 50_00, HOJE).mesesQueFaltam).toBe(2)
  })

  it('sem poupança mensal devolve null, e nunca Infinity', () => {
    const r = lerObjetivo(objetivo(14_000_00), 6_200_00, 0, HOJE)
    expect(r.estado).toBe('parado')
    expect(r.mesesQueFaltam).toBeNull()
    expect(r.mesPrevisto).toBeNull()
    // O progresso continua a contar: o dinheiro que la' esta' nao desaparece
    // por o plano ter parado.
    expect(Math.round(r.progresso * 100)).toBe(44)
    expect(r.falta).toBe(7_800_00)
  })

  it('alvo igual ao acumulado está atingido, e não quase', () => {
    const r = lerObjetivo(objetivo(14_000_00), 14_000_00, 240_00, HOJE)
    expect(r.estado).toBe('atingido')
    expect(r.progresso).toBe(1)
    expect(r.falta).toBe(0)
    expect(r.mesPrevisto).toBeNull()
  })

  it('acumulado acima do alvo não passa dos 100 % nem devolve falta negativa', () => {
    const r = lerObjetivo(objetivo(10_000_00), 25_000_00, 240_00, HOJE)
    expect(r.estado).toBe('atingido')
    expect(r.progresso).toBe(1)
    expect(r.falta).toBe(0)
  })

  it('atingido ganha a parado: quem já lá chegou não precisa de saber que parou', () => {
    expect(lerObjetivo(objetivo(10_000_00), 10_000_00, 0, HOJE).estado).toBe('atingido')
  })

  it('acima de 50 anos ao ritmo atual não inventa uma data', () => {
    // 601 meses a 100 euros: 60 100 euros a faltar.
    const r = lerObjetivo(objetivo(60_100_00), 0, 100_00, HOJE)
    expect(r.mesesQueFaltam).toBe(HORIZONTE_MAXIMO_MESES + 1)
    expect(r.estado).toBe('longe')
    expect(r.mesPrevisto).toBeNull()
    // E' o limite, e nao um arredondamento: 600 meses certos ainda dão data.
    const limite = lerObjetivo(objetivo(60_000_00), 0, 100_00, HOJE)
    expect(limite.mesesQueFaltam).toBe(HORIZONTE_MAXIMO_MESES)
    expect(limite.estado).toBe('a-caminho')
    expect(limite.mesPrevisto).toBe('2076-09')
  })

  it('um alvo de zero não divide por zero: fica atingido em vez de Infinity', () => {
    const r = lerObjetivo(objetivo(0), 0, 240_00, HOJE)
    expect(r.estado).toBe('atingido')
    expect(Number.isFinite(r.progresso)).toBe(true)
    expect(r.progresso).toBe(1)
  })

  it('a data atravessa o virar do ano sem contas de ano à mão', () => {
    // Novembro + 3 meses = fevereiro do ano seguinte.
    const novembro = new Date(2026, 10, 20)
    const r = lerObjetivo(objetivo(300_00), 0, 100_00, novembro)
    expect(r.mesPrevisto).toBe('2027-02')
  })
})

describe('remover o objetivo não mexe no dinheiro', () => {
  it('o pote é um campo à parte: apagar a meta não apaga o saldo', () => {
    // A meta e o pote vivem em campos diferentes do orcamento de proposito.
    // Este teste prende essa separacao: se alguem um dia guardasse o saldo
    // dentro do `Goal`, apagar a meta apagava o dinheiro — e este teste cai.
    const com = { ...defaultBudget, poupancaAcumulada: 6_200_00, objetivo: objetivo(14_000_00) }
    const sem = { ...com, objetivo: null }
    expect(sem.poupancaAcumulada).toBe(6_200_00)
    expect(Object.keys(objetivo(1))).not.toContain('poupancaAcumulada')
  })
})
