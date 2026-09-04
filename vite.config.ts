import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

/**
 * O caminho onde a app fica alojada.
 *
 * Em casa e' a raiz, e e' isso que mantem o `npm run dev`, as capturas e o
 * `npm run verify` a funcionar sem prefixo nenhum. No GitHub Pages a app vive
 * dentro de /easy/, e e' so' ai' que o prefixo entra — por variavel de
 * ambiente, para nao contaminar tudo o resto.
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        // Everything the app needs is precached: it must run offline after the
        // first load, and it never talks to the network at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: base + 'index.html',
      },
      manifest: {
        name: 'Easy.',
        short_name: 'Easy.',
        description: 'Quanto tens, mesmo, para gastar este mes.',
        lang: 'pt-PT',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F8FC',
        theme_color: '#0066E0',
        // Relativos ao manifesto, que fica ao lado do index.html: assim o
        // mesmo ficheiro serve na raiz e dentro de /easy/.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
