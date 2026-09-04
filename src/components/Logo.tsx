const CAMINHO = 'M 39.83 26.89 A 8 6.45 0 1 0 32 32 A 8 6.45 0 1 1 24.17 37.11'

/**
 * A marca: S. — num azulejo lavado com as cores da Aurora.
 *
 * O S. e' dois bojos ELIPTICOS TANGENTES em (32,32), e nao dois arcos a olho:
 * o de cima com centro (32, 25,55), o de baixo com centro (32, 38,45), ambos
 * com 8 de raio horizontal e 6,45 de raio vertical. Tangentes, a curva passa
 * o meio na horizontal e o S. nao ganha o joelho torto que arcos desenhados
 * a olho ganham sempre.
 *
 * As pontas cortam 12 graus DEPOIS do ponto mais largo de cada bojo (cada
 * bojo varre 282 graus). Fechar mais que isso — e 305 graus ja' chegava — faz
 * o S. ler-se como um 8 aos 40 px, que e' o tamanho a que ele trabalha.
 *
 * Tres regras do sistema, verificadas com o `getBBox` do proprio browser em
 * vez de contas de cabeca:
 *
 * 1. A altura de caixa e' a do sistema: a tinta corre de 16 a 48 num quadrado
 *    de 64. Duas marcas do mesmo sistema nao podem ter alturas diferentes.
 * 2. E' centrada nos limites do TRACO e nao do caminho: com 6,2 de espessura
 *    a tinta corre de 20,90 a 43,10 — centro exato de 64. O S. e' mais
 *    estreito do que uma caixa quadrada pediria, que e' o que um S. e'.
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
