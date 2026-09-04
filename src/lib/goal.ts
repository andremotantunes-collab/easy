/**
 * A matematica do objetivo. Funcoes puras, centimos inteiros, sem React e sem
 * formatacao — quem le' o resultado e' que o escreve em portugues.
 *
 * O objetivo e' uma meta sobre `poupancaAcumulada`, que e' o UNICO pote de
 * poupanca da app. Nao ha' aqui nenhum saldo proprio do objetivo, e essa
 * ausencia e' deliberada: dois saldos podiam discordar um do outro, e a app
 * teria de escolher em qual mentir.
 */
import type { Goal, Money } from './types'

/**
 * Cinquenta anos. Acima disto uma data e' aritmeticamente correta e
 * praticamente uma piada — «Marco de 2183» nao ajuda ninguem a decidir nada, e
 * dizer «mais de 50 anos ao ritmo atual» ajuda.
 */
export const HORIZONTE_MAXIMO_MESES = 600

export type EstadoObjetivo =
  /** Ja' la' esta'. */
  | 'atingido'
  /** Nao se poupa nada por mes: o objetivo esta' parado, e nao ha' data nenhuma. */
  | 'parado'
  /** Avanca, mas tao devagar que uma data seria ruido. */
  | 'longe'
  /** O caso normal: falta X, e chega-se la' em tal mes. */
  | 'a-caminho'

export type LeituraObjetivo = {
  estado: EstadoObjetivo
  /** 0 a 1, ja' travado nos extremos. */
  progresso: number
  falta: Money
  /** `null` quando nao ha' ritmo que leve la' — nunca `Infinity`. */
  mesesQueFaltam: number | null
  /** 'aaaa-mm' do mes previsto, ou `null`. Fica em texto para o formatador da
   *  app o escrever por extenso, e para os testes nao dependerem do fuso. */
  mesPrevisto: string | null
}

/** 'aaaa-mm' de hoje mais N meses. O construtor do Date normaliza o mes 14
 *  para fevereiro do ano seguinte sozinho, e por isso nao ha' contas de ano. */
function mesDaqui(hoje: Date, meses: number): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + meses, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * O estado do objetivo, dado o pote que existe e o que lhe entra por mes.
 *
 * A ordem dos casos importa e e' esta: **atingido** ganha a tudo, porque quem
 * ja' la' chegou nao precisa de saber que nao esta' a poupar; depois **parado**,
 * porque sem ritmo nao ha' data possivel; depois **longe**, que tem meses mas
 * nao merece uma data.
 */
export function lerObjetivo(
  objetivo: Goal,
  poupancaAcumulada: Money,
  poupancaMensal: Money,
  hoje: Date = new Date(),
): LeituraObjetivo {
  const alvo = objetivo.alvo

  // Um alvo de zero ou negativo nao devia chegar aqui — o formulario nao o
  // guarda. Se chegar (ficheiro editado a mao), esta' atingido por definicao,
  // que e' melhor do que uma divisao por zero a virar `Infinity` no ecra.
  if (alvo <= 0 || poupancaAcumulada >= alvo) {
    return { estado: 'atingido', progresso: 1, falta: 0, mesesQueFaltam: null, mesPrevisto: null }
  }

  const progresso = Math.min(1, Math.max(0, poupancaAcumulada / alvo))
  const falta = alvo - poupancaAcumulada

  if (poupancaMensal <= 0) {
    return { estado: 'parado', progresso, falta, mesesQueFaltam: null, mesPrevisto: null }
  }

  // Sempre para cima: no mes a seguir ao ultimo mes inteiro e' que o dinheiro
  // la' esta'. Arredondar para baixo prometia uma data que ainda nao chegava.
  const mesesQueFaltam = Math.ceil(falta / poupancaMensal)

  if (mesesQueFaltam > HORIZONTE_MAXIMO_MESES) {
    return { estado: 'longe', progresso, falta, mesesQueFaltam, mesPrevisto: null }
  }

  return {
    estado: 'a-caminho',
    progresso,
    falta,
    mesesQueFaltam,
    mesPrevisto: mesDaqui(hoje, mesesQueFaltam),
  }
}

/** O objetivo que a app sugere quando ainda nao ha' nenhum. */
export const OBJETIVO_SUGERIDO = 'Carro'
