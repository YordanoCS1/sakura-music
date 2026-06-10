import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    headless: true,
    viewport: { width: 1400, height: 900 },
  },
  projects: [
    {
      name: 'electron',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--no-sandbox'],
        },
      },
    },
  ],
});
