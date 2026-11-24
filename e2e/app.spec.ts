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
      remote_pin: '123456',
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
  await expect(page.getByPlaceholder('Buscar en su música...')).toBeVisible();

  const ajustes = page.getByRole('tab', { name: /Ajustes/ });
  await ajustes.click();
  await expect(ajustes).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Sistema' }).click();
  await expect(page.getByText(/Motor nativo/)).toBeVisible();

  await page.getByRole('button', { name: 'Reproductor', exact: true }).click();
  const mini = page.getByRole('button', { name: 'Mini', exact: true });
  await mini.click();
  await expect(mini).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Salir del mini reproductor' })).toBeVisible();
});

test('con el reproductor desactivado no se reproduce audio', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sakura_player_style', 'off'));
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  await expect(page.getByRole('button', { name: 'Activar reproductor' })).toBeVisible();
  expect(await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(
    true,
  );

  await page.getByRole('button', { name: 'Activar reproductor' }).click();
  await expect(page.getByRole('button', { name: 'Activar reproductor' })).toHaveCount(0);
});

test('se puede presentar la canción con el reproductor desactivado', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_player_style', 'off');
    const pista = {
      id: 'pres1',
      path: 'Disco\\pres1.flac',
      title: 'Canción presentada',
      artist: 'Artista',
      album: 'Álbum de prueba',
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
    };
    const w = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) =>
      cmd === 'get_cached_library' ? [pista] : cmd === 'read_lyrics' ? [] : anterior(cmd, args);
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  const presentar = page.getByRole('button', { name: 'Presentar canción' });
  await expect(presentar).toBeVisible();
  await presentar.click();

  const cartel = page.getByRole('dialog', { name: /Presentación de Canción presentada/ });
  await expect(cartel).toBeVisible();
  await expect(cartel).toContainText('Álbum de prueba');
  await expect(cartel).toContainText('FLAC');
  await cartel.getByRole('button', { name: 'Añadir a favoritas' }).click();
  await page.keyboard.press('Escape');
  await expect(cartel).toHaveCount(0);
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
    { id: 'space', nombre: 'Estudio' },
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
    { id: 'manga', nombre: 'Manga' },
  ];

  for (const tema of temas) {
    await page.getByRole('tab', { name: /Ajustes/ }).click();
    await page
      .locator('.set-theme-copy strong', { hasText: new RegExp(`^${tema.nombre}$`) })
      .click();

    await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', tema.id);
    await expect(page.locator('.titlebar-brand-badge')).toContainText(tema.nombre);

    await page.getByRole('tab', { name: /Inicio/ }).click();
    await expect(page.locator(`.${tema.id}-home`)).toBeVisible();
    await expect(page.locator('.lt-view-select')).toBeHidden();

    await page.getByRole('tab', { name: /Biblioteca/ }).click();
    await expect(page.locator(`.${tema.id}-library`)).toBeVisible();
    await expect(page.locator('.lt-view-select')).toBeHidden();
    await expect(page.getByRole('button', { name: /Todas juntas/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Edición en lote/ })).toBeVisible();

    await page.getByRole('tab', { name: /Buscar/ }).click();
    await expect(page.locator(tema.id === 'manga' ? '.manga-search' : '.tsearch')).toBeVisible();
    await page.getByRole('tab', { name: /Cola/ }).click();
    await expect(page.locator(tema.id === 'manga' ? '.manga-queue' : '.tqueue')).toBeVisible();
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

  await page.getByPlaceholder('Buscar en su música...').fill('guren');
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

test('Manga tiene Buscar, Cola y editor de metadatos propios', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sakura_theme', 'manga');
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
    const w = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) =>
      cmd === 'get_cached_library' ? tracks : anterior(cmd, args);
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });

  await page.getByRole('tab', { name: /Buscar/ }).click();
  await expect(page.locator('.manga-search')).toBeVisible();
  await expect(page.locator('.manga-search-cab h1')).toHaveText('Buscador');
  await expect(page.locator('.manga-search-card').first()).toBeVisible();

  await page.getByRole('tab', { name: /Cola/ }).click();
  await expect(page.locator('.manga-queue')).toBeVisible();
  await expect(page.locator('.manga-queue-vacio h2')).toHaveText('ESTA PÁGINA ESTÁ EN BLANCO');

  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  await page.getByRole('button', { name: 'Editar metadatos' }).first().click();
  const editor = page.locator('.theme-modal.tema-manga');
  await expect(editor).toBeVisible();
  await expect(editor.locator('.manga-modal-ribbon')).toContainText('EDICIÓN DE METADATOS');
});

