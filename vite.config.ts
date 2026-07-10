import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { resolve } from 'node:path'

// Three standalone build entries: the landing page (index.html), the validator
// dashboard (dashboard.html), and the Field Notes journal (journal.html). Keeping
// them separate keeps each one's deps (ECharts on the dashboard, MDX/router on the
// journal) out of the other bundles.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // MDX must run before the React plugin so posts compile to JSX first. Frontmatter
    // (YAML at the top of each .mdx) is exported as a named `frontmatter` object.
    mdx({
      remarkPlugins: [
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'frontmatter' }],
      ],
    }),
    react(),
    tailwindcss(),
    // Dev-only: mirror the Vercel rewrite so /logs serves the journal entry locally
    // (production does this via vercel.json). Keeps local review identical to prod.
    {
      name: 'logs-dev-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? ''
          if (url === '/logs' || url.startsWith('/logs/') || url.startsWith('/logs?')) {
            req.url = '/journal.html'
          }
          next()
        })
      },
    },
  ],
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
        journal: resolve(import.meta.dirname, 'journal.html'),
      },
    },
  },
})
