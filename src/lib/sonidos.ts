/** Sonidos de interfaz generados con WebAudio, uno por identidad de tema. */

type Tipo = 'open' | 'click' | 'confirm' | 'error';

type Voz = { frecuencia: number; tipo: OscillatorType; duracion: number; deslize?: number };

const VOCES: Record<string, Record<Tipo, Voz>> = {
  space: {
    open: { frecuencia: 660, tipo: 'sine', duracion: 0.09 },
    click: { frecuencia: 520, tipo: 'sine', duracion: 0.05 },
    confirm: { frecuencia: 784, tipo: 'sine', duracion: 0.11 },
    error: { frecuencia: 220, tipo: 'triangle', duracion: 0.12 },
  },
  sumie: {
    open: { frecuencia: 180, tipo: 'sine', duracion: 0.16 },
    click: { frecuencia: 140, tipo: 'sine', duracion: 0.08 },
    confirm: { frecuencia: 260, tipo: 'sine', duracion: 0.18 },
    error: { frecuencia: 90, tipo: 'sawtooth', duracion: 0.14 },
  },
  byobu: {
    open: { frecuencia: 220, tipo: 'triangle', duracion: 0.12 },
    click: { frecuencia: 180, tipo: 'triangle', duracion: 0.06 },
    confirm: { frecuencia: 330, tipo: 'triangle', duracion: 0.14 },
    error: { frecuencia: 110, tipo: 'sawtooth', duracion: 0.12 },
  },
  shoji: {
    open: { frecuencia: 420, tipo: 'sine', duracion: 0.11 },
    click: { frecuencia: 360, tipo: 'sine', duracion: 0.05 },
    confirm: { frecuencia: 560, tipo: 'sine', duracion: 0.13 },
    error: { frecuencia: 160, tipo: 'triangle', duracion: 0.12 },
  },
  origami: {
    open: { frecuencia: 720, tipo: 'triangle', duracion: 0.08 },
    click: { frecuencia: 880, tipo: 'triangle', duracion: 0.04 },
    confirm: { frecuencia: 1040, tipo: 'triangle', duracion: 0.1 },
    error: { frecuencia: 240, tipo: 'sine', duracion: 0.1 },
  },
  swiss: {
    open: { frecuencia: 440, tipo: 'square', duracion: 0.05 },
    click: { frecuencia: 660, tipo: 'square', duracion: 0.03 },
    confirm: { frecuencia: 880, tipo: 'square', duracion: 0.07 },
    error: { frecuencia: 165, tipo: 'square', duracion: 0.09 },
  },
  sumiink: {
    open: { frecuencia: 130, tipo: 'sine', duracion: 0.18 },
    click: { frecuencia: 110, tipo: 'sine', duracion: 0.09 },
    confirm: { frecuencia: 196, tipo: 'sine', duracion: 0.2 },
    error: { frecuencia: 70, tipo: 'sawtooth', duracion: 0.16 },
  },
  moonlit: {
    open: { frecuencia: 523, tipo: 'sine', duracion: 0.14 },
    click: { frecuencia: 659, tipo: 'sine', duracion: 0.06 },
    confirm: { frecuencia: 880, tipo: 'sine', duracion: 0.16 },
    error: { frecuencia: 196, tipo: 'triangle', duracion: 0.14 },
  },
  ledger: {
    open: { frecuencia: 300, tipo: 'triangle', duracion: 0.1 },
    click: { frecuencia: 240, tipo: 'triangle', duracion: 0.05 },
    confirm: { frecuencia: 400, tipo: 'triangle', duracion: 0.12 },
    error: { frecuencia: 120, tipo: 'square', duracion: 0.1 },
  },
  shonen: {
    open: { frecuencia: 880, tipo: 'sawtooth', duracion: 0.07, deslize: 1.5 },
    click: { frecuencia: 1200, tipo: 'square', duracion: 0.04 },
    confirm: { frecuencia: 1320, tipo: 'sawtooth', duracion: 0.09, deslize: 1.4 },
    error: { frecuencia: 180, tipo: 'sawtooth', duracion: 0.12 },
  },
  ghost: {
    open: { frecuencia: 380, tipo: 'sine', duracion: 0.2 },
    click: { frecuencia: 440, tipo: 'sine', duracion: 0.09 },
    confirm: { frecuencia: 620, tipo: 'sine', duracion: 0.22 },
    error: { frecuencia: 150, tipo: 'sine', duracion: 0.18 },
  },
  samurai: {
    open: { frecuencia: 196, tipo: 'triangle', duracion: 0.13 },
    click: { frecuencia: 262, tipo: 'triangle', duracion: 0.06 },
    confirm: { frecuencia: 392, tipo: 'triangle', duracion: 0.16 },
    error: { frecuencia: 98, tipo: 'sawtooth', duracion: 0.14 },
  },
  kawaii: {
    open: { frecuencia: 988, tipo: 'sine', duracion: 0.09, deslize: 1.25 },
    click: { frecuencia: 1319, tipo: 'sine', duracion: 0.05 },
    confirm: { frecuencia: 1568, tipo: 'sine', duracion: 0.1, deslize: 1.2 },
    error: { frecuencia: 330, tipo: 'triangle', duracion: 0.12 },
  },
  manga: {
    open: { frecuencia: 165, tipo: 'square', duracion: 0.09 },
    click: { frecuencia: 220, tipo: 'square', duracion: 0.04 },
    confirm: { frecuencia: 330, tipo: 'square', duracion: 0.11 },
    error: { frecuencia: 82, tipo: 'sawtooth', duracion: 0.13 },
  },
};

let contexto: AudioContext | null = null;

function obtenerContexto(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    contexto ??= new Ctx();
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

export function sonidoUI(tema: string, tipo: Tipo): void {
  const ctx = obtenerContexto();
  if (!ctx) return;
  const voz = VOCES[tema]?.[tipo] ?? VOCES.space[tipo];
  const oscilador = ctx.createOscillator();
  const volumen = ctx.createGain();
  oscilador.type = voz.tipo;
  oscilador.frequency.setValueAtTime(voz.frecuencia, ctx.currentTime);
  if (voz.deslize) {
    oscilador.frequency.exponentialRampToValueAtTime(
      voz.frecuencia * voz.deslize,
      ctx.currentTime + voz.duracion,
    );
  }
  volumen.gain.setValueAtTime(0.0001, ctx.currentTime);
  volumen.gain.exponentialRampToValueAtTime(
    tipo === 'click' ? 0.025 : 0.045,
    ctx.currentTime + 0.008,
  );
  volumen.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + voz.duracion);
  oscilador.connect(volumen).connect(ctx.destination);
  oscilador.start();
  oscilador.stop(ctx.currentTime + voz.duracion + 0.01);
}
