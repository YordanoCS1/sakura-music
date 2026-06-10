const fetch = require('node-fetch');

const lyricsCache = new Map();
const LYRICS_CACHE_MAX = 500;
const pendingLyrics = new Map();

function cacheKey(title, artist) {
  return `${artist}|${title}`.toLowerCase().replace(/\s+/g, ' ');
}

module.exports = (ipcMain, mainWindow) => {
  
  ipcMain.handle('fetch_lyrics', async (_, { title, artist, album, duration }) => {
    if (!title) return { syncedLyrics: null, plainLyrics: null, source: null };

    const key = cacheKey(title, artist);
    const cached = lyricsCache.get(key);
    if (cached) return cached;

    if (pendingLyrics.has(key)) {
      return pendingLyrics.get(key);
    }

    const fetchPromise = doFetchLyrics(title, artist, album, duration).then(result => {
      lyricsCache.set(key, result);
      if (lyricsCache.size > LYRICS_CACHE_MAX) {
        const first = lyricsCache.keys().next().value;
        if (first) lyricsCache.delete(first);
      }
      pendingLyrics.delete(key);
      return result;
    }).catch(err => {
      pendingLyrics.delete(key);
      return { syncedLyrics: null, plainLyrics: null, source: null };
    });

    pendingLyrics.set(key, fetchPromise);
    return fetchPromise;
  });
};

async function doFetchLyrics(title, artist, album, duration) {
  // Intento 1: búsqueda exacta con duración
  try {
    const params = new URLSearchParams({
      artist_name: artist || '',
      track_name: title || '',
      album_name: album || '',
      duration: Math.round(duration || 0).toString(),
    });
    const url = `https://lrclib.net/api/get?${params}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return {
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
        source: 'lrclib',
      };
    }
  } catch (err) {
    console.error('Error fetching lyrics (exact):', err);
  }
  
  // Intento 2: búsqueda por nombre
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const url = `https://lrclib.net/api/search?q=${query}`;
    const response = await fetch(url);
    if (response.ok) {
      const results = await response.json();
      if (results.length > 0) {
        const best = results[0];
        return {
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          source: 'lrclib',
        };
      }
    }
  } catch (err) {
    console.error('Error fetching lyrics (search):', err);
  }
  
  return { syncedLyrics: null, plainLyrics: null, source: null };
}