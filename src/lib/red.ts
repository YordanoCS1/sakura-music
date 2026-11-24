/** Utilidades para el control remoto local (sin servidor ni dependencias). */

/** Puerto del servidor HTTP del control remoto, igual al de `remote.rs`. */
export const PUERTO_REMOTO = 17342;

/** Construye la URL que se muestra y se codifica en el QR. */
export function urlControlRemoto(ip: string): string {
  return `http://${ip}:${PUERTO_REMOTO}`;
}

/**
 * Indica si la IP es de una red local privada (RFC 1918). El QR solo tiene
 * sentido con estas direcciones: con `127.0.0.1` el celular se abriría a sí
 * mismo y con una IP pública estaríamos exponiendo el control remoto.
 */
export function esIpRedLocal(ip: string): boolean {
  const partes = ip.trim().split('.');
  if (partes.length !== 4) return false;
  const numeros = partes.map(Number);
  if (numeros.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = numeros;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}
