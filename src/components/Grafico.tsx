import { useId } from 'react'
import type { Ponto } from '../lib/gastos'

type Props = {
  pontos: Ponto[]
  /** Formata um valor em cêntimos para o rótulo do máximo e da média. */
  eur: (cents: number) => string
  /** Lido por um leitor de ecrã, e por ninguém mais. */
  descricao: string
  /** Como se lê cada um dos dois números do topo. */
  rotulos: { media: (valor: string) => string; maximo: (valor: string) => string }
  altura?: number
}

/**
 * Gráfico de linhas dos gastos ao longo do tempo.
 *
 * O desenho vai em SVG esticado à largura do ecrã (`preserveAspectRatio` a
 * "none"), e por isso **não há uma única letra lá dentro**: texto dentro de um
 * SVG esticado sai achatado. Os rótulos são HTML por fora, onde a tipografia é
 * a mesma do resto da app. O traço leva `vector-effect` para manter a
 * espessura apesar do esticão.
 *
 * Um período sem gastos nenhuns desenha a linha encostada ao fundo em vez de
 * desaparecer: "não gastaste nada" é informação, e um gráfico vazio parece
 * avaria.
 */
export function Grafico({ pontos, eur, descricao, rotulos, altura = 132 }: Props) {
  const uid = useId().replace(/:/g, '')
  const L = 100
  const A = 60

  const valores = pontos.map((p) => p.valor)
  const maximo = Math.max(...valores, 0)
  const total = valores.reduce((s, v) => s + v, 0)
  const media = pontos.length > 0 ? total / pontos.length : 0

  // Uma escala com teto zero dividiria por zero; com um só ponto não há linha
  // para desenhar, e nesse caso a série repete-se para dar um segmento.
  const teto = maximo > 0 ? maximo : 1
  const usados = pontos.length === 1 ? [pontos[0], pontos[0]] : pontos

  const x = (i: number) => (usados.length <= 1 ? 0 : (i / (usados.length - 1)) * L)
  const y = (v: number) => A - (v / teto) * (A - 4)

  const linha = usados.map((p, i) => `${x(i).toFixed(2)},${y(p.valor).toFixed(2)}`).join(' ')
  const area = `M 0,${A} L ${linha.split(' ').join(' L ')} L ${L},${A} Z`
  const yMedia = y(media)

  // Até seis rótulos no eixo: mais do que isso e eles colidem a 390 px.
  const passo = Math.max(1, Math.ceil(pontos.length / 6))
  const eixo = pontos
    .map((p, i) => ({ ...p, i }))
    .filter(({ i }) => i % passo === 0 || i === pontos.length - 1)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        {/* Dois números sem nome são dois enigmas: o da esquerda é a linha a
            tracejado, o da direita é o pico. */}
        <span className="t-note tnum text-[var(--text-muted)]">
          {maximo > 0 ? rotulos.media(eur(Math.round(media))) : ''}
        </span>
        <span className="t-note tnum text-[var(--text-muted)]">
          {maximo > 0 ? rotulos.maximo(eur(maximo)) : ''}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${L} ${A}`}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: altura }}
        role="img"
        aria-label={descricao}
      >
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cat-custos)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--cat-custos)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-linha`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--cat-custos)" />
            <stop offset="100%" stopColor="var(--cat-custos-2)" />
          </linearGradient>
        </defs>

        {/* A média, a tracejado: é o que diz se o período está acima ou
            abaixo do costume, sem obrigar a comparar picos a olho. */}
        {maximo > 0 ? (
          <line
            x1="0"
            y1={yMedia}
            x2={L}
            y2={yMedia}
            stroke="var(--text-muted)"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <path d={area} fill={`url(#${uid}-area)`} />
        <polyline
          points={linha}
          fill="none"
          stroke={`url(#${uid}-linha)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-2 flex justify-between">
        {eixo.map((r) => (
          <span key={r.chave} className="t-note text-[11px] text-[var(--text-muted)]">
            {r.etiqueta}
          </span>
        ))}
      </div>
    </div>
  )
}
