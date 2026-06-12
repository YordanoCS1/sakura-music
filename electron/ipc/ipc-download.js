const { app } = require('electron');
const { execFileSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { updateYtDlp } = require('../core/dependency-manager');

const YTDLP_PATH = path.join(app.getPath('userData'), 'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const FFMPEG_PATH = path.join(app.getPath('userData'), 'bin',
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

// Registro global de procesos activos — se limpia en before-quit
const activeProcesses = new Set();
app.on('before-quit', () => {
  for (const child of activeProcesses) {
    try { child.kill('SIGKILL'); } catch (_) {}
  }
  activeProcesses.clear();
});

/**
 * Envuelve valores con espacios en comillas dobles para que yt-dlp
 * los pase correctamente a ffmpeg sin dividirlos por espacios.
 */
function quoteForYtdlp(value) {
  if (typeof value === 'string' && value.includes(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return String(value);
}

function getYtdlpVersion() {
  try {
    const result = execFileSync(YTDLP_PATH, ['--version'], { encoding: 'utf-8', timeout: 5000 });
    return result.trim() || 'desconocida';
  } catch { return 'error al leer'; }
}

function extractYtdlpError(stderr) {
  if (!stderr) return 'Error desconocido';
  const lines = stderr.split('\n').filter(l => l.includes('ERROR:'));
  if (lines.length > 0) {
    const msg = lines[0].replace(/^.*?ERROR:\s*/, '').trim();
    if (msg.includes('Video unavailable')) return 'El video no está disponible o fue eliminado';
    if (msg.includes('Private video')) return 'El video es privado. Necesitas cookies del navegador.';
    if (msg.includes('Sign in to confirm your age')) return 'Contenido con restricción de edad. Ve a Ajustes y selecciona tu navegador.';
    if (msg.includes('Sign in to confirm') || msg.includes('bot')) return 'YouTube requiere autenticación. En Ajustes > Cookies selecciona tu navegador o actualiza yt-dlp en Ajustes > Herramientas.';
    if (msg.includes('not available in your country') || msg.includes('blocked')) return 'El video no está disponible en tu región';
    if (msg.includes('Unsupported URL') || msg.includes('not a valid URL')) return 'URL no soportada por yt-dlp';
    if (msg.includes('Requested format is not available')) return 'Formato de video no disponible. Intenta con otro video o usa cookies.';
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('Connection')) return 'Error de conexión. Verifica tu internet.';
    if (msg.includes('ffmpeg') || msg.includes('Postprocessing')) return 'Error al convertir el audio. Intenta con otro formato.';
    if (msg.includes('HTTP Error')) return `Error HTTP al descargar. ${msg}`;
    return msg.split('\n')[0].substring(0, 200);
  }
  return 'Error desconocido. Intenta de nuevo.';
}

module.exports = (ipcMain, mainWindow) => {

  function sendToWindow(event, data) {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      try { mainWindow.webContents.send(event, data); } catch {}
    }
  }

  ipcMain.handle('get_video_info', async (_, { url, cookieBrowser }) => {
    const hasCookies = cookieBrowser && cookieBrowser !== 'none';

    async function tryFetch(client) {
      const args = client
        ? ['--dump-json', '--no-playlist', '--no-warnings', '--ignore-no-formats-error', '--extractor-args', `youtube:player_client=${client}`]
        : ['--dump-json', '--no-playlist', '--no-warnings', '--ignore-no-formats-error'];

      const isPlaylist = url.includes('playlist') || url.includes('list=');
      if (isPlaylist) {
        const idx = args.indexOf('--no-playlist');
        if (idx !== -1) args.splice(idx, 1);
        args.push('--flat-playlist');
      }

      if (hasCookies) {
        args.push('--cookies-from-browser', cookieBrowser);
      }

      args.push(url);

      try {
        const output = execFileSync(YTDLP_PATH, args, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        });

        if (isPlaylist) {
          const entries = output.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
          return {
            is_playlist: true,
            title: entries[0]?.playlist_title || entries[0]?.title || 'Playlist',
            entries: entries.map(e => ({
              id: e.id,
              title: e.title,
              url: e.url || e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`,
              duration: e.duration,
              thumbnail: e.thumbnail,
              uploader: e.uploader || e.channel
            }))
          };
        }

        const raw = JSON.parse(output);
        return {
          id: raw.id,
          title: raw.title,
          uploader: raw.uploader || raw.channel || 'Desconocido',
          duration: raw.duration,
          thumbnail: raw.thumbnail,
          url: raw.webpage_url || raw.url || `https://www.youtube.com/watch?v=${raw.id}`,
          is_playlist: false,
        };
      } catch (error) {
        const stderr = error.stderr?.toString() || '';
        console.error(`Error with client "${client}":`, stderr);
        if (stderr.includes('Sign in to confirm') || stderr.includes('bot') || stderr.includes('could not find') || stderr.includes('cookies database')) {
          return { _error: 'sign_in', _stderr: stderr };
        }
        throw new Error(extractYtdlpError(stderr));
      }
    }

    if (hasCookies) {
      // With cookies — try default client first (no forced extractor-args)
      let result = await tryFetch(null);
      if (result._error !== 'sign_in') return result;
      // If default fails, try each client with cookies
      for (const client of ['ios', 'android', 'web_creator', 'web']) {
        result = await tryFetch(client);
        if (result._error !== 'sign_in') return result;
      }
    } else {
      // Without cookies — try each client sequentially
      for (const client of ['ios', 'android', 'web_creator', 'web']) {
        const result = await tryFetch(client);
        if (result._error !== 'sign_in') return result;
      }
    }

    // All failed — try update yt-dlp and retry
    console.log('yt-dlp version before update:', getYtdlpVersion());
    try {
      await updateYtDlp(() => {});
      console.log('yt-dlp version after update:', getYtdlpVersion());
      const result = await tryFetch(hasCookies ? null : 'ios');
      if (result._error !== 'sign_in') return result;
    } catch (e) {
      console.error('Auto-update failed:', e.message);
    }

    const err = new Error(hasCookies
      ? `No se pudo acceder con cookies de "${cookieBrowser}". Cierra ${cookieBrowser} completamente, asegúrate de haber iniciado sesión en YouTube, y vuelve a intentar. Si persiste, actualiza yt-dlp desde Ajustes > Herramientas.`
      : 'YouTube requiere autenticación. Ve a Ajustes > Cookies, selecciona tu navegador, ciérralo y vuelve a intentar.');
    err._requiresCookies = true;
    throw err;
  });

  // ──────────────────────────────────────────────────────────────
  //  download_media — FIX: now returns a Promise that awaits the
  //  child process, so Electron stays alive until download ends.
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('download_media', async (_, { id, args: dlArgs }) => {
    const {
      url, format, quality, codec, title, artist, album,
      downloadPath, cookieBrowser, organize, embedCover = true
    } = dlArgs;

    const isVideoFormat = format === 'video';
    const ytArgs = [
      '--no-warnings', '--newline',
      '--js-runtimes', 'node',
      '--embed-metadata',
    ];

    // Respetar el toggle "Incrustar portada" del usuario
    if (embedCover !== false) {
      ytArgs.push('--embed-thumbnail');
    }

    if (format === 'mp3') {
      const bitrate = quality === 'audio_mp3_128' ? '5' : '0';
      ytArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', bitrate);
    } else if (format === 'm4a') {
      ytArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', 'm4a', '--audio-quality', '0');
    } else if (format === 'video') {
      const HEIGHT_MAP = { video_2160: 2160, video_1080: 1080, video_720: 720, video_480: 480, video_360: 360 };
      const maxH = HEIGHT_MAP[quality];
      const fmt = maxH ? `bestvideo[height<=${maxH}]+bestaudio/best` : 'bestvideo+bestaudio/best';
      ytArgs.push('-f', fmt, '--merge-output-format', 'mp4');
      if (codec && codec !== 'auto') {
        const codecSort = { av1: 'vcodec:av01,res,codec', vp9: 'vcodec:vp9,res,codec', h264: 'vcodec:h264,res,codec' };
        ytArgs.push('--format-sort', codecSort[codec] || 'res,codec');
      }
    }

    if (cookieBrowser && cookieBrowser !== 'none') {
      // Usar perfil default explícito para evitar problemas con el nombre del perfil
      const browserArg = cookieBrowser === 'firefox' ? 'firefox:default' : cookieBrowser;
      ytArgs.push('--cookies-from-browser', browserArg);
    }

    if (fs.existsSync(FFMPEG_PATH)) {
      ytArgs.push('--ffmpeg-location', FFMPEG_PATH);
    }

    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    const outputTemplate = organize
      ? path.join(downloadPath, '%(artist)s', '%(album)s', '%(title)s.%(ext)s')
      : path.join(downloadPath, '%(title)s.%(ext)s');
    ytArgs.push('-o', outputTemplate);

    if (title || artist || album) {
      const metaArgs = [];
      if (title)  metaArgs.push(`-metadata title=${quoteForYtdlp(title)}`);
      if (artist) metaArgs.push(`-metadata artist=${quoteForYtdlp(artist)}`);
      if (album)  metaArgs.push(`-metadata album=${quoteForYtdlp(album)}`);
      ytArgs.push('--postprocessor-args', `ffmpeg:${metaArgs.join(' ')}`);
    }

    ytArgs.push(url);

    console.log('Downloading:', url, 'format:', format);

    // Wrap spawn in a Promise so the IPC handler stays alive until download completes
    return new Promise((resolve) => {
      const child = spawn(YTDLP_PATH, ytArgs, { windowsHide: true });
      activeProcesses.add(child);

      let stderr = '';
      let progressSent = false;

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const match = line.match(/\[download\]\s+([\d.]+)%.*?at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/);
          if (match) {
            progressSent = true;
            sendToWindow('download-progress', {
              id,
              progress: parseFloat(match[1]),
              speed: match[2],
              eta: match[3]
            });
          }
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        const msg = data.toString();
        if (msg.includes('ERROR:')) {
          sendToWindow('download-error', { id, message: extractYtdlpError(stderr) });
        }
      });

      child.on('error', (err) => {
        activeProcesses.delete(child);
        sendToWindow('download-error', { id, message: err.message });
        resolve({ success: false, id, error: err.message });
      });

      child.on('close', (code) => {
        activeProcesses.delete(child);
        if (code === 0) {
          sendToWindow('download-completed', { id, title: title || 'Archivo' });
          resolve({ success: true, id });
        } else {
          const errMsg = extractYtdlpError(stderr) || `Proceso terminó con código ${code}`;
          sendToWindow('download-error', { id, message: errMsg });
          resolve({ success: false, id, error: errMsg });
        }
      });
    });
  });
};