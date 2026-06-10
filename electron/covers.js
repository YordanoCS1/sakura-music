const fs = require('fs');
const path = require('path');
const COVER_CACHE_MAX = 500;
const coverCache = new Map();

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const MIME_MAP = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp' };

function makeKey(filePath) {
  let key = filePath;
  try {
    const stat = fs.statSync(filePath);
    key = `${filePath}:${stat.mtimeMs}`;
  } catch {}
  return key;
}

// Called from ipc-library during metadata parsing to pre-populate cache
function primeCover(filePath, picture) {
  const key = makeKey(filePath);
  if (coverCache.has(key)) return;
  if (!picture || picture.length === 0) {
    coverCache.set(key, null);
    return;
  }
  const pic = picture[0];
  coverCache.set(key, { data: pic.data, format: pic.format });
  if (coverCache.size > COVER_CACHE_MAX) {
    const firstKey = coverCache.keys().next().value;
    if (firstKey) coverCache.delete(firstKey);
  }
}

async function getCover(filePath) {
  const key = makeKey(filePath);
  const cached = coverCache.get(key);
  if (cached !== undefined) return cached;

  // Handle image files directly (for folder covers)
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) {
    try {
      const data = fs.readFileSync(filePath);
      const result = { data, format: MIME_MAP[ext] || 'image/jpeg' };
      coverCache.set(key, result);
      if (coverCache.size > COVER_CACHE_MAX) {
        const firstKey = coverCache.keys().next().value;
        if (firstKey) coverCache.delete(firstKey);
      }
      return result;
    } catch {
      coverCache.set(key, null);
      return null;
    }
  }

  try {
    const { parseFile } = require('music-metadata');
    const meta = await parseFile(filePath, { duration: false, skipCovers: false });
    if (!meta.common.picture || meta.common.picture.length === 0) {
      coverCache.set(key, null);
      return null;
    }
    const pic = meta.common.picture[0];
    const result = { data: pic.data, format: pic.format };
    coverCache.set(key, result);
    if (coverCache.size > COVER_CACHE_MAX) {
      const firstKey = coverCache.keys().next().value;
      if (firstKey) coverCache.delete(firstKey);
    }
    return result;
  } catch {
    coverCache.set(key, null);
    return null;
  }
}

module.exports = { getCover, primeCover };
