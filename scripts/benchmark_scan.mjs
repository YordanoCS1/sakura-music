// Genera 10.000 MP3 mínimos y mide el escaneo real del CLI en release.
// Uso: node scripts/benchmark_scan.mjs [cantidad]
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const cantidad = Number(process.argv[2] ?? 10_000);
const raiz = join(tmpdir(), `sakura-benchmark-${process.pid}`);
const carpeta = join(raiz, 'musica');
mkdirSync(carpeta, { recursive: true });

// Un frame MPEG-1 Layer III (128 kbps, 44,1 kHz) con payload de silencio.
const frame = Buffer.alloc(417, 0);
frame[0] = 0xff;
frame[1] = 0xfb;
frame[2] = 0x90;
frame[3] = 0x64;
const pista = Buffer.concat(Array.from({ length: 8 }, () => frame));

console.log(`Generando ${cantidad} pistas de prueba…`);
for (let i = 0; i < cantidad; i++) {
  writeFileSync(join(carpeta, `pista-${String(i).padStart(5, '0')}.mp3`), pista);
}

console.log('Compilando CLI en release…');
const build = spawnSync('cargo', ['build', '--release', '--bin', 'sakura-cli'], {
  cwd: 'src-tauri',
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const bin = process.platform === 'win32' ? 'sakura-cli.exe' : 'sakura-cli';
const rutaBin = join(process.cwd(), 'src-tauri', 'target', 'release', bin);
console.log(`Escaneando ${readdirSync(carpeta).length} archivos…`);
const resultado = spawnSync(rutaBin, ['scan', carpeta], { stdio: 'inherit', shell: true });
rmSync(raiz, { recursive: true, force: true });
process.exit(resultado.status ?? 1);
