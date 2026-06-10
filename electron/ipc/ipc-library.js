const { app, shell } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { primeCover } = require('../covers');
const logger = require('../logger');

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac', '.wma', '.aiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
const METADATA_CACHE_MAX = 2000;
const DIR_CACHE_TTL = 2000; // 2 seconds

// Main-process metadata cache keyed by filePath + mtime
const metadataCache = new Map();
const dirCache = new Map();

function getDirCacheKey(dirPath) { return dirPath; }

module.exports = (ipcMain, mainWindow) => {
  
  // Listar directorio (async I/O + cache)
  ipcMain.handle('list_directory', async (_, { dirPath }) => {
    if (!dirPath) return [];
    const cacheKey = getDirCacheKey(dirPath);
    const cached = dirCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < DIR_CACHE_TTL) return cached.data;
    
    try {
      await fsp.access(dirPath);
    } catch { return []; }
    
    try {
      const dirents = await fsp.readdir(dirPath, { withFileTypes: true });
      const results = await Promise.all(dirents.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        let stats;
        try { stats = await fsp.stat(fullPath); } catch { return null; }
        const ext = path.extname(entry.name).toLowerCase();
        let cover = null;
        if (entry.isDirectory()) {
          for (const coverName of ['folder.jpg', 'cover.jpg', 'folder.png', 'cover.png']) {
            const coverPath = path.join(fullPath, coverName);
            try { await fsp.access(coverPath); cover = coverPath; break; } catch {}
          }
        }
        return {
          name: entry.name,
          path: fullPath,
          is_dir: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtimeMs,
          extension: ext,
          is_audio: AUDIO_EXTENSIONS.includes(ext),
          is_video: VIDEO_EXTENSIONS.includes(ext),
          cover,
        };
      }));
      
      const filtered = results.filter(Boolean).sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      dirCache.set(cacheKey, { ts: Date.now(), data: filtered });
      if (dirCache.size > 100) {
        const oldest = dirCache.keys().next().value;
        if (oldest) dirCache.delete(oldest);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error listing directory:', error);
      return [];
    }
  });
  
  // Leer metadatos de un archivo de audio
  ipcMain.handle('get_file_metadata', async (_, { filePath }) => {
    try {
      let cacheKey = filePath;
      try {
        const stat = await fsp.stat(filePath);
        cacheKey = `${filePath}:${stat.mtimeMs}`;
      } catch {}
      
      const cached = metadataCache.get(cacheKey);
      if (cached) return cached;
      
      const { parseFile } = require('music-metadata');
      const meta = await parseFile(filePath, { duration: true, skipCovers: false });
      const { common, format } = meta;

      // Prime cover cache so protocol handler doesn't re-parse
      primeCover(filePath, common.picture);

      const result = {
        title: common.title || null,
        artist: common.artist || null,
        album: common.album || null,
        year: common.year?.toString() || null,
        track: common.track?.no?.toString() || null,
        genre: common.genre?.[0] || null,
        duration: format.duration || null,
        bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
        sampleRate: format.sampleRate || null,
        codec: format.codec || null,
        cover: `sakura-cover:///${encodeURIComponent(filePath)}`,
        lyrics: common.lyrics?.[0] || null,
      };
      
      metadataCache.set(cacheKey, result);
      if (metadataCache.size > METADATA_CACHE_MAX) {
        const firstKey = metadataCache.keys().next().value;
        if (firstKey) metadataCache.delete(firstKey);
      }
      
      return result;
    } catch (err) {
      console.error('Error reading metadata:', err);
      return null;
    }
  });
  
  // Eliminar archivos (a la papelera)
  ipcMain.handle('lib_delete_files', async (_, { filePaths }) => {
    const deleted = [];
    for (const fp of filePaths) {
      try {
        await shell.trashItem(fp);
        deleted.push(fp);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    return deleted;
  });
};