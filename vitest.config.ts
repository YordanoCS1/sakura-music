import { defineConfig } from 'vitest/config';

// Tests unitarios del frontend con Vitest. Por defecto el entorno es `node`;
// los archivos que necesiten DOM lo piden con `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
