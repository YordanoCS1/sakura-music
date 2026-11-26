// Deriva tonos de interfaz en OKLCH a partir del acento de cada tema.
// Uso: npm run paletas
// Salida: src/themes/styles/tonos-oklch.css (generado, no editar a mano).
import { writeFileSync } from 'node:fs';
import Color from 'colorjs.io';

const ACENTOS = {
  sakura: '#e54d86',
  loto: '#d4af37',
  ukiyo: '#b93829',
  vinilo: '#ff5e3a',
  karesansui: '#3c332a',
};

const limite = (n, min, max) => Math.min(max, Math.max(min, n));

/** Mueve luz y croma en OKLCH y devuelve un hex sRGB dentro de gama. */
function derivar(hex, luz, croma) {
  const color = new Color(hex).to('oklch');
  color.l = limite(luz, 0, 1);
  color.c = limite(croma, 0, 0.4);
  const srgb = color.to('srgb');
  srgb.coords = srgb.coords.map((n) => limite(n, 0, 1));
  return srgb.toString({ format: 'hex' });
}

const lineas = [
  '/* Generado por scripts/generar_paletas.mjs (npm run paletas).',
  '   No editar a mano: los tonos se derivan en OKLCH desde el acento de cada tema. */',
  ':root {',
];

for (const [tema, acento] of Object.entries(ACENTOS)) {
  const base = new Color(acento).to('oklch');
  lineas.push(`  --${tema}-base: ${acento};`);
  lineas.push(`  --${tema}-hover: ${derivar(acento, limite(base.l + 0.12, 0, 1), base.c)};`);
  lineas.push(`  --${tema}-activo: ${derivar(acento, limite(base.l - 0.12, 0, 1), base.c)};`);
  lineas.push(`  --${tema}-suave: ${derivar(acento, 0.95, 0.035)};`);
}

lineas.push('}', '');
writeFileSync('src/themes/styles/tonos-oklch.css', lineas.join('\n'));
console.log(`Paletas derivadas para ${Object.keys(ACENTOS).length} temas en OKLCH.`);
