import { readFileSync } from 'node:fs';
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
      search_catalog_songs: [],
      search_catalog_albums: [],
      get_app_info: {
        engine: 'Tauri 2.0 + Rust Engine',
        rust_version: 'rustc (e2e)',
        memory_usage: '—',
        tracks_loaded: 0,
      },
      get_default_music_dir: null,
      get_download_queue: [],
      tools_status: [],
      doctor_database: {
        mensaje: 'integrity=ok · pistas=0 · índice FTS reconstruido',
        info: {
          integridad: 'ok',
          pistas: 0,
          entradas_fts: 0,
          version_esquema: 2,
          tamano_bytes: 4096,
          ultimo_backup: 'library-auto-v1-1.bak',
          migraciones: '1=FTS5 · 2=índices',
        },
      },
      get_system_logs: '00:00:01 [INFO] lib: Escaneo de prueba',
      vacuum_database: 'Base compactada: 20 KB → 12 KB',
      backup_database: 'Respaldo creado',
      trash_count: 0,
      empty_trash: 0,
      delete_library_track: 'token-e2e',
      restore_deleted_track: 'Disco\\p0.flac',
      read_lyrics: [
        { time: 0.0, text: 'Primera línea' },
        { time: 2.5, text: 'Segunda línea' },
        { time: 5.0, text: 'Estribillo' },
      ],
      search_lyrics: [
        {
          id: 42,
          title: 'Pista 0',
          artist: 'Artista A',
          album: 'Álbum Uno',
          duration: 200,
          instrumental: false,
          plain_lyrics: '',
          synced_lyrics: '[00:00.00]Línea bajada\n[00:03.00]Estribillo bajado',
        },
      ],
      save_track_lyrics: 'Disco\\p0.lrc',
      delete_track_lyrics: null,
      list_playlists: [
        { id: 'pl-1', name: 'Favoritas', created_at: 1, track_count: 2 },
        { id: 'pl-2', name: 'Para el viaje', created_at: 2, track_count: 0 },
      ],
      get_playlist: {
        playlist: { id: 'pl-1', name: 'Favoritas', created_at: 1, track_count: 2 },
        tracks: [
          {
            id: 'l0',
            path: 'Disco\\l0.flac',
            title: 'Canción de lista',
            artist: 'Artista A',
            album: 'Álbum Uno',
            album_artist: null,
            track_number: 1,
            duration: 200,
            duration_str: '3:20',
            format: 'FLAC',
            bitrate_kbps: 900,
            cover_url: null,
            year: 2024,
            genre: 'Jazz',
            file_size: 1000,
          },
        ],
      },
      create_playlist: { id: 'pl-3', name: 'Nueva', created_at: 3, track_count: 0 },
      rename_playlist: null,
      delete_playlist: null,
      playlist_add_tracks: 1,
      playlist_remove_track: null,
      playlist_reorder: null,
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
  await page.getByRole('button', { name: 'Sistema' }).click();
  await expect(page.getByText(/Motor nativo/)).toBeVisible();

  await page.getByRole('button', { name: 'Reproductor' }).click();
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

test('los temas propios usan vistas propias sin el selector de 9 vistas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const temas = [
    { id: 'shoji', nombre: 'Shoji' },
    { id: 'origami', nombre: 'Origami' },
    { id: 'swiss', nombre: 'Swiss' },
    { id: 'sumiink', nombre: 'Sumi Ink' },
    { id: 'moonlit', nombre: 'Moonlit' },
    { id: 'ledger', nombre: 'Ledger' },
    { id: 'shonen', nombre: 'Shōnen' },
    { id: 'ghost', nombre: 'Fantasmas' },
    { id: 'samurai', nombre: 'Samurái' },
    { id: 'kawaii', nombre: 'Kawaii' },
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

test('la paleta de comandos navega con ⌘K', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comandos' });
  await expect(paleta).toBeVisible();
  await paleta.getByRole('textbox', { name: 'Buscar comandos' }).fill('Playlists');
  await paleta.getByRole('option', { name: /Playlists/ }).click();
  await expect(page.locator('.playlists-panel')).toBeVisible();
  await expect(page.locator('.playlists-item')).toHaveCount(2);
});

