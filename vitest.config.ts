import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: Vitest ships its own Vite, and mixing the
// two `defineConfig` types makes the plugin array fail to typecheck.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
