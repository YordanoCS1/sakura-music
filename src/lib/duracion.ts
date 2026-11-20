/** Convierte `3:58` o `1:02:03` a segundos; devuelve null si no se entiende. */
export function duracionASegundos(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const partes = valor
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (partes.some((p) => !Number.isFinite(p))) return null;
  if (partes.length === 3) return partes[0]! * 3600 + partes[1]! * 60 + partes[2]!;
  if (partes.length === 2) return partes[0]! * 60 + partes[1]!;
  return null;
}

export function pasaFiltroDuracion(
  valor: string | null | undefined,
  filtro: 'todas' | 'cortas' | 'medianas' | 'largas',
): boolean {
  if (filtro === 'todas') return true;
  const segundos = duracionASegundos(valor);
  if (segundos === null) return true;
  if (filtro === 'cortas') return segundos < 300;
  if (filtro === 'medianas') return segundos >= 300 && segundos <= 600;
  return segundos > 600;
}
