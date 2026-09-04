const CAMINHO = 'M 41 19.1 L 23 19.1 L 23 44.9 L 41 44.9 M 23 32 L 36.5 32'

/**
 * A marca: E. — de Easy. — num azulejo lavado com as cores da Aurora.
 *
 * Era um S., que numa app chamada Easy. nao dizia nada a ninguem, e menos
 * ainda como atalho no ecra principal de um telemovel, ao lado do nome. O
 * desenho e' o mesmo sistema, com a letra certa.
 *
 * Tres regras, herdadas do desenho anterior e verificadas com o `getBBox` do
 * proprio browser em vez de contas de cabeca:
 *
 * 1. A letra tem a MESMA altura de caixa: a tinta corre de 16 a 48, como
 *    corria antes. Duas marcas do mesmo sistema nao podem ter alturas
 *    diferentes.
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
