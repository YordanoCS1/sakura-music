import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Los nombres de comando de Tauri son strings sin tipar: un rename en Rust
// sólo se descubre en runtime. Este test cruza ambos lados del contrato.

const RAIZ = process.cwd();
const CARPETA_SRC = join(RAIZ, 'src');
const ARCHIVO_RUST = join(RAIZ, 'src-tauri', 'src', 'lib.rs');

function archivosFuente(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosFuente(ruta);
    if (/\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)) return [ruta];
    return [];
  });
}

type Hallazgo = { comando: string; archivo: string; linea: number };

function comandosDelFrontend(): Hallazgo[] {
  const patron = /\binvoke(?:<[^>]*>)?\(\s*['"]([A-Za-z0-9_]+)['"]/g;
  const hallazgos: Hallazgo[] = [];
  for (const archivo of archivosFuente(CARPETA_SRC)) {
    const lineas = readFileSync(archivo, 'utf-8').split('\n');
    lineas.forEach((linea, indice) => {
      for (const coincidencia of linea.matchAll(patron)) {
        hallazgos.push({
          comando: coincidencia[1],
          archivo: relative(RAIZ, archivo).replace(/\\/g, '/'),
          linea: indice + 1,
        });
      }
    });
  }
  return hallazgos;
}

function comandosDelBackend(): string[] {
  const texto = readFileSync(ARCHIVO_RUST, 'utf-8');
  const bloque = texto.match(/generate_handler!\s*\[([\s\S]*?)\]/);
  if (!bloque) throw new Error('No se encontró generate_handler! en src-tauri/src/lib.rs');
  return (
    bloque[1]
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean)
      // Los comandos de módulos llegan como `catalog::search_catalog_songs`.
      .map((nombre) => nombre.split('::').pop() as string)
  );
}

describe('contrato IPC frontend ↔ Rust', () => {
  it('todo comando invocado por el frontend está registrado en el backend', () => {
    const registrados = new Set(comandosDelBackend());
    const invocados = comandosDelFrontend();
    expect(invocados.length).toBeGreaterThan(0);

    const faltantes = invocados
      .filter(({ comando }) => !registrados.has(comando))
      .map(({ comando, archivo, linea }) => `${comando} (${archivo}:${linea})`);
    expect(faltantes).toEqual([]);
  });

  it('todo comando registrado en el backend es utilizado por el frontend', () => {
    const usados = new Set(comandosDelFrontend().map(({ comando }) => comando));
    const registrados = comandosDelBackend();
    expect(registrados.length).toBeGreaterThan(0);

    // Comandos reservados a futuro o usados sólo desde el propio backend.
    const excepciones = new Set<string>();
    const sinUso = registrados.filter(
      (comando) => !usados.has(comando) && !excepciones.has(comando),
    );
    expect(sinUso).toEqual([]);
  });
});
