const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');
const logger = require('../logger');

const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const YTDLP_PATH = () => path.join(BIN_DIR, 
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_PATH(), args, {
      windowsHide: true,
      timeout: 30000,
    });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Exit code ${code}`));
    });
  });
}

function parseResults(output) {
  return output.trim().split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        const item = JSON.parse(line);
        return {
          id: item.id,
          title: item.title,
          uploader: item.uploader || item.channel || 'Desconocido',
          duration: item.duration,
          thumbnail: item.thumbnail,
          url: item.url || `https://www.youtube.com/watch?v=${item.id}`,
          view_count: item.view_count,
          uploaded_date: item.upload_date,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = (ipcMain, mainWindow) => {

  const BASE_ARGS = ['--no-warnings', '--no-check-certificate', '--user-agent', USER_AGENT];

  ipcMain.handle('search_youtube', async (_, { query, limit = 20 }) => {
    try {
      const args = [...BASE_ARGS, `ytsearch${limit}:${query}`, '--dump-json', '--flat-playlist'];
      const output = runYtdlp(args);
      return parseResults(output);
    } catch (error) {
      logger.error('Search error:', error.message);
      return [];
    }
  });

  ipcMain.handle('get_trending', async () => {
    try {
      const queries = ['ytsearch10:trending music', 'ytsearch10:viral hits', 'ytsearch10:popular music 2026'];
      const allResults = [];
      for (const q of queries) {
        try {
          const args = [...BASE_ARGS, q, '--dump-json', '--flat-playlist', '--playlist-end', '5'];
          const output = runYtdlp(args);
          allResults.push(...parseResults(output));
        } catch { /* skip failed queries */ }
      }
      const seen = new Set();
      return allResults.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }).slice(0, 20);
    } catch (error) {
      logger.error('Error fetching trending:', error.message);
      return [];
    }
  });
};