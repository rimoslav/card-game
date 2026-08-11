import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cg': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // Without an explicit target the CSS ships modern media-query range syntax
    // (`@media (width>=700px)`), which needs roughly Safari 16.4+. The app it replaces
    // declared a far wider browserslist, and an unparseable media feature drops the whole
    // rule — an older browser would silently get the mobile layout at every width.
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14']
  },
  test: {
    environment: 'node',
    // ?(x) matters: with a bare *.test.ts a file named *.test.tsx is silently never run,
    // and the suite still reports green.
    include: ['src/**/*.test.ts?(x)']
  }
})
