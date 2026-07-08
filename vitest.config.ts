import { defineConfig } from 'vitest/config'

// The parse seam (parseSnapshot / parseHistory) is pure, so tests run in a plain node
// environment with no DOM. JSON fixtures are imported directly (Vite resolves them).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
