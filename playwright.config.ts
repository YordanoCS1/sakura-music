import { defineConfig, devices } from '@playwright/test';

// E2E sobre el frontend servido por Vite. Tauri se simula con un stub de IPC
// (ver e2e/app.spec.ts), así que no hace falta compilar el instalador.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  // Un worker: con más, el dev server de Vite se satura en esta máquina y
  // los tests caen por timeouts que no son fallos de la app.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:1420',
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
