/** Notificaciones del sistema con carátula y acción «Ver biblioteca». */
import {
  isPermissionGranted,
  onAction,
  registerActionTypes,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { esEscritorio } from './puente';

const TIPO = 'sakura-descarga';
const ACCION_VER = 'ver-biblioteca';
let configurado = false;

/** Registra el tipo de acción y el listener. Debe correr antes de enviar. */
export async function configurarNotificaciones(alVerBiblioteca: () => void): Promise<void> {
  if (!esEscritorio() || configurado) return;
  configurado = true;
  try {
    await onAction((evento) => {
      if (evento.actionId === ACCION_VER || evento.actionId === 'tap') alVerBiblioteca();
    });
    await registerActionTypes([
      { id: TIPO, actions: [{ id: ACCION_VER, title: 'Ver biblioteca' }] },
    ]);
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    // Sin permiso o plataforma sin acciones: las notificaciones siguen funcionando.
  }
}

/** Avisa desde el sistema que una descarga terminó. */
export async function notificarDescarga(
  titulo: string,
  artista: string,
  caratula?: string | null,
): Promise<void> {
  if (!esEscritorio()) return;
  try {
    if (!(await isPermissionGranted())) {
      const permiso = await requestPermission();
      if (permiso !== 'granted') return;
    }
    sendNotification({
      title: 'Descarga completada',
      body: artista ? `${titulo} — ${artista}` : titulo,
      icon: caratula ?? undefined,
      actionTypeId: TIPO,
    });
  } catch {
    // El avatar o la plataforma no soportan notificaciones: no rompe la app.
  }
}
