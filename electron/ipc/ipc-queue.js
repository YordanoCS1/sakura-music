const { app } = require('electron');
const Store = require('electron-store');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');

const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const YTDLP_PATH = path.join(BIN_DIR,
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_DIR,
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

const queueStore = new Store({
  name: 'download-queue',
  defaults: { items: [] }
});

// Reset items stuck in 'downloading' from a previous session
{
  const staleItems = queueStore.get('items');
  const fixed = staleItems.map(i =>
    i.status === 'downloading' ? { ...i, status: 'pending', progress: 0 } : i
  );
  queueStore.set('items', fixed);
}

const MAX_CONCURRENT_DOWNLOADS = 5;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

let processingLoopActive = false;
let activeDownloads = 0;
const activeChildren = new Map();
let wakeProcessor = null;

app.on('before-quit', () => {
  for (const child of activeChildren.values()) {
    try { child.kill('SIGKILL'); } catch (_) {}
  }
  activeChildren.clear();
});

module.exports = (ipcMain, mainWindow) => {

  function sendToWindow(event, data) {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      try { mainWindow.webContents.send(event, data); } catch {}
    }
  }

  // ── Queue management ──────────────────────────────────────────

  ipcMain.handle('queue_add', async (_, item) => {
    const queue = queueStore.get('items');
    const id = item.id || Date.now().toString();

    const newItem = {
      id,
      title: item.title,
      url: item.url,
      format: item.format || 'mp3',
      quality: item.quality || 'audio_mp3_320',
      codec: item.codec || null,
      download_path: item.download_path,
      artist: item.artist || null,
      album: item.album || null,
      thumbnail: item.thumbnail || null,
      playlist_title: item.playlist_title || null,
      playlist_id: item.playlist_id || null,
      subfolder: item.playlist_title || null,
      cookie_browser: item.cookie_browser || null,
      embed_cover: item.embed_cover !== false,
      status: 'pending',
      progress: 0,
      error_message: null,
      retry_count: 0,
      added_at: new Date().toISOString(),
      completed_at: null,
      file_path: null,
    };

    queue.push(newItem);
    queueStore.set('items', queue);

    signalProcessor();
    return { id };
  });

  ipcMain.handle('queue_add_playlist', async (_, { entries, ...commonArgs }) => {
    const playlistId = Date.now().toString();
    const queue = queueStore.get('items');
    const added = [];

    for (const entry of entries) {
      const id = `${playlistId}_${entry.id}`;
      const newItem = {
        id,
        title: entry.title,
        url: entry.url,
        format: commonArgs.format,
        quality: commonArgs.quality,
        codec: commonArgs.codec || null,
        download_path: commonArgs.download_path,
        thumbnail: entry.thumbnail,
        playlist_id: playlistId,
        playlist_title: commonArgs.playlist_title,
        subfolder: commonArgs.playlist_title || null,
        cookie_browser: commonArgs.cookieBrowser || null,
        embed_cover: commonArgs.embedCover !== false,
        status: 'pending',
        progress: 0,
        error_message: null,
        retry_count: 0,
        added_at: new Date().toISOString(),
        completed_at: null,
        file_path: null,
      };

      queue.push(newItem);
      added.push({ id, title: entry.title });
    }

    queueStore.set('items', queue);
    signalProcessor();

    return { playlistId, count: added.length };
  });

  ipcMain.handle('queue_get_all', async () => {
    return queueStore.get('items');
  });

  ipcMain.handle('queue_get_grouped', async () => {
    const all = queueStore.get('items');
    const grouped = {};
    const singles = [];

    for (const item of all) {
      if (item.playlist_id) {
        if (!grouped[item.playlist_id]) {
          grouped[item.playlist_id] = {
            id: item.playlist_id,
            title: item.playlist_title || 'Playlist',
            items: []
          };
        }
        grouped[item.playlist_id].items.push(item);
      } else {
        singles.push(item);
      }
    }

    return {
      playlists: Object.values(grouped),
      singles
    };
  });

  function updateItem(id, updates) {
    const queue = queueStore.get('items');
    const index = queue.findIndex(i => i.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      queueStore.set('items', queue);
      return true;
    }
    return false;
  }

  ipcMain.handle('queue_remove', async (_, { id }) => {
    const queue = queueStore.get('items');
    const filtered = queue.filter(i => i.id !== id);
    queueStore.set('items', filtered);

    if (activeChildren.has(id)) {
      const child = activeChildren.get(id);
      try { child.kill('SIGKILL'); } catch (_) {}
      activeChildren.delete(id);
    }

    return true;
  });

  ipcMain.handle('queue_clear_completed', async () => {
    const queue = queueStore.get('items');
    const filtered = queue.filter(i => i.status !== 'completed');
    const removed = queue.length - filtered.length;
    queueStore.set('items', filtered);
    return removed;
  });

  ipcMain.handle('queue_retry', async (_, { id }) => {
    updateItem(id, {
      status: 'pending',
      error_message: null,
      retry_count: (queueStore.get('items').find(i => i.id === id)?.retry_count || 0) + 1
    });
    signalProcessor();
    return true;
  });

  // ── Queue processor (signal-based, no polling) ────────────────

  function signalProcessor() {
    if (wakeProcessor) { wakeProcessor(); wakeProcessor = null; }
    if (!processingLoopActive) startQueueProcessor();
  }

  async function startQueueProcessor() {
    if (processingLoopActive) return;
    processingLoopActive = true;

    while (true) {
      if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
        await waitForSignal(1000);
        continue;
      }

      const queue = queueStore.get('items');

      const nextItem = queue.find(i =>
        (i.status === 'pending' || (i.status === 'failed' && (i.retry_count || 0) < MAX_RETRIES)) &&
        !activeChildren.has(i.id) &&
        i.status !== 'downloading'
      );

      if (!nextItem) {
        if (activeDownloads === 0) {
          processingLoopActive = false;
          break;
        } else {
          await waitForSignal(1000);
          continue;
        }
      }

      activeDownloads++;
      updateItem(nextItem.id, { status: 'downloading' });
      
      (async () => {
        let retryCount = nextItem.retry_count || 0;
        let success = false;
        let lastError = null;
        let filePath = null;

        while (retryCount <= MAX_RETRIES) {
          try {
            logger.log(`[Queue] Starting download: ${nextItem.title} (Attempt ${retryCount + 1})`);
            filePath = await downloadItem(nextItem);
            success = true;
            break;
          } catch (error) {
            lastError = error;
            logger.error(`[Queue] Attempt ${retryCount + 1} failed for ${nextItem.title}: ${error.message}`);
            
            if (retryCount < MAX_RETRIES) {
               logger.log(`[Queue] Retrying in ${RETRY_DELAY_MS/1000} seconds...`);
               await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
               retryCount++;
               updateItem(nextItem.id, { retry_count: retryCount });
            } else {
               break;
            }
          }
        }

        activeDownloads--;

        if (success) {
          updateItem(nextItem.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress: 100,
            file_path: filePath,
          });
          sendToWindow('queue-item-completed', { id: nextItem.id, title: nextItem.title });
        } else {
          updateItem(nextItem.id, {
            status: 'failed',
            error_message: lastError ? lastError.message : 'Unknown error',
            retry_count: retryCount,
          });
          sendToWindow('queue-item-error', { id: nextItem.id, title: nextItem.title, error: lastError ? lastError.message : 'Unknown error' });
        }
        
        sendToWindow('queue-updated', await getQueueData());
        
        // Signal processor to check for more work
        signalProcessor();
      })();
      
      sendToWindow('queue-updated', await getQueueData());
    }
  }

  async function waitForSignal(timeoutMs) {
    return new Promise(resolve => {
      wakeProcessor = resolve;
      setTimeout(() => { if (wakeProcessor === resolve) { wakeProcessor = null; resolve(); } }, timeoutMs);
    });
  }
  // ── Download item (matches download_queue.rs) ─────────────────

  async function downloadItem(item) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(YTDLP_PATH)) {
        reject(new Error('yt-dlp no está instalado. Ve a Configuración > Herramientas para instalarlo.'));
        return;
      }

      const isPlaylistUrl = item.url.includes('playlist?list=')
        || item.url.includes('&list=')
        || item.url.includes('/sets/')
        || item.url.includes('/albums/');

      const args = [
        '--no-warnings',
        '--newline',
        '--progress',
        '--js-runtimes', 'node',
        '--embed-metadata',
      ];

      if (item.embed_cover !== false) {
        args.push('--embed-thumbnail');
      }

      if (!isPlaylistUrl) {
        args.push('--no-playlist');
      }

      const basePath = path.resolve(item.download_path || '.');
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      if (item.subfolder) {
        const sub = path.join(basePath, item.subfolder.replace(/[\\/:*?"<>|]/g, '_'));
        if (!fs.existsSync(sub)) {
          fs.mkdirSync(sub, { recursive: true });
        }
        args.push('-o', path.join(sub, '%(title)s.%(ext)s'));
      } else if (isPlaylistUrl) {
        args.push('-o', path.join(basePath, '%(playlist_title)s', '%(title)s.%(ext)s'));
      } else {
        args.push('-o', path.join(basePath, '%(title)s.%(ext)s'));
      }

      if (item.format === 'audio' || item.format === 'mp3' || item.format === 'm4a') {
        args.push('-x');

        if (item.format === 'm4a' || item.quality === 'audio_m4a') {
          args.push('--audio-format', 'm4a', '--audio-quality', '0');
        } else if (item.quality === 'audio_mp3_128' || item.quality === '128') {
          args.push('--audio-format', 'mp3', '--audio-quality', '5');
        } else {
          args.push('--audio-format', 'mp3', '--audio-quality', '0');
        }

        args.push('-f', 'bestaudio/best');
      } else {
        const HEIGHT_MAP = { video_2160: 2160, video_1080: 1080, video_720: 720, video_480: 480, video_360: 360 };
        const maxH = HEIGHT_MAP[item.quality];
        const fmt = maxH ? `bestvideo[height<=${maxH}]+bestaudio/best` : 'bestvideo+bestaudio/best';
        args.push('-f', fmt, '--merge-output-format', 'mp4');
        const codec = item.codec;
        if (codec && codec !== 'auto') {
          const codecSort = { av1: 'vcodec:av01,res,codec', vp9: 'vcodec:vp9,res,codec', h264: 'vcodec:h264,res,codec' };
          args.push('--format-sort', codecSort[codec] || 'res,codec');
        }
      }

      if (item.cookie_browser && item.cookie_browser !== 'none') {
        args.push('--cookies-from-browser', item.cookie_browser);
      }

      args.push('--ffmpeg-location', FFMPEG_PATH);
      args.push(item.url);

      logger.log('Queue download:', item.title);

      const child = spawn(YTDLP_PATH, args, {
        windowsHide: true,
        env: { ...process.env, PATH: `${BIN_DIR};${process.env.PATH || ''}` },
      });
      activeChildren.set(item.id, child);

      let lastErrorLines = [];

      function parseProgress(line) {
        if (line.includes('[download]') && line.includes('%')) {
          const pctMatch = line.match(/([\d.]+)%/);
          if (pctMatch) return parseFloat(pctMatch[1]);
        }
        const pctMatch = line.match(/([\d.]+)%/);
        if (pctMatch) return parseFloat(pctMatch[1]);
        return null;
      }

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const progress = parseProgress(line);
          if (progress !== null && progress >= 0 && progress <= 100) {
            const speed = line.includes('at ')
              ? line.split('at ')[1]?.split(' ')[0]?.replace(/s\/s$/, '/s') || null
              : null;
            const eta = line.includes('ETA')
              ? line.substring(line.indexOf('ETA') + 3).trim()
              : null;
            updateItem(item.id, { progress });
            sendToWindow('queue-progress', { id: item.id, progress, speed, eta });
          }
        }
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const progress = parseProgress(line);
          if (progress !== null && progress >= 0 && progress <= 100) {
            const speed = line.includes('at ')
              ? line.split('at ')[1]?.split(' ')[0]?.replace(/s\/s$/, '/s') || null
              : null;
            const eta = line.includes('ETA')
              ? line.substring(line.indexOf('ETA') + 3).trim()
              : null;
            updateItem(item.id, { progress });
            sendToWindow('queue-progress', { id: item.id, progress, speed, eta });
          }
          if (line.includes('ERROR:') || line.includes('error:')) {
            lastErrorLines.push(line);
            if (lastErrorLines.length > 3) lastErrorLines.shift();
          }
        }
      });

      child.on('error', (err) => {
        activeChildren.delete(item.id);
        reject(new Error(`Error al ejecutar yt-dlp: ${err.message}`));
      });

      child.on('close', (code) => {
        activeChildren.delete(item.id);
        if (code === 0) {
          resolve(basePath);
        } else {
          const errMsg = lastErrorLines.length > 0
            ? lastErrorLines.join(' | ').replace(/ERROR:\s*/g, '').replace(/\[youtube\]\s*/g, '')
            : `yt-dlp falló con código: ${code}`;
          reject(new Error(errMsg));
        }
      });
    });
  }

  async function getQueueData() {
    const all = queueStore.get('items');
    const stats = {
      pending: all.filter(i => i.status === 'pending').length,
      downloading: all.filter(i => i.status === 'downloading').length,
      completed: all.filter(i => i.status === 'completed').length,
      failed: all.filter(i => i.status === 'failed').length,
      total: all.length,
    };
    return { items: all, stats };
  }
};
