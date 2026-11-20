// Tipos compartidos del frontend. Viven acá para que los componentes no
// dependan de App.tsx y el monolito no vuelva a crecer.

export interface ScannedTrack {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string | null;
  track_number?: number | null;
  duration: number;
  duration_str: string;
  format: string;
  bitrate_kbps?: number | null;
  cover_url: string | null;
  year: number | null;
  genre: string | null;
  file_size: number;
}

export interface LyricsSearchResult {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  instrumental: boolean;
  plain_lyrics: string;
  synced_lyrics: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface PlaylistInfo {
  title: string;
  uploader: string;
  track_count: number;
  items: OnlineSearchResult[];
}

export type CatalogSource = 'itunes' | 'deezer' | 'musicbrainz';

export interface CatalogCandidate {
  source: CatalogSource;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  year?: string;
  genre?: string;
  track_number?: string;
  cover_url?: string;
}

// Álbum encontrado en el buscador del catálogo (pestaña "Álbumes").
export interface CatalogAlbum {
  source: CatalogSource;
  id: string; // id propio de la plataforma (collectionId, album id, release id)
  title: string;
  artist: string;
  year?: string;
  track_count: number;
  cover_url?: string;
}

// Pista dentro de un álbum abierto, lista para aplicarse a la canción en edición.
export interface CatalogAlbumTrack {
  id?: string | null;
  source: CatalogSource;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  year?: string;
  genre?: string;
  track_number?: string;
  cover_url?: string;
}

export interface OnlineSearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: string;
  thumbnail: string | null;
  url: string;
}

export interface DownloaderStatus {
  ytdlp_available: boolean;
  ffmpeg_available: boolean;
  ytdlp_path: string | null;
  ffmpeg_path: string | null;
}

export interface DownloadProgressEvent {
  id: string;
  progress: number;
  speed: string;
  eta: string;
  status: string;
  file_path: string | null;
}

export interface BatchUpdateResult {
  updated: ScannedTrack[];
  errors: string[];
}

export interface AppInfo {
  engine: string;
  rust_version: string;
  memory_usage: string;
  tracks_loaded: number;
}

export interface DownloadItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  progress: number;
  speed: string;
  eta: string;
  status: string;
  format: string;
  size: string;
  thumbnail?: string | null;
  outputDir?: string | null;
  filePath?: string | null;
  createdAt: number;
}

export interface ToolStatus {
  id: 'ytdlp' | 'ffmpeg';
  nombre: string;
  instalada: boolean;
  en_bin: boolean;
  ruta: string | null;
  version: string;
}

export interface ToolProgress {
  tool: string;
  descargado: number;
  total: number;
  estado: string;
}

export type ThemeMode =
  | 'space'
  | 'sumie'
  | 'byobu'
  | 'shoji'
  | 'origami'
  | 'swiss'
  | 'sumiink'
  | 'moonlit'
  | 'ledger'
  | 'shonen'
  | 'ghost'
  | 'samurai'
  | 'kawaii'
  | 'manga'
  | 'yoru'
  | 'hanabi'
  | 'aizuri';

export interface ThemeOption {
  id: string;
  nombre: string;
  descripcion: string;
}
export type AppTab = 'home' | 'search' | 'library' | 'queue' | 'playlists' | 'settings';
export type PlayerStyle = 'floating' | 'fixed' | 'mini';
export type ViewMode =
  'folders' | 'grid' | 'table' | 'albums' | 'mosaic' | 'cds' | 'tilt' | 'glow' | 'portadas';

export interface AlbumGroup {
  key: string;
  album: string;
  artist: string;
  year: number | null;
  cover_url: string | null;
  tracks: ScannedTrack[];
  totalDurationSec: number;
  formats: string[];
}

export interface FolderSubfolder {
  name: string;
  relativePath: string;
  trackCount: number;
  subfolderCount: number;
  sampleCoverUrl: string | null;
  formats: string[];
  tracks: ScannedTrack[];
}

export interface FolderExplorerData {
  subfolders: FolderSubfolder[];
  directTracks: ScannedTrack[];
  allFolderTracks: ScannedTrack[];
  currentPathStr: string;
  rootFolderName: string;
}

export interface Playlist {
  id: string;
  name: string;
  created_at: number;
  track_count: number;
}

export interface PlaylistDetail {
  playlist: Playlist;
  tracks: ScannedTrack[];
}
