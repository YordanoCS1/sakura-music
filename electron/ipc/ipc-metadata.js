const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);
const fetch = require('node-fetch');

module.exports = (ipcMain, mainWindow) => {
  
  // Guardar metadatos en el archivo
  ipcMain.handle('save_metadata', async (_, { filePath, metadata }) => {
    const { title, artist, album, year, track, genre, lyrics, coverPath } = metadata;
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      if (ext === '.mp3') {
        // Usar node-id3 para MP3
        const NodeID3 = require('node-id3');
        const tags = {
          title: title || undefined,
          artist: artist || undefined,
          album: album || undefined,
          year: year || undefined,
          trackNumber: track || undefined,
          genre: genre || undefined,
        };
        if (lyrics) {
          tags.unsynchronisedLyrics = { language: 'eng', shortText: '', text: lyrics };
        }
        if (coverPath && fs.existsSync(coverPath)) {
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Cover',
            imageBuffer: fs.readFileSync(coverPath),
          };
        }
        await NodeID3.update(tags, filePath);
        
      } else if (['.m4a', '.aac', '.mp4', '.flac', '.ogg', '.opus'].includes(ext)) {
        const ffmpegPath = path.join(app.getPath('userData'), 'bin', 
          process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        
        if (fs.existsSync(ffmpegPath)) {
          const tempPath = filePath + '.tmp' + ext;
          const args = ['-i', filePath];
          
          if (coverPath && fs.existsSync(coverPath)) {
            args.push('-i', coverPath, '-map', '0:a', '-map', '1:v', '-disposition:v', 'attached_pic');
          }
          
          args.push('-c', 'copy');
          if (title) args.push('-metadata', `title=${title}`);
          if (artist) args.push('-metadata', `artist=${artist}`);
          if (album) args.push('-metadata', `album=${album}`);
          if (year) args.push('-metadata', `year=${year}`);
          if (track) args.push('-metadata', `track=${track}`);
          if (genre) args.push('-metadata', `genre=${genre}`);
          if (lyrics) args.push('-metadata', `lyrics=${lyrics}`);
          args.push('-y', tempPath);
          
          await execFilePromise(ffmpegPath, args);
          
          fs.unlinkSync(filePath);
          fs.renameSync(tempPath, filePath);
        }
      }
      
      // Si el título cambió, renombrar el archivo
      let newPath = filePath;
      if (title && title !== path.basename(filePath, ext)) {
        const safeName = title.replace(/[<>:"/\\|?*]/g, '').trim();
        newPath = path.join(path.dirname(filePath), safeName + ext);
        if (!fs.existsSync(newPath) && newPath !== filePath) {
          fs.renameSync(filePath, newPath);
        }
      }
      
      return { success: true, newPath };
    } catch (error) {
      console.error('Error saving metadata:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Buscar portadas en iTunes
  ipcMain.handle('fetch_itunes_cover', async (_, { artist, title }) => {
    try {
      const query = encodeURIComponent(`${artist} ${title}`);
      const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=12`;
      const response = await fetch(url);
      const data = await response.json();
      
      return (data.results || []).map(item => ({
        url: item.artworkUrl100?.replace('100x100', '1000x1000') || item.artworkUrl100,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
      }));
    } catch (error) {
      console.error('Error fetching covers:', error);
      return [];
    }
  });
  
  // Abrir selector de imágenes y leer como data URL
  ipcMain.handle('dialog:openImage', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar imagen de portada',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const imagePath = result.filePaths[0];
    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp', '.gif': 'image/gif' };
    const mime = mimeMap[ext] || 'image/jpeg';
    const base64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    return { path: imagePath, dataUrl: `data:${mime};base64,${base64}` };
  });

  // Guardar data URL (base64) a archivo temporal
  ipcMain.handle('save_base64_to_temp', async (_, { dataUrl }) => {
    try {
      const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) return null;
      const ext = matches[1].includes('png') ? '.png' : '.jpg';
      const buffer = Buffer.from(matches[2], 'base64');
      const tempPath = path.join(app.getPath('temp'), `sakura-cover-${Date.now()}${ext}`);
      fs.writeFileSync(tempPath, buffer);
      return tempPath;
    } catch (error) {
      console.error('Error saving base64 to temp:', error);
      return null;
    }
  });

  // Buscar canciones en iTunes con metadatos completos
  ipcMain.handle('fetch_itunes_song', async (_, { query }) => {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`;
      const response = await fetch(url);
      const data = await response.json();
      return (data.results || []).map(item => ({
        trackId: item.trackId,
        title: item.trackName || null,
        artist: item.artistName || null,
        album: item.collectionName || null,
        year: item.releaseDate ? item.releaseDate.slice(0, 4) : null,
        track: item.trackNumber ? String(item.trackNumber) : null,
        trackCount: item.trackCount || null,
        genre: item.primaryGenreName || null,
        cover: item.artworkUrl100?.replace('100x100', '1000x1000') || item.artworkUrl100,
        duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : null,
      }));
    } catch (error) {
      console.error('Error fetching songs:', error);
      return [];
    }
  });

  // Descargar imagen de portada a un archivo temporal
  ipcMain.handle('download_cover_to_temp', async (_, { imageUrl }) => {
    try {
      const tempPath = path.join(app.getPath('temp'), `sakura-cover-${Date.now()}.jpg`);
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      fs.writeFileSync(tempPath, buffer);
      return tempPath;
    } catch (error) {
      console.error('Error downloading cover:', error);
      return null;
    }
  });

  // Buscar portada en iTunes + Cover Art Archive por nombre de carpeta
  ipcMain.handle('fetch_folder_cover', async (_, { folderName }) => {
    try {
      if (!folderName || typeof folderName !== 'string') return [];
      const results = [];

      // 1. iTunes: álbumes (25)
      try {
        const itRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(folderName)}&entity=album&limit=25`
        );
        const itData = await itRes.json();
        for (const item of itData.results || []) {
          const art = item.artworkUrl100?.replace('100x100', '600x600');
          if (art) results.push({ url: art, album: item.collectionName || '', artist: item.artistName || '' });
        }
      } catch (e) { console.error('iTunes error:', e.message); }

      // 2. MusicBrainz → Cover Art Archive: portadas de álbumes (25)
      try {
        const mbRes = await fetch(
          `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(folderName)}&fmt=json&limit=25&type=album`,
          { headers: { 'User-Agent': 'SakuraMusic/1.0 (sakuramusic.app)' } }
        );
        const mbData = await mbRes.json();
        for (const rg of mbData['release-groups'] || []) {
          const artist = (rg['artist-credit']?.[0]?.artist?.name) || (rg['artist-credit']?.[0]?.name) || 'Desconocido';
          const rgUrl = `https://coverartarchive.org/release-group/${rg.id}/front`;
          if (!results.some(r => r.url === rgUrl))
            results.push({ url: rgUrl, album: rg.title, artist });
        }
      } catch (e) { console.error('Cover Art Archive error:', e.message); }

      return results;
    } catch (error) {
      console.error('Error fetching folder cover:', error);
      return [];
    }
  });

  // Buscar artista en Deezer + Wikidata/Commons
  ipcMain.handle('fetch_artist_cover', async (_, { artistName }) => {
    try {
      if (!artistName || typeof artistName !== 'string') return [];
      const results = [];

      // 1. Deezer: fotos de perfil de artistas
      try {
        const [arRes, trRes] = await Promise.all([
          fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=10`),
          fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artistName)}&limit=15&order=RANKING`),
        ]);
        const arData = await arRes.json();
        for (const item of arData.data || [])
          results.push({ url: item.picture_xl || item.picture_big, name: item.name, source: 'Deezer' });
        const trData = await trRes.json();
        for (const item of trData.data || []) {
          const pic = item.artist?.picture_xl || item.artist?.picture_big;
          if (pic) {
            const name = item.artist?.name || artistName;
            if (!results.some(r => r.url === pic))
              results.push({ url: pic, name, source: 'Deezer' });
          }
        }
      } catch (e) { console.error('Deezer error:', e.message); }

      // 2. MusicBrainz → Wikidata → Wikimedia Commons: foto oficial del artista
      try {
        const mbRes = await fetch(
          `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`,
          { headers: { 'User-Agent': 'SakuraMusic/1.0 (sakuramusic.app)' } }
        );
        const mbData = await mbRes.json();
        const artist = (mbData.artists || [])[0];
        if (!artist) return results;

        const relRes = await fetch(
          `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels&fmt=json`,
          { headers: { 'User-Agent': 'SakuraMusic/1.0 (sakuramusic.app)' } }
        );
        const relData = await relRes.json();
        const wikiRel = (relData.relations || []).find(r => r.type === 'wikidata');
        if (wikiRel) {
          const qid = wikiRel.url.resource.split('/').pop();
          const wdRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
          const wdData = await wdRes.json();
          const entity = wdData.entities?.[qid];
          const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
          if (p18) {
            results.push({
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18.replace(/ /g, '_'))}`,
              name: artist.name,
              source: 'Wikimedia Commons',
            });
          }
        }
      } catch (e) { console.error('Commons error:', e.message); }

      return results;
    } catch (error) {
      console.error('Error fetching artist cover:', error);
      return [];
    }
  });

  // Descargar portada y guardarla como folder.jpg dentro de la carpeta
  ipcMain.handle('save_folder_cover', async (_, { folderPath, imageUrl }) => {
    try {
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      const coverPath = path.join(folderPath, 'folder.jpg');
      fs.writeFileSync(coverPath, buffer);
      return coverPath;
    } catch (error) {
      console.error('Error saving folder cover:', error);
      return null;
    }
  });
};