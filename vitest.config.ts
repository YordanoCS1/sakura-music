import { defineConfig } from 'vitest/config';

// Tests unitarios del frontend con Vitest. Las pruebas que necesiten el
// DOM irán en un proyecto aparte con el entorno `jsdom`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
