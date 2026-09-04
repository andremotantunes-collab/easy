/**
 * Renders the PWA icons from the same SVG mark as the favicon, using the
 * Chromium that is already installed for the screenshots. No image library,
 * no binary assets checked in by hand.
 *
 * Run: npm run icons
 */
import { launch } from './browser.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// Same drawing as the favicon and the in-app mark, scaled by 8: o S. da marca,
// dois bojos elipticos tangentes no centro. A letra e' centrada nos limites do
// traco e nao do caminho, e o par e' equilibrado pela tinta, para sobreviver ao
// corte circular de um icone maskable sem parecer torto.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="chao" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EDF4FF"/>
      <stop offset="52%" stop-color="#EAFAFA"/>
      <stop offset="100%" stop-color="#FDEDF5"/>
    </linearGradient>
    <radialGradient id="luz" cx="0.28" cy="0.2" r="0.9">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="letra" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="#0066E0"/>
      <stop offset="100%" stop-color="#0E8E9E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#chao)"/>
  <rect width="512" height="512" fill="url(#luz)"/>
  <g transform="translate(-12 0)">
    <path d="M 318.64 215.12 A 64 51.6 0 1 0 256 256 A 64 51.6 0 1 1 193.36 296.88"
          fill="none" stroke="url(#letra)" stroke-width="49.6"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="400" cy="382.4" r="26.4" fill="url(#letra)"/>
  </g>
</svg>`

const browser = await launch()
try {
  // 180 e' a medida que o iOS pede para o icone do atalho no ecra principal;
  // 192 e 512 sao as do manifesto, para o Android e para a loja de atalhos.
  for (const size of [180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(
      `<body style="margin:0">${svg(size)}</body>`,
      { waitUntil: 'load' },
    )
    const buffer = await page.screenshot({ omitBackground: false })
    writeFileSync(join(OUT, `icon-${size}.png`), buffer)
    await page.close()
    console.log(`icon-${size}.png`)
  }
} finally {
  await browser.close()
}
