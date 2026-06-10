import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

let app: ElectronApplication;
let window: Page;

async function waitForApp() {
  app = await electron.launch({ args: [path.join(__dirname, '../../electron/main.js')] });
  window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(1000);
}

describe('Critical Flows', () => {
  beforeAll(async () => { await waitForApp(); }, 30000);
  afterAll(async () => { await app.close(); });

  // ── Navigation ──
  test('should render splash screen then hide it', async () => {
    const splash = window.locator('text=Sakura Music');
    await expect(splash).toBeVisible({ timeout: 5000 });
    await window.waitForTimeout(1500);
    await expect(splash).not.toBeVisible({ timeout: 5000 });
  }, 15000);

  test('should navigate to all pages', async () => {
    const pages = [
      { label: 'Explorar', heading: 'Explorar' },
      { label: 'Descargar', heading: 'Descargar' },
      { label: 'Biblioteca', heading: 'Biblioteca' },
      { label: 'Cola', heading: 'Cola' },
      { label: 'Ajustes', heading: 'Ajustes' },
    ];
    for (const { label } of pages) {
      const navBtn = window.locator('nav button', { hasText: label });
      await navBtn.click();
      await window.waitForTimeout(300);
    }
  }, 20000);

  // ── Search ──
  test('should have search input on search page', async () => {
    await window.locator('nav button', { hasText: 'Explorar' }).click();
    await window.waitForTimeout(500);
    const input = window.locator('input').first();
    await input.fill('test query');
    const value = await input.inputValue();
    expect(value).toBe('test query');
  }, 10000);

  // ── Downloader ──
  test('should have URL input on downloader page', async () => {
    await window.locator('nav button', { hasText: 'Descargar' }).click();
    await window.waitForTimeout(500);
    const urlInput = window.locator('input[placeholder*="youtube.com"]').first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });
  }, 10000);

  // ── Library ──
  test('should render library page with stats', async () => {
    await window.locator('nav button', { hasText: 'Biblioteca' }).click();
    await window.waitForTimeout(800);
    const stats = window.locator('text=Canciones').first();
    await expect(stats).toBeVisible({ timeout: 5000 });
  }, 15000);

  // ── Queue ──
  test('should render queue page with empty state', async () => {
    await window.locator('nav button', { hasText: 'Cola' }).click();
    await window.waitForTimeout(500);
    const emptyMsg = window.locator('text=No hay descargas').first();
    await expect(emptyMsg).toBeVisible({ timeout: 3000 });
  }, 10000);

  // ── Settings ──
  test('should render settings page', async () => {
    await window.locator('nav button', { hasText: 'Ajustes' }).click();
    await window.waitForTimeout(500);
    const heading = window.locator('text=Ajustes').first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  }, 10000);

  // ── Error Recovery ──
  test('should not crash on rapid navigation', async () => {
    const pages = ['Explorar', 'Descargar', 'Biblioteca', 'Cola', 'Ajustes'];
    for (let i = 0; i < 3; i++) {
      for (const label of pages) {
        await window.locator('nav button', { hasText: label }).click();
        await window.waitForTimeout(50);
      }
    }
    await window.waitForTimeout(500);
    const main = window.locator('main');
    await expect(main).toBeVisible({ timeout: 3000 });
  }, 15000);

  // ── Window Controls ──
  test('should have working window controls', async () => {
    const minimizeBtn = window.locator('button[aria-label="Minimizar"]');
    if (await minimizeBtn.isVisible()) {
      await minimizeBtn.click();
      const isMinimized = await app.evaluate(electron => electron.BrowserWindow.getAllWindows()[0]?.isMinimized());
      expect(isMinimized).toBe(true);
      await app.evaluate(electron => electron.BrowserWindow.getAllWindows()[0]?.restore());
    }
  }, 10000);
});
