export interface SongMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  cover: string | null;
  duration: number | null;
  lyrics?: string | null;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  extension: string;
  is_audio: boolean;
  is_video: boolean;
  cover?: string | null;
}
