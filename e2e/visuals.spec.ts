import { expect, test } from '@playwright/test';

// Datos fijos y efectos desactivados para que las capturas sean reproducibles.
test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const colores = ['8e6bb8', '2b5876', 'd4af37', '3f7d5a', '8e4b8e', 'c14b32'];
    const portada = (color: string) =>
      `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%23${color}%22/%3E%3Ccircle cx=%2260%22 cy=%2258%22 r=%2226%22 fill=%22%23ffffff%22 opacity=%22.28%22/%3E%3C/svg%3E`;
    const tracks = Array.from({ length: 6 }, (_, i) => ({
      id: `snapshot-${i}`,
      path: `Disco\\pista-${i}.flac`,
      title: `Pista ${i}`,
      artist: `Artista ${i}`,
      album: `Álbum ${i}`,
      album_artist: null,
      track_number: i + 1,
      duration: 200,
      duration_str: '3:20',
      format: 'FLAC',
      bitrate_kbps: null,
      cover_url: portada(colores[i]),
      year: 2024,
      genre: 'Jazz',
      file_size: 12_345_678,
    }));
    const respuestas: Record<string, unknown> = {
      check_downloader_tools: {
        ytdlp_available: true,
        ffmpeg_available: true,
        ytdlp_path: 'bin/yt-dlp',
        ffmpeg_path: 'bin/ffmpeg',
      },
      get_cached_library: tracks,
      get_app_info: {
        engine: 'Tauri 2.0 + Rust Engine',
        rust_version: 'rustc 1.90.0',
        memory_usage: '12.4 MB',
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
      convertFileSrc: (ruta: string) => ruta,
    };

    localStorage.setItem('sakura_ambient_glow', 'false');
    localStorage.setItem('sakura_ambient_particles', 'false');
    localStorage.setItem('sakura_player_style', 'floating');
  });
});

const opciones = { animations: 'disabled' as const, caret: 'hide' as const };

for (const tema of ['shoji', 'origami', 'swiss', 'sumiink', 'moonlit', 'ledger']) {
  test(`${tema}: home y biblioteca`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('sakura_theme', t), tema);
    await page.goto('/');
    await expect(page.locator('#sakura-splash')).toBeHidden({ timeout: 8_000 });
    await expect(page.locator('.app-shell')).toHaveAttribute('data-skin', tema);
    await page.getByRole('tab', { name: /Inicio/ }).click();
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText('Inicio');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);

    await expect(page).toHaveScreenshot(`${tema}-home.png`, opciones);

    await page.getByRole('tab', { name: /Biblioteca/ }).click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot(`${tema}-library.png`, opciones);
  });
}
