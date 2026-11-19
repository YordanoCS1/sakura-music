import type { AppTab } from '../types';

/**
 * Cada tema usa su propio conjunto de cinco glifos para la navegación.
 * Se mantienen caracteres (no imágenes) para que hereden color y tipografía
 * del tema y no necesiten assets extra.
 */
export const ICONOS_TEMA: Record<string, Record<AppTab, string>> = {
  space: { home: '桜', library: '▤', search: '⌕', queue: '☰', settings: '⚙' },
  sumie: { home: '一', library: '巻', search: '尋', queue: '列', settings: '設' },
  byobu: { home: '屏', library: '巻', search: '探', queue: '列', settings: '設' },
  shoji: { home: '障', library: '冊', search: '尋', queue: '列', settings: '設' },
  origami: { home: '折', library: '本', search: '探', queue: '重', settings: '整' },
  swiss: { home: '▦', library: '▤', search: '⌕', queue: '☰', settings: '⊞' },
  sumiink: { home: '墨', library: '巻', search: '索', queue: '列', settings: '設' },
  moonlit: { home: '☾', library: '✧', search: '⌕', queue: '☰', settings: '✦' },
  ledger: { home: '帳', library: '録', search: '検', queue: '列', settings: '設' },
  shonen: { home: '⚡', library: '▣', search: '⌕', queue: '☰', settings: '⚙' },
  ghost: { home: '☻', library: '▤', search: '⌕', queue: '☰', settings: '✧' },
  samurai: { home: '侍', library: '巻', search: '探', queue: '列', settings: '整' },
  kawaii: { home: '♡', library: '✿', search: '⌕', queue: '☁', settings: '♡' },
  yoru: { home: '夜', library: '灯', search: '探', queue: '列', settings: '設' },
  hanabi: { home: '✺', library: '▦', search: '⌕', queue: '☰', settings: '✧' },
  aizuri: { home: '藍', library: '巻', search: '探', queue: '列', settings: '設' },
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
  yoru: 'kanji',
  aizuri: 'kanji',
  swiss: 'mono',
  ghost: 'symbol',
  moonlit: 'symbol',
  shonen: 'symbol',
  kawaii: 'symbol',
  hanabi: 'symbol',
  space: 'symbol',
};

export function iconosDe(tema: string): Record<AppTab, string> {
  return ICONOS_TEMA[tema] ?? ICONOS_TEMA.space;
}

export function estiloIconos(tema: string): 'kanji' | 'symbol' | 'mono' {
  return ESTILO_ICONOS[tema] ?? 'symbol';
}