test('las playlists muestran sus pistas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page
    .getByRole('tab', { name: /Listas/ })
    .first()
    .click();
  await expect(page.locator('.playlists-item')).toHaveCount(2);
  await expect(page.locator('.playlists-detalle-head h2')).toHaveText('Favoritas');
  await expect(page.locator('.playlists-pista')).toHaveCount(1);
  await expect(page.locator('.playlists-pista')).toContainText('Canción de lista');
});

test('las letras .lrc se muestran sincronizadas en el panel', async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [
      {
        id: 'p0',
        path: 'Disco\\\\p0.flac',
        title: 'Pista 0',
        artist: 'Artista A',
        album: 'Álbum Uno',
        album_artist: null,
        track_number: 1,
        duration: 200,
        duration_str: '3:20',
        format: 'FLAC',
        bitrate_kbps: 900,
        cover_url: null,
        year: 2024,
        genre: 'Jazz',
        file_size: 1000,
      },
    ];
    const internals = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = internals.__TAURI_INTERNALS__.invoke;
    internals.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) => {
      if (cmd === 'get_cached_library') return tracks;
      return anterior(cmd, args);
    };
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  await page
    .getByRole('button', { name: /Reproducir/ })
    .first()
    .click();
  await page.locator('.npr-cover').click();
  const panel = page.getByRole('dialog', { name: 'Ahora reproduciendo' });
  await panel.getByRole('tab', { name: /Letras/ }).click();
  await expect(panel.locator('.np-letra-linea')).toHaveCount(3);
  await expect(panel.locator('.np-letra-linea').first()).toContainText('Primera línea');
});

test('se pueden buscar letras online y aplicarlas a la pista', async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [
      {
        id: 'p0',
        path: 'Disco\\p0.flac',
        title: 'Pista 0',
        artist: 'Artista A',
        album: 'Álbum Uno',
        album_artist: null,
        track_number: 1,
        duration: 200,
        duration_str: '3:20',
        format: 'FLAC',
        bitrate_kbps: 900,
        cover_url: null,
        year: 2024,
        genre: 'Jazz',
        file_size: 1000,
      },
    ];
    const internals = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = internals.__TAURI_INTERNALS__.invoke;
    const bajadas = [
      { time: 0, text: 'Línea bajada' },
      { time: 3, text: 'Estribillo bajado' },
    ];
    let guardadas = false;
    internals.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) => {
      if (cmd === 'get_cached_library') return tracks;
      if (cmd === 'read_lyrics') return guardadas ? bajadas : [];
      if (cmd === 'save_track_lyrics') {
        guardadas = true;
        return 'Disco\\p0.lrc';
      }
      return anterior(cmd, args);
    };
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  await page
    .getByRole('button', { name: /Reproducir/ })
    .first()
    .click();
  await page.locator('.npr-cover').click();

  const panel = page.getByRole('dialog', { name: 'Ahora reproduciendo' });
  await panel.getByRole('tab', { name: /Letras/ }).click();
  await panel.getByRole('button', { name: /Buscar letras online/ }).click();
  await panel.getByRole('button', { name: /^Buscar$/ }).click();

  const resultado = panel.locator('.np-letras-resultado');
  await expect(resultado).toHaveCount(1);
  await expect(resultado).toContainText('Pista 0');
  await resultado.click();
  await expect(panel.locator('.np-letra-linea')).toHaveCount(2);
  await expect(panel.locator('.np-letra-linea').first()).toContainText('Línea bajada');
});

test('Ajustes → Sistema muestra la salud de la base y los registros', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Sistema/ }).click();

  const panel = page.locator('.sys-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.sys-stat').first()).toContainText('ok');
  await expect(panel.locator('.sys-stat')).toHaveCount(4);
  await expect(panel.locator('.sys-log')).toContainText('Escaneo de prueba');

  await panel.getByRole('button', { name: /Compactar/ }).click();
  await expect(panel.locator('.sys-estado')).toContainText('Base compactada');
});

