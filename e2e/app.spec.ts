import { expect, test } from '@playwright/test';

// En el navegador no existe el bridge de Tauri. Lo simulamos para que los
// efectos de arranque reciban respuestas válidas y la prueba se centre en la UI.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const callbacks = new Map<number, (data: unknown) => void>();
    let siguienteId = 1;
    const respuestas: Record<string, unknown> = {
      check_downloader_tools: {
        ytdlp_available: false,
        ffmpeg_available: false,
        ytdlp_path: null,
        ffmpeg_path: null,
      },
      get_cached_library: [],
      get_app_info: {
        engine: 'Tauri 2.0 + Rust Engine',
        rust_version: 'rustc (e2e)',
        memory_usage: '—',
        tracks_loaded: 0,
      },
      get_default_music_dir: null,
      get_download_queue: [],
      tools_status: [],
    };
    const internals = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (cmd: string, args?: unknown) => Promise<unknown>;
        transformCallback: (cb: (data: unknown) => void) => number;
        unregisterCallback: (id: number) => void;
        convertFileSrc: (path: string) => string;
        metadata: { currentWindow: { label: 'main' } };
      };
    };
    (
      window as unknown as {
        __TAURI_EVENT_PLUGIN_INTERNALS__: { unregisterListener: () => void };
      }
    ).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    internals.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async (cmd) => respuestas[cmd] ?? null,
      transformCallback: (cb) => {
        const id = siguienteId++;
        callbacks.set(id, cb);
        return id;
      },
      unregisterCallback: (id) => callbacks.delete(id),
      convertFileSrc: (path) => path,
    };
  });
});

test('la app arranca, oculta el splash y navega entre pestañas', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('tab', { name: /Biblioteca/ })).toBeVisible();
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const buscar = page.getByRole('tab', { name: /Buscar/ });
  await buscar.click();
  await expect(buscar).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByPlaceholder('Buscar en tu música...')).toBeVisible();

  const ajustes = page.getByRole('tab', { name: /Ajustes/ });
  await ajustes.click();
  await expect(ajustes).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/Motor Nativo Tauri/)).toBeVisible();

  const mini = page.getByRole('button', { name: 'Mini', exact: true });
  await mini.click();
  await expect(mini).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Salir del mini reproductor' })).toBeVisible();
});

test('el tablist responde al teclado', async ({ page }) => {
  await page.goto('/');
  const biblioteca = page.getByRole('tab', { name: /Biblioteca/ });
  await biblioteca.focus();
  await expect(biblioteca).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Buscar/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Buscar/ })).toBeFocused();
});
