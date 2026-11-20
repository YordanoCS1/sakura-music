/** Aviso de descarga terminada: notificación de Windows + tono por tema. */

const FRECUENCIAS: Record<string, number> = {
  space: 520,
  sumie: 330,
  byobu: 294,
  shoji: 392,
  origami: 587,
  swiss: 440,
  sumiink: 262,
  moonlit: 659,
  ledger: 349,
  shonen: 880,
  ghost: 523,
  samurai: 220,
  kawaii: 784,
  manga: 196,
};

export function pedirPermisoNotificaciones(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission().catch(() => {});
  }
}

export function notificarDescarga(titulo: string): void {
  const tema = localStorage.getItem('sakura_theme') ?? 'space';
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sakura Music', {
        body: `Descarga completada: ${titulo}`,
        silent: true,
      });
    }
  } catch {
    /* las notificaciones pueden estar bloqueadas por el sistema */
  }
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const oscilador = ctx.createOscillator();
    const volumen = ctx.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = FRECUENCIAS[tema] ?? 520;
    volumen.gain.setValueAtTime(0.0001, ctx.currentTime);
    volumen.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    oscilador.connect(volumen).connect(ctx.destination);
    oscilador.start();
    oscilador.stop(ctx.currentTime + 0.24);
    oscilador.onended = () => void ctx.close();
  } catch {
    /* audio bloqueado hasta la primera interacción: no es grave */
  }
}