test('el panel ahora suena muestra detalles, album y artista', async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = Array.from({ length: 6 }, (_, i) => ({
      id: 'p' + i,
      path: `Disco\\p${i}.flac`,
      title: 'Pista ' + i,
      artist: i < 3 ? 'Artista A' : 'Artista B',
      album: i < 3 ? 'Álbum Uno' : 'Álbum Dos',
      album_artist: 'Artista A',
      track_number: i + 1,
      duration: 200,
      duration_str: '3:20',
      format: 'FLAC',
      bitrate_kbps: 912,
      cover_url: null,
      year: 2024,
      genre: 'Jazz',
      file_size: 1000,
    }));
    const respuestas: Record<string, unknown> = {
      check_downloader_tools: {
        ytdlp_available: false,
        ffmpeg_available: false,
        ytdlp_path: null,
        ffmpeg_path: null,
      },
      get_cached_library: tracks,
      search_library_fts: [],
      remote_is_enabled: false,
      remote_local_ip: '127.0.0.1',
      remote_set_enabled: true,
      remote_update_state: null,
      search_catalog_songs: [],
      search_catalog_albums: [],
      get_app_info: {
        engine: 'Tauri 2.0',
        rust_version: 'rustc',
        memory_usage: '—',
        tracks_loaded: tracks.length,
      },
      get_default_music_dir: null,
      get_download_queue: [],
      tools_status: [],
    };
    const w = window as unknown as {
      __TAURI_INTERNALS__: Record<string, unknown>;
      __TAURI_EVENT_PLUGIN_INTERNALS__: Record<string, unknown>;
    };
    w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      invoke: async (cmd: string) => respuestas[cmd] ?? null,
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (p: string) => p,
    };
    localStorage.setItem('sakura_theme', 'shonen');
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  await page
    .getByRole('button', { name: /Reproducir/ })
    .first()
    .click();
  await page.locator('.npr-cover').click();

  const panel = page.getByRole('dialog', { name: 'Ahora reproduciendo' });
  await expect(panel).toBeVisible();
  await expect(panel.locator('.np-specs')).toContainText('FLAC');
  await expect(page.locator('.np-panel.tema-shonen')).toHaveCount(1);

  await panel.getByRole('tab', { name: /Álbum/ }).click();
  await expect(panel.locator('.np-lista-item')).toHaveCount(3);
  await panel.getByRole('tab', { name: /Artista/ }).click();
  await expect(panel.locator('.np-lista-item')).toHaveCount(3);
});

test('cada tema usa sus propios iconos de navegacion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sakura_theme', 'samurai'));
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const iconos = await page.locator('.theme-nav-tab-icon').allTextContents();
  expect(iconos).toEqual(['侍', '巻', '探', '列', '陣', '整']);
  expect(await page.locator('.theme-nav').getAttribute('data-icon-style')).toBe('kanji');

  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Swiss/ }).click();
  const iconosSwiss = await page.locator('.theme-nav-tab-icon').allTextContents();
  expect(iconosSwiss).toEqual(['▦', '▤', '⌕', '☰', '▤', '⊞']);
  expect(await page.locator('.theme-nav').getAttribute('data-icon-style')).toBe('mono');
});

test('el glifo del splash hace handoff continuo con la navegacion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sakura_theme', 'shonen'));
  await page.goto('/');

  await expect(page.locator('#sakura-splash')).toBeVisible();
  const nombre = await page
    .locator('.splash-label')
    .evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(nombre).toBe('sakura-glifo');

  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await expect(page.locator('.theme-nav-glifo')).toHaveText('⚡');

  // La clase de handoff se limpia al terminar la transición.
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.classList.contains('splash-handoff')),
    )
    .toBe(false);
});

test('el splash de arranque adopta el tema guardado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sakura_theme', 'shonen'));
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-splash'))).toBe(
    'shonen',
  );
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
});

test('la transición de Swiss es rápida y continua', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'swiss');
    localStorage.setItem('sakura_ambient_particles', 'false');
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  expect(await page.evaluate(() => document.documentElement.dataset['themeTransition'])).toBe(
    'swiss',
  );

  // Medir el elemento es flaky: la clase panel-enter se retira al terminar.
  // Leemos la regla del CSS directamente.
  const css = readFileSync('src/App.css', 'utf-8');
  const regla = css
    .split('\n')
    .find(
      (linea) => linea.includes("data-theme-transition='swiss'") && linea.includes('panel-enter'),
    );
  expect(regla).toBeDefined();
  expect(regla).toContain('130ms');
  expect(regla).toContain('cubic-bezier(.2,.7,.3,1)');
  expect(regla).not.toContain('steps(');
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
