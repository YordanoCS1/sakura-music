import type { AppTab } from '../types';

/**
 * Cada tema usa su propio conjunto de cinco glifos para la navegación.
 * Se mantienen caracteres (no imágenes) para que hereden color y tipografía
 * del tema y no necesiten assets extra.
 */
export const ICONOS_TEMA: Record<string, Record<AppTab, string>> = {
  space: {
    home: '桜',
    library: '▤',
    search: '⌕',
    queue: '☰',
    settings: '⚙',
    playlists: '♫',
    stats: '◫',
  },
  sumie: {
    home: '一',
    library: '巻',
    search: '尋',
    queue: '列',
    settings: '設',
    playlists: '譜',
    stats: '統',
  },
  byobu: {
    home: '屏',
    library: '巻',
    search: '探',
    queue: '列',
    settings: '設',
    playlists: '録',
    stats: '計',
  },
  shoji: {
    home: '障',
    library: '冊',
    search: '尋',
    queue: '列',
    settings: '設',
    playlists: '帖',
    stats: '冊',
  },
  origami: {
    home: '折',
    library: '本',
    search: '探',
    queue: '重',
    settings: '整',
    playlists: '綴',
    stats: '計',
  },
  swiss: {
    home: '▦',
    library: '▤',
    search: '⌕',
    queue: '☰',
    settings: '⊞',
    playlists: '▤',
    stats: '▦',
  },
  sumiink: {
    home: '墨',
    library: '巻',
    search: '索',
    queue: '列',
    settings: '設',
    playlists: '巻',
    stats: '統',
  },
  moonlit: {
    home: '☾',
    library: '✧',
    search: '⌕',
    queue: '☰',
    settings: '✦',
    playlists: '✦',
    stats: '★',
  },
  ledger: {
    home: '帳',
    library: '録',
    search: '検',
    queue: '列',
    settings: '設',
    playlists: '目',
    stats: '帳',
  },
  shonen: {
    home: '⚡',
    library: '▣',
    search: '⌕',
    queue: '☰',
    settings: '⚙',
    playlists: '★',
    stats: '⚡',
  },
  ghost: {
    home: '☻',
    library: '▤',
    search: '⌕',
    queue: '☰',
    settings: '✧',
    playlists: '☷',
    stats: '☷',
  },
  samurai: {
    home: '侍',
    library: '巻',
    search: '探',
    queue: '列',
    settings: '整',
    playlists: '陣',
    stats: '陣',
  },
  kawaii: {
    home: '♡',
    library: '✿',
    search: '⌕',
    queue: '☁',
    settings: '♡',
    playlists: '♬',
    stats: '♡',
  },
  manga: {
    home: '話',
    library: '巻',
    search: '探',
    queue: '列',
    settings: '設',
    playlists: '目',
    stats: '漫',
  },
};

/** Estilo tipográfico de los glifos, por tema. */
export const ESTILO_ICONOS: Record<string, 'kanji' | 'symbol' | 'mono'> = {
  sumie: 'kanji',
  byobu: 'kanji',
  shoji: 'kanji',
  origami: 'kanji',
  sumiink: 'kanji',
  ledger: 'kanji',
  samurai: 'kanji',
  swiss: 'mono',
  ghost: 'symbol',
  moonlit: 'symbol',
  shonen: 'symbol',
  kawaii: 'symbol',
  manga: 'kanji',
  space: 'symbol',
};

export function iconosDe(tema: string): Record<AppTab, string> {
  return ICONOS_TEMA[tema] ?? ICONOS_TEMA.space;
}

export function estiloIconos(tema: string): 'kanji' | 'symbol' | 'mono' {
  return ESTILO_ICONOS[tema] ?? 'symbol';
}