test('la galería de temas aplica una apariencia', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Abrir galería de temas/ }).click();

  const galeria = page.getByRole('dialog', { name: 'Galería de temas' });
  await expect(galeria).toBeVisible();
  await expect(galeria.locator('.galeria-tema')).toHaveCount(14);
  await galeria.locator('.galeria-tema', { hasText: 'Manga' }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'manga');
  await expect(galeria).toHaveCount(0);
});

test('la pestaña de estadísticas resume la biblioteca', async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [
      {
        id: 'p0',
        path: 'Disco\\p0.flac',
        title: 'A',
        artist: 'Artista A',
        album: 'X',
        album_artist: null,
        track_number: 1,
        duration: 120,
        duration_str: '2:00',
        format: 'FLAC',
        bitrate_kbps: null,
        cover_url: null,
        year: 2019,
        genre: 'Jazz',
        file_size: 1000000,
      },
      {
        id: 'p1',
        path: 'Disco\\p1.flac',
        title: 'B',
        artist: 'Artista B',
        album: 'Y',
        album_artist: null,
        track_number: 1,
        duration: 180,
        duration_str: '3:00',
        format: 'MP3',
        bitrate_kbps: null,
        cover_url: null,
        year: 2021,
        genre: 'Rock',
        file_size: 2000000,
      },
    ];
    const w = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) =>
      cmd === 'get_cached_library' ? tracks : anterior(cmd, args);
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Datos/ }).click();

  const stats = page.locator('.estadisticas');
  await expect(stats).toBeVisible();
  await expect(stats.locator('.estadisticas-kpi')).toHaveCount(5);
  await expect(stats.locator('.estadisticas-barra')).toHaveCount(2);
  await expect(stats.locator('.estadisticas-decada')).toHaveCount(2);
  await expect(stats.locator('.estadisticas-donut')).toBeVisible();
});

test('el menú contextual de la biblioteca ofrece las acciones de la pista', async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [
      {
        id: 'ctx1',
        path: 'Disco\\ctx1.flac',
        title: 'Pista contextual',
        artist: 'Artista X',
        album: 'Álbum X',
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
    const w = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> };
    };
    const anterior = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) =>
      cmd === 'get_cached_library' ? tracks : anterior(cmd, args);
  });
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Biblioteca/ }).click();
  const fila = page.locator('[data-track-id]').first();
  await expect(fila).toBeVisible();
  await fila.click({ button: 'right' });

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Reproducir después/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Añadir a playlist/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Editar metadatos/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Eliminar canción/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
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

test('la interfaz carga en el celular sin el bridge de Tauri', async ({ page }) => {
  // El navegador del celular no tiene __TAURI_INTERNALS__: ningún módulo de
  // Tauri debe ejecutarse al montar y romper la app.
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });
  await page.route('**/api/status', (ruta) =>
    ruta.fulfill({
      json: {
        title: 'Pista de prueba',
        artist: 'Artista',
        playing: true,
        position: 10,
        duration: 200,
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await expect(page.getByText('La interfaz encontró un problema')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Biblioteca/ })).toBeVisible();
  await expect(page.locator('.remote-status')).toBeVisible({ timeout: 5_000 });
});

test('el control remoto genera un QR con la IP indicada', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Sistema/ }).click();
  await page.getByRole('button', { name: 'Activar control remoto' }).click();

  // Con 127.0.0.1 no se genera el QR: el celular se abriría a sí mismo.
  await expect(page.locator('.set-remoto-qr svg title')).toHaveCount(0);
  await expect(page.locator('.set-remoto-sin-qr')).toBeVisible();

  // Al escribir una IP privada aparece el QR y la URL se actualiza.
  await page.getByLabel('IP de la PC en la red local').fill('192.168.1.23');
  await expect(page.locator('.set-remoto-qr svg title')).toHaveText('QR del control remoto');
  await expect(page.locator('.set-remoto-url')).toHaveText('http://192.168.1.23:17342/?pin=123456');
  await expect(page.locator('.set-remoto-pin')).toContainText('123 456');

  await page.getByRole('button', { name: 'Copiar URL del control remoto' }).click();
  await expect(page.getByRole('button', { name: 'Copiar URL del control remoto' })).toContainText(
    'Copiado',
  );
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
      remote_pin: '123456',
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
  expect(iconos).toEqual(['侍', '巻', '探', '列', '陣', '陣', '整']);
  expect(await page.locator('.theme-nav').getAttribute('data-icon-style')).toBe('kanji');

  await page.getByRole('tab', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Swiss/ }).click();
  const iconosSwiss = await page.locator('.theme-nav-tab-icon').allTextContents();
  expect(iconosSwiss).toEqual(['▦', '▤', '⌕', '☰', '▤', '▦', '⊞']);
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
  await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', 'space');
  await expect(page.getByRole('button', { name: /Tema Temporal/ })).toHaveCount(0);
});
