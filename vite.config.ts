import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Two standalone build entries: the landing page (index.html) and the validator
// dashboard (dashboard.html). Keeping them separate keeps ECharts and other
// dashboard-only deps out of the landing-page bundle.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // ECharts is a deliberate ~520kB chunk, code-split behind React.lazy so it loads on
    // demand (charts are below the fold) and never touches the landing page. That is the
    // real optimization; raise the size-warning ceiling above it so the expected large
    // vendor chunk does not flag every build.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
      },
    },
  },
})
