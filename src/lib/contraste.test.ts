import { describe, expect, it } from 'vitest';

// Guardián de accesibilidad: si alguien cambia una paleta y rompe WCAG AA
// para texto normal (4.5:1), este test lo descubre antes del release.

function luminancia(color: string): number {
  const hex = color.replace('#', '');
  const completo =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16) / 255);
  const lineal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const PAREJAS: { tema: string; fondo: string; texto: string; suave?: string }[] = [
  { tema: 'space', fondo: '#fff9f6', texto: '#2b1521', suave: '#8a6577' },
  { tema: 'sumie', fondo: '#f4efe6', texto: '#1c1a17', suave: '#6b6459' },
  { tema: 'byobu', fondo: '#0e0c0b', texto: '#ece3d6', suave: '#a49a8d' },
  { tema: 'shoji', fondo: '#f3ebd9', texto: '#2c241a', suave: '#6f604a' },
  { tema: 'origami', fondo: '#fdf5f7', texto: '#402631', suave: '#7a5f6e' },
  { tema: 'swiss', fondo: '#f2f2f0', texto: '#111111', suave: '#666666' },
  { tema: 'sumiink', fondo: '#0c0c0c', texto: '#e8e5dd', suave: '#9a968c' },
  { tema: 'moonlit', fondo: '#0b1324', texto: '#dfe8f7', suave: '#7f92b4' },
  { tema: 'ledger', fondo: '#f4eddc', texto: '#33291d', suave: '#6b5c46' },
  { tema: 'shonen', fondo: '#fff6e8', texto: '#1c1c1c', suave: '#8a6a45' },
  { tema: 'ghost', fondo: '#0a1018', texto: '#dff1f5', suave: '#7a9ba8' },
  { tema: 'samurai', fondo: '#1a1512', texto: '#efe6d6', suave: '#9e8f7c' },
  { tema: 'kawaii', fondo: '#fff7fb', texto: '#7a4a6a', suave: '#8a5c74' },
  { tema: 'manga', fondo: '#fbfaf7', texto: '#101010', suave: '#666666' },
  { tema: 'sakura', fondo: '#fff7fa', texto: '#3d1626', suave: '#7a3b52' },
  { tema: 'loto', fondo: '#180b10', texto: '#f8eed8', suave: '#cbb59a' },
  { tema: 'ukiyo', fondo: '#f2e4c9', texto: '#162a45', suave: '#354e6b' },
  { tema: 'vinilo', fondo: '#141210', texto: '#f6f2eb', suave: '#a89f94' },
  { tema: 'karesansui', fondo: '#ece8df', texto: '#24221f', suave: '#5e574e' },
];

describe('contraste de los 19 temas (WCAG AA)', () => {
  it('cada tema tiene 19 pares de texto sobre superficie', () => {
    expect(PAREJAS).toHaveLength(19);
  });

  it.for(PAREJAS)('$tema: el texto principal supera 4.5:1', ({ tema, fondo, texto }) => {
    expect(contraste(fondo, texto), `${tema} texto principal`).toBeGreaterThanOrEqual(4.5);
  });

  it.for(PAREJAS.filter((p) => p.suave))(
    '$tema: el texto secundario supera 4.5:1',
    ({ tema, fondo, suave }) => {
      expect(contraste(fondo, suave!), `${tema} texto secundario`).toBeGreaterThanOrEqual(4.5);
    },
  );
});
