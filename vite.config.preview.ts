import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/** Build behind `npm run preview:build` e `npm run offline`: no PWA, one
 *  entry, nothing inlined by Vite because `scripts/preview-single-file.mjs`
 *  inlines it all itself. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '.tmp/preview-build',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: 'preview.html',
      // A app divide os ecras em pedacos, que aqui nao ha' onde ir buscar:
      // isto e' um ficheiro so', aberto de um artifact ou do proprio
      // telemovel. Tudo vem dentro do mesmo <script>.
      output: { inlineDynamicImports: true },
    },
  },
})
