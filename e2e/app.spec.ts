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

test('Byobu permite elegir una imagen de inicio', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'byobu');
    const w = window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> };
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async () => null,
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (p: string) => p,
    };
    (
      window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__: unknown }
    ).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
  });
  await page.goto('/');
  await page.locator('#tab-home').click();

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.locator('.byobu-home-input').setInputFiles({
    name: 'portada.png',
    mimeType: 'image/png',
    buffer: png,
  });

  await expect(page.locator('.byobu-home-panel')).toHaveClass(/tiene-imagen/);
  await expect(page.locator('.byobu-home-panel')).toHaveCSS('background-image', /data:image\/png/);
});

test('Byobu permite usar la portada de una canción', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'byobu');
    const cover =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23b23a2b"/%3E%3C/svg%3E';
    const tracks = Array.from({ length: 4 }, (_, i) => ({
      id: 'p' + i,
      path: 'p' + i + '.flac',
      title: 'Pista ' + i,
      artist: 'Artista ' + i,
      album: 'Álbum ' + i,
      album_artist: null,
      track_number: i,
      duration: 200,
      duration_str: '3:20',
      format: 'FLAC',
      bitrate_kbps: null,
      cover_url: cover,
      year: 2024,
      genre: 'Jazz',
      file_size: 12345,
    }));
    const w = window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> };
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async (cmd: string) => (cmd === 'get_cached_library' ? tracks : null),
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (p: string) => p,
    };
    (
      window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__: unknown }
    ).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
  });
  await page.goto('/');
  await page.locator('#tab-home').click();

  await expect(page.locator('.byobu-home-portadas button')).toHaveCount(4);
  await page.locator('.byobu-home-portadas button').first().click();
  await expect(page.locator('.byobu-home-panel')).toHaveClass(/tiene-imagen/);
  await expect(page.locator('.byobu-home-panel')).toHaveCSS(
    'background-image',
    /data:image\/svg\+xml/,
  );
});

test('las carpetas filtran la biblioteca propia de Sumi-e', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'sumie');
    localStorage.setItem('sakura_view_mode', 'folders');
    const tracks = Array.from({ length: 9 }, (_, i) => ({
      id: 'p' + i,
      path: `Album${Math.floor(i / 3)}\\p${i}.flac`,
      title: 'Pista ' + i,
      artist: 'Artista ' + i,
      album: 'Álbum ' + i,
      album_artist: null,
      track_number: i,
      duration: 200,
      duration_str: '3:20',
      format: 'FLAC',
      bitrate_kbps: null,
      cover_url: null,
      year: 2024,
      genre: 'Jazz',
      file_size: 12345,
    }));
    const w = window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> };
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async (cmd: string) => (cmd === 'get_cached_library' ? tracks : null),
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (p: string) => p,
    };
  });

  await page.goto('/');
  await expect(page.locator('.sumie-recorte')).toHaveCount(9);

  await page.getByRole('button', { name: /Album1/ }).click();
  await expect(page.locator('.sumie-recorte')).toHaveCount(3);
});

test('el tema se cambia desde Ajustes y persiste al recargar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Ajustes/ }).click();

  const sumie = page.getByRole('button', { name: /Sumi-e/ });
  await sumie.click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'sumie');
  await expect(sumie).toHaveAttribute('aria-pressed', 'true');

  const byobu = page.getByRole('button', { name: /Byōbu/ });
  await byobu.click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'byobu');

  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'byobu');
});

test('el tablist responde al teclado', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  const biblioteca = page.getByRole('tab', { name: /Biblioteca/ });
  await biblioteca.focus();
  await expect(biblioteca).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Buscar/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Buscar/ })).toBeFocused();
});

test('los seis temas propios usan vistas propias sin el selector de 9 vistas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const temas = [
    { id: 'shoji', nombre: 'Shoji' },
    { id: 'origami', nombre: 'Origami' },
    { id: 'swiss', nombre: 'Swiss' },
    { id: 'sumiink', nombre: 'Sumi Ink' },
    { id: 'moonlit', nombre: 'Moonlit' },
    { id: 'ledger', nombre: 'Ledger' },
  ];

  for (const tema of temas) {
    await page.getByRole('tab', { name: /Ajustes/ }).click();
    await page.getByRole('button', { name: new RegExp(tema.nombre) }).click();

    await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', tema.id);
    await expect(page.locator('.titlebar-brand-tag')).toHaveText(tema.nombre);

    await page.getByRole('tab', { name: /Inicio/ }).click();
    await expect(page.locator(`.${tema.id}-home`)).toBeVisible();
    await expect(page.locator('.lt-view-select')).toBeHidden();

    await page.getByRole('tab', { name: /Biblioteca/ }).click();
    await expect(page.locator(`.${tema.id}-library`)).toBeVisible();
    await expect(page.locator('.lt-view-select')).toBeHidden();
    await expect(page.getByRole('button', { name: /Todas juntas/ })).toBeVisible();
  }
});
