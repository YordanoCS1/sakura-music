const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const YTDLP_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

const YTDLP_URL = process.platform === 'win32'
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

const FFMPEG_URL_WIN = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest, onProgress).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const total = parseInt(response.headers['content-length'], 10) || 0;
      let downloaded = 0;
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total && onProgress) {
          onProgress(`Descargando... ${Math.round((downloaded / total) * 100)}%`, Math.round((downloaded / total) * 100));
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function extractZip(zipPath, destDir, targetFile, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      onProgress?.('Extrayendo ffmpeg...', 50);
      for (const entry of entries) {
        if (entry.entryName.endsWith(targetFile) && !entry.isDirectory) {
          const buffer = entry.getData();
          fs.writeFileSync(path.join(destDir, targetFile), buffer);
          fs.chmodSync(path.join(destDir, targetFile), 0o755);
          break;
        }
      }
      fs.unlinkSync(zipPath);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function spawnCapture(exe, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      windowsHide: true,
      timeout: 10000,
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

async function getToolVersions() {
  const versions = { yt_dlp: null, ffmpeg: null };

  if (fs.existsSync(YTDLP_PATH)) {
    try {
      const result = await spawnCapture(YTDLP_PATH, ['--version']);
      versions.yt_dlp = result.trim() || 'installed';
    } catch {
      versions.yt_dlp = 'installed';
    }
  }

  if (fs.existsSync(FFMPEG_PATH)) {
    try {
      const result = await spawnCapture(FFMPEG_PATH, ['-version']);
      const match = result.match(/ffmpeg version (\S+)/);
      versions.ffmpeg = match?.[1] || 'installed';
    } catch {
      versions.ffmpeg = 'installed';
    }
  }

  return versions;
}

async function ensureDependencies(onProgress) {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  const needsYtDlp = !fs.existsSync(YTDLP_PATH);
  const needsFfmpeg = !fs.existsSync(FFMPEG_PATH);

  if (needsYtDlp) {
    onProgress?.('Descargando yt-dlp...', 10);
    await downloadFile(YTDLP_URL, YTDLP_PATH, (msg, pct) => {
      onProgress?.(msg, 10 + Math.round(pct * 0.4));
    });
    try { fs.chmodSync(YTDLP_PATH, 0o755); } catch {}
  }

  if (needsFfmpeg && process.platform === 'win32') {
    onProgress?.('Descargando ffmpeg...', 55);
    const zipPath = path.join(BIN_DIR, 'ffmpeg.zip');
    await downloadFile(FFMPEG_URL_WIN, zipPath, (msg, pct) => {
      onProgress?.(msg, 55 + Math.round(pct * 0.3));
    });
    onProgress?.('Extrayendo ffmpeg...', 85);
    await extractZip(zipPath, BIN_DIR, 'ffmpeg.exe', onProgress);
  }

  onProgress?.('Dependencias listas', 100);
  return { ytdlp: YTDLP_PATH, ffmpeg: FFMPEG_PATH };
}

async function updateYtDlp(onProgress) {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  onProgress?.('Actualizando yt-dlp...', 10);
  await downloadFile(YTDLP_URL, YTDLP_PATH, (msg, pct) => {
    onProgress?.(msg, Math.round(pct));
  });
  try { fs.chmodSync(YTDLP_PATH, 0o755); } catch {}
  onProgress?.('yt-dlp actualizado', 100);
  return true;
}

async function updateFfmpeg(onProgress) {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  if (process.platform !== 'win32') {
    onProgress?.('ffmpeg solo disponible en Windows', 100);
    return true;
  }
  onProgress?.('Actualizando ffmpeg...', 10);
  const zipPath = path.join(BIN_DIR, 'ffmpeg.zip');
  await downloadFile(FFMPEG_URL_WIN, zipPath, (msg, pct) => {
    onProgress?.(msg, Math.round(pct * 0.6));
  });
  onProgress?.('Extrayendo ffmpeg...', 70);
  await extractZip(zipPath, BIN_DIR, 'ffmpeg.exe', onProgress);
  onProgress?.('ffmpeg actualizado', 100);
  return true;
}

module.exports = { 
  ensureDependencies, 
  getToolVersions, 
  updateYtDlp,
  updateFfmpeg,
  YTDLP_PATH, 
  FFMPEG_PATH, 
  BIN_DIR
};