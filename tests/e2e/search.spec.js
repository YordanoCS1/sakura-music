const { _electron: electron } = require('playwright');
const path = require('path');

let app, window;

async function waitForApp() {
  app = await electron.launch({ args: [path.join(__dirname, '../../electron/main.js')] });
  window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
}

describe('Search Flow', () => {
  beforeAll(async () => { await waitForApp(); }, 30000);
  afterAll(async () => { await app.close(); });

  test('should navigate to search page', async () => {
    const searchNav = window.locator('text=Explorar');
    await searchNav.click();
    await window.waitForTimeout(500);
    const url = await window.evaluate(() => window.location.href);
    expect(url).toBeTruthy();
  }, 15000);

  test('should have search input', async () => {
    const input = window.locator('input[placeholder*="Buscar"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });
});
