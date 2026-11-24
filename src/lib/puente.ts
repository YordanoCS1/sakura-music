/**
 * Capa de transporte del frontend. En escritorio usa el bridge de Tauri; en el
 * navegador del celular usa el servidor HTTP local. Así los componentes no
 * necesitan saber dónde se están ejecutando.
 */
import { invoke as invocarTauri } from '@tauri-apps/api/core';
import { listen as escucharTauri } from '@tauri-apps/api/event';
import { convertFileSrc as archivoTauri } from '@tauri-apps/api/core';
import { open as abrirTauri } from '@tauri-apps/plugin-dialog';

export function esEscritorio(): boolean {
  // En los tests unitarios se mockea el módulo de Tauri, así que se comporta
  // como escritorio aunque jsdom no tenga el bridge.
  if (import.meta.env.MODE === 'test') return true;
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Llama a un comando: Tauri en la PC, HTTP en el celular. */
export async function invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (esEscritorio()) return invocarTauri<T>(cmd, args);

  const respuesta = await fetch(`/api/cmd/${encodeURIComponent(cmd)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`;
    try {
      const cuerpo = (await respuesta.json()) as { error?: string };
      mensaje = cuerpo.error ?? mensaje;
    } catch {
      // El cuerpo no era JSON; se mantiene el mensaje genérico.
    }
    throw new Error(mensaje);
  }
  return (await respuesta.json()) as T;
}

/** Suscripción a eventos. En el celular no hay eventos push todavía: no-op. */
export async function listen<T>(
  evento: string,
  manejador: (evento: { payload: T }) => void,
): Promise<() => void> {
  if (esEscritorio()) return escucharTauri<T>(evento, manejador);
  return () => undefined;
}

/** Abre un diálogo nativo en la PC; en el celular no hay selector de archivos. */
export async function open(
  opciones: Parameters<typeof abrirTauri>[0],
): Promise<Awaited<ReturnType<typeof abrirTauri>>> {
  if (!esEscritorio()) return null as Awaited<ReturnType<typeof abrirTauri>>;
  return abrirTauri(opciones);
}

/** Manda una acción de reproducción al servidor (sólo tiene efecto en el celular). */
export async function accionRemota(ruta: string): Promise<void> {
  if (esEscritorio()) return;
  try {
    await fetch(`/api/${ruta}`, { method: 'POST' });
  } catch {
    // La PC puede no estar respondiendo; el estado se re-sincroniza al pollear.
  }
}

/** Convierte una ruta local en una URL visible: asset:// en PC, HTTP en celular. */
export function convertFileSrc(ruta: string): string {
  if (esEscritorio()) return archivoTauri(ruta);
  return `/api/archivo?path=${encodeURIComponent(ruta)}`;
}
