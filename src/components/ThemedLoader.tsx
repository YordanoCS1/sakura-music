import type { ThemeMode } from '../types';

interface ThemedLoaderProps {
  theme: ThemeMode;
  etiqueta?: string;
  pequeno?: boolean;
}

/** Indicador de carga con el vocabulario visual de cada tema. */
const VARIANTES: Partial<Record<ThemeMode, string>> = {
  space: 'petalo',
  sumie: 'enso',
  sumiink: 'enso',
  byobu: 'pincel',
  shoji: 'pincel',
  origami: 'pliegue',
  swiss: 'barras',
  moonlit: 'luna',
  ledger: 'barras',
  shonen: 'chispa',
  ghost: 'niebla',
  samurai: 'sello',
  kawaii: 'latido',
  manga: 'tramado',
};

export default function ThemedLoader({ theme, etiqueta, pequeno }: ThemedLoaderProps) {
  const variante = VARIANTES[theme] ?? 'petalo';
  return (
    <span
      className={`carga tema-${theme} carga-${variante} ${pequeno ? 'es-pequena' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="carga-marca" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {etiqueta && <span className="carga-texto">{etiqueta}</span>}
    </span>
  );
}
