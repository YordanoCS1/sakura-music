import type { ThemeMode } from '../types';

/** Arquetipo estructural que replica un tema propio ya implementado. */
export type Arquetipo = Exclude<ThemeMode, never>;

export interface TemaPersonalizado {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Define la estructura de Home, biblioteca, barra superior, Buscar y Cola. */
  base: Arquetipo;
  /** CSS generado por el generador de temas. Se inyecta en runtime. */
  css: string;
}

const CLAVE = 'sakura_temas_personalizados';

const ARQUETIPOS: Arquetipo[] = [
  'sumie',
  'byobu',
  'shoji',
  'origami',
  'swiss',
  'sumiink',
  'moonlit',
  'ledger',
  'shonen',
  'ghost',
  'samurai',
  'kawaii',
  'manga',
  'sakura',
  'loto',
  'ukiyo',
  'vinilo',
  'karesansui',
];

function esValido(dato: unknown): dato is TemaPersonalizado {
  if (!dato || typeof dato !== 'object') return false;
  const tema = dato as Partial<TemaPersonalizado>;
  return (
    typeof tema.id === 'string' &&
    tema.id.length > 0 &&
    typeof tema.nombre === 'string' &&
    typeof tema.base === 'string' &&
    ARQUETIPOS.includes(tema.base as Arquetipo) &&
    typeof tema.css === 'string'
  );
}

export function temasPersonalizados(): TemaPersonalizado[] {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (!guardado) return [];
    const datos: unknown = JSON.parse(guardado);
    return Array.isArray(datos) ? datos.filter(esValido) : [];
  } catch {
    return [];
  }
}

export function guardarTemaPersonalizado(tema: TemaPersonalizado): TemaPersonalizado[] {
  const lista = [...temasPersonalizados().filter((t) => t.id !== tema.id), tema];
  localStorage.setItem(CLAVE, JSON.stringify(lista));
  return lista;
}

export function borrarTemaPersonalizado(id: string): TemaPersonalizado[] {
  const lista = temasPersonalizados().filter((tema) => tema.id !== id);
  localStorage.setItem(CLAVE, JSON.stringify(lista));
  return lista;
}

const TEMAS_OFICIALES: ThemeMode[] = [
  'space',
  'sumie',
  'byobu',
  'shoji',
  'origami',
  'swiss',
  'sumiink',
  'moonlit',
  'ledger',
  'shonen',
  'ghost',
  'samurai',
  'kawaii',
  'manga',
  'sakura',
  'loto',
  'ukiyo',
  'vinilo',
  'karesansui',
];

export function baseDelTema(id: string, temas = temasPersonalizados()): ThemeMode {
  const encontrado = temas.find((tema) => tema.id === id)?.base;
  if (encontrado && TEMAS_OFICIALES.includes(encontrado)) return encontrado;
  return TEMAS_OFICIALES.includes(id as ThemeMode) ? (id as ThemeMode) : 'space';
}

export function esTemaPersonalizado(id: string, temas = temasPersonalizados()): boolean {
  return temas.some((tema) => tema.id === id);
}

/** Inyecta el CSS de los temas importados sin tocar archivos del proyecto. */
export function inyectarEstilos(temas: TemaPersonalizado[]): void {
  let estilo = document.getElementById('sakura-temas-personalizados');
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = 'sakura-temas-personalizados';
    document.head.appendChild(estilo);
  }
  estilo.textContent = temas.map((tema) => tema.css).join('\n');
}
