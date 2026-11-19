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
      search_library_fts: [],
      remote_is_enabled: false,
      remote_local_ip: '127.0.0.1',
      remote_set_enabled: true,
      remote_update_state: null,
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
    await expect(page.getByRole('button', { name: /Edición en lote/ })).toBeVisible();

    await page.getByRole('tab', { name: /Buscar/ }).click();
    await expect(page.locator('.tsearch')).toBeVisible();
    await page.getByRole('tab', { name: /Cola/ }).click();
    await expect(page.locator('.tqueue')).toBeVisible();
  }
});

test('la búsqueda filtra usando el índice FTS del backend', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'shoji');
    const tracks = [
      {
        id: 't0',
        path: 'M\\a.flac',
        title: 'Otra',
        artist: 'Artista',
        album: 'Álbum',
        album_artist: null,
        track_number: 1,
        duration: 200,
        duration_str: '3:20',
        format: 'FLAC',
        bitrate_kbps: null,
        cover_url: null,
        year: 2024,
        genre: 'Jazz',
        file_size: 1000,
      },
      {
        id: 't1',
        path: 'M\\b.flac',
        title: 'Gurenge',
        artist: 'LiSA',
        album: 'Demon Slayer',
        album_artist: null,
        track_number: 2,
        duration: 200,
        duration_str: '3:20',
        format: 'FLAC',
        bitrate_kbps: null,
        cover_url: null,
        year: 2024,
        genre: 'Jazz',
        file_size: 1000,
      },
      {
        id: 't2',
        path: 'M\\c.flac',
        title: 'Idol',
        artist: 'YOASOBI',
        album: 'Oshi no Ko',
        album_artist: null,
        track_number: 3,
        duration: 200,
        duration_str: '3:20',
        format: 'FLAC',
        bitrate_kbps: null,
        cover_url: null,
        year: 2024,
        genre: 'Jazz',
        file_size: 1000,
      },
    ];
    const encontrados = [tracks[1]];
    const respuestas: Record<string, unknown> = {
      check_downloader_tools: {
        ytdlp_available: false,
        ffmpeg_available: false,
        ytdlp_path: null,
        ffmpeg_path: null,
      },
      get_cached_library: tracks,
      get_app_info: {
        engine: 'Tauri 2.0 + Rust Engine',
        rust_version: 'rustc (e2e)',
        memory_usage: '—',
        tracks_loaded: tracks.length,
      },
      get_default_music_dir: null,
      get_download_queue: [],
      tools_status: [],
    };
    const w = window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> };
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async (cmd: string) =>
        cmd === 'search_library_fts' ? encontrados : (respuestas[cmd] ?? null),
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (ruta: string) => ruta,
    };
  });

  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await expect(page.locator('.shoji-slata')).toHaveCount(3);

  await page.getByPlaceholder('Buscar en tu música...').fill('guren');
  await expect(page.locator('.shoji-slata')).toHaveCount(1);
  await expect(page.locator('.shoji-slata')).toContainText('Gurenge');
});

test('un tema importado cambia la estructura completa de la app', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const tema = {
    id: 'mi-tema',
    nombre: 'Mi Tema',
    descripcion: 'Generado en el probador',
    base: 'swiss',
    css: ".app-shell[data-skin='mi-tema']{--tema-accent:#ff0066 !important;}",
  };

  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.locator('.set-json').fill(JSON.stringify(tema));
  await page.getByRole('button', { name: /Importar JSON/ }).click();

  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'mi-tema');
  expect(await page.locator('#sakura-temas-personalizados').textContent()).toContain('ff0066');
  await expect(page.getByRole('tab', { name: /Mi Tema/ })).toHaveCount(0);

  // El arquetipo swiss define la estructura de Home y biblioteca.
  await page.getByRole('tab', { name: /Inicio/ }).click();
  await expect(page.locator('.swiss-poster')).toBeVisible();
  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  await expect(page.locator('.swiss-cabecera')).toBeVisible();
});

test('el generador integrado aplica un tema con su arquetipo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Abrir generador/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Generador de temas' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Arquetipo de diseño').selectOption('origami');
  await dialog.getByRole('button', { name: /Aplicar tema/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'mi-tema');

  await page.getByRole('tab', { name: /Inicio/ }).click();
  await expect(page.locator('.origami-figura')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset['themeTransition'])).toBe(
    'origami',
  );
});

test('se pueden borrar temas personalizados', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  // Importamos un tema para que aparezca en el selector.
  const tema = {
    id: 'temporal',
    nombre: 'Tema Temporal',
    descripcion: 'Para borrar',
    base: 'shoji',
    css: ".app-shell[data-skin='temporal']{--tema-accent:#123456 !important;}",
  };
  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.locator('.set-json').fill(JSON.stringify(tema));
  await page.getByRole('button', { name: /Importar JSON/ }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'temporal');

  // El tema activo se puede borrar y vuelve al tema base.
  await page.getByRole('button', { name: 'Borrar tema Tema Temporal' }).click();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-skin');
  await expect(page.getByRole('button', { name: /Tema Temporal/ })).toHaveCount(0);
});
