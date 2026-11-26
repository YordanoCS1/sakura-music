// Limpia la caché de compilación de Rust sin tocar el código ni los datos.
// Uso: npm run clean:cargo             -> borra src-tauri/target/debug/incremental
//      npm run clean:cargo -- --all    -> cargo clean completo
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const completo = process.argv.includes('--all');
const target = join(process.cwd(), 'src-tauri', 'target');
const incremental = join(target, 'debug', 'incremental');
const destino = completo ? target : incremental;

function tamano(ruta) {
  try {
    if (!existsSync(ruta)) return 0;
    const info = statSync(ruta);
    if (info.isFile()) return info.size;
    return readdirSync(ruta, { withFileTypes: true }).reduce(
      (total, entrada) => total + tamano(join(ruta, entrada.name)),
      info.size,
    );
  } catch {
    return 0;
  }
}

function mb(bytes) {
  return (bytes / 1024 ** 2).toFixed(1);
}

/** No se puede borrar mientras cargo/rustc o la app usan los archivos. */
function procesosActivos() {
  const nombres = ['cargo', 'rustc', 'sakura-desktop', 'sakura-cli'];
  try {
    if (process.platform === 'win32') {
      const salida = spawnSync('tasklist', ['/FO', 'CSV', '/NH'], {
        encoding: 'utf8',
      });
      const lineas = salida.stdout.splitlines().map((linea) => linea.toLowerCase());
      return nombres.filter((nombre) => lineas.some((linea) => linea.includes(`${nombre}.exe`)));
    }
    const salida = spawnSync('ps', ['-eo', 'comm='], { encoding: 'utf8' });
    const lineas = salida.stdout.splitlines().map((linea) => linea.trim().toLowerCase());
    return nombres.filter((nombre) => lineas.some((linea) => linea.endsWith(`/${nombre}`)));
  } catch {
    return [];
  }
}

if (!existsSync(target)) {
  console.log('No hay caché de Rust para limpiar: src-tauri/target no existe.');
  process.exit(0);
}

if (!completo && !existsSync(incremental)) {
  console.log(
    'No hay caché incremental para limpiar: src-tauri/target/debug/incremental no existe.',
  );
  process.exit(0);
}

const activos = procesosActivos();
if (activos.length > 0) {
  console.error(
    `Cerrá ${activos.join(', ')} antes de limpiar: Windows no permite borrar archivos en uso.`,
  );
  process.exit(1);
}

const antes = tamano(destino);
console.log(`${completo ? 'Caché completa' : 'Caché incremental'}: ${mb(antes)} MB`);

if (completo) {
  // En Windows cargo es un .cmd de rustup: hace falta cmd.exe para resolverlo.
  const resultado =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/c', 'cargo clean'], { cwd: 'src-tauri', stdio: 'inherit' })
      : spawnSync('cargo', ['clean'], { cwd: 'src-tauri', stdio: 'inherit' });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
} else {
  rmSync(incremental, { recursive: true, force: true });
}

console.log(`Liberados ${mb(antes - tamano(destino))} MB.`);
if (!completo) {
  console.log('El próximo build recompila el código de la app; las dependencias se conservan.');
}
