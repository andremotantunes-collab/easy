const CAMINHO = 'M 23 19.1 L 41 19.1 L 23 44.9 L 41 44.9'

/**
 * A marca: Z. — o z de Easy. — num azulejo lavado com as cores da Aurora.
 *
 * Tres tracos e nada mais: a barra de cima, a diagonal, a barra de baixo. Um
 * Z. desenha-se com o que ja' la' estava — o mesmo caminho do E. com os pontos
 * por outra ordem — e por isso cai exatamente na mesma caixa de tinta que a
 * marca teve desde o principio.
 *
 * As juntas sao redondas como os extremos. Numa letra de tres tracos a junta
 * e' metade do que se ve': em bico, a diagonal a encontrar a barra fazia duas
 * farpas que aos 40 px se liam como sujidade.
 *
 * Tres regras do sistema, verificadas com o `getBBox` do proprio browser em
 * vez de contas de cabeca:
 *
 * 1. A altura de caixa e' a do sistema: a tinta corre de 16 a 48 num quadrado
 *    de 64. Duas marcas do mesmo sistema nao podem ter alturas diferentes.
 * 2. E' centrada nos limites do TRACO e nao do caminho: com 6,2 de espessura
 *    a tinta corre de 19,90 a 44,10 — centro exato de 64.
 * 3. O par e' centrado PELA TINTA e nao pela caixa. O ponto e' uma fracao
 *    pequena da tinta da marca, por isso desloca o equilibrio 1,5 unidades e
 *    nao as 4 e tal que uma caixa pediria. Um ponto final pendura-se; e' o
 *    que os pontos finais fazem na tipografia.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Easy."
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="marca-chao" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EDF4FF" />
          <stop offset="52%" stopColor="#EAFAFA" />
          <stop offset="100%" stopColor="#FDEDF5" />
        </linearGradient>
        {/* Luz de cima à esquerda: profundidade sem gradiente à vista. */}
        <radialGradient id="marca-luz" cx="0.28" cy="0.2" r="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="marca-letra" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#0066E0" />
          <stop offset="100%" stopColor="#0E8E9E" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="18" fill="url(#marca-chao)" />
      <rect width="64" height="64" rx="18" fill="url(#marca-luz)" />
      <g transform="translate(-1.5 0)">
        <path
          d={CAMINHO}
          fill="none"
          stroke="url(#marca-letra)"
          strokeWidth="6.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="47.8" r="3.3" fill="url(#marca-letra)" />
      </g>
      <rect
        x="0.6"
        y="0.6"
        width="62.8"
        height="62.8"
        rx="17.4"
        fill="none"
        stroke="#0B0B14"
        strokeOpacity="0.07"
      />
    </svg>
  )
}
