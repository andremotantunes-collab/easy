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

// Maskable icons are cropped to a safe circle, so the mark sits at 60% and the
// teal ground bleeds to the edges.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0F766E"/>
  <circle cx="256" cy="248" r="118" fill="none" stroke="#FFFFFF" stroke-width="48"
          stroke-linecap="round" stroke-dasharray="540 201" transform="rotate(-90 256 248)"/>
  <circle cx="360" cy="345" r="27" fill="#FFFFFF"/>
</svg>`

const browser = await launch()
try {
  for (const size of [192, 512]) {
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
