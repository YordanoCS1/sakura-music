/** Atajos de teclado configurables, persistidos en localStorage. */

export type AccionAtajo =
  | 'paleta'
  | 'biblioteca'
  | 'buscar'
  | 'cola'
  | 'siguiente'
  | 'anterior'
  | 'playpause'
  | 'favorito'
  | 'reproductor';

export const ACCIONES: { id: AccionAtajo; etiqueta: string }[] = [
  { id: 'paleta', etiqueta: 'Paleta de comandos' },
  { id: 'biblioteca', etiqueta: 'Ir a Biblioteca' },
  { id: 'buscar', etiqueta: 'Ir a Buscar' },
  { id: 'cola', etiqueta: 'Ir a Cola' },
  { id: 'siguiente', etiqueta: 'Siguiente pista' },
  { id: 'anterior', etiqueta: 'Pista anterior' },
  { id: 'playpause', etiqueta: 'Reproducir / pausar' },
  { id: 'favorito', etiqueta: 'Favorito' },
  { id: 'reproductor', etiqueta: 'Activar / desactivar reproductor' },
];

const POR_DEFECTO: Record<AccionAtajo, string> = {
  paleta: 'Ctrl+K',
  biblioteca: 'Ctrl+1',
  buscar: 'Ctrl+2',
  cola: 'Ctrl+3',
  siguiente: 'Ctrl+Right',
  anterior: 'Ctrl+Left',
  playpause: 'Space',
  favorito: 'Ctrl+F',
  reproductor: 'Ctrl+P',
};

const CLAVE = 'sakura_atajos';

export function leerAtajos(): Record<AccionAtajo, string> {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<
      Record<AccionAtajo, string>
    >;
    return { ...POR_DEFECTO, ...guardado };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarAtajos(atajos: Record<AccionAtajo, string>): void {
  localStorage.setItem(CLAVE, JSON.stringify(atajos));
}

/** Normaliza un evento a la forma `Ctrl+K`, `Alt+Shift+P`, etc. */
export function teclaDelEvento(evento: KeyboardEvent): string {
  const partes: string[] = [];
  if (evento.ctrlKey) partes.push('Ctrl');
  if (evento.metaKey) partes.push('Meta');
  if (evento.altKey) partes.push('Alt');
  if (evento.shiftKey) partes.push('Shift');
  const tecla = evento.key.length === 1 ? evento.key.toUpperCase() : evento.key;
  partes.push(tecla);
  return partes.join('+');
}
