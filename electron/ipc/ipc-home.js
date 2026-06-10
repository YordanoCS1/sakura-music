const { app } = require('electron');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const Store = require('electron-store');

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac', '.wma', '.aiff']);
const historyStore = new Store({ name: 'download-history', defaults: { items: [] } });

module.exports = (ipcMain, mainWindow) => {

  ipcMain.handle('get_home_stats', async () => {
    const libPath = historyStore.get('libraryPath') || app.getPath('music');
    let songCount = 0;
    let folderCount = 0;
    let totalBytes = 0;

    async function scanDir(dirPath) {
      try {
        const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) { folderCount++; await scanDir(fullPath); }
          else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (AUDIO_EXTS.has(ext)) {
              songCount++;
              try {
                const stat = await fsPromises.stat(fullPath);
                totalBytes += stat.size;
              } catch {}
            }
          }
        }
      } catch {}
    }

    try { await fsPromises.access(libPath); await scanDir(libPath); } catch {}

    const queueStore = new Store({ name: 'download-queue', defaults: { items: [] } });
    const queueItems = queueStore.get('items') || [];
    const queueStats = {
      pending: queueItems.filter(i => i.status === 'pending').length,
      downloading: queueItems.filter(i => i.status === 'downloading').length,
      completed: queueItems.filter(i => i.status === 'completed').length,
      failed: queueItems.filter(i => i.status === 'failed').length,
      total: queueItems.length,
    };

    const history = historyStore.get('items') || [];

    const gb = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);

    return {
      songCount,
      folderCount,
      totalSize: gb,
      totalBytes,
      queueStats,
      history: history.slice(0, 20),
    };
  });

  ipcMain.handle('add_download_history', async (_, item) => {
    const items = historyStore.get('items') || [];
    items.unshift({ ...item, downloadedAt: new Date().toISOString() });
    if (items.length > 200) items.length = 200;
    historyStore.set('items', items);
    return true;
  });

  ipcMain.handle('get_download_history', async () => {
    return (historyStore.get('items') || []).slice(0, 50);
  });

  ipcMain.handle('clear_download_history', async () => {
    historyStore.set('items', []);
    return true;
  });

  ipcMain.handle('add_recent_song', async (_, song) => {
    const key = 'recently_played';
    const items = historyStore.get(key) || [];
    const filtered = items.filter(i => i.path !== song.path);
    filtered.unshift({ ...song, playedAt: new Date().toISOString() });
    if (filtered.length > 50) filtered.length = 50;
    historyStore.set(key, filtered);
    return true;
  });

  ipcMain.handle('get_recent_songs', async () => {
    return (historyStore.get('recently_played') || []).slice(0, 10);
  });
};
