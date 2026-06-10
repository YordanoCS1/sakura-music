const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..').replace(/\\/g, '/');
const buildDir = projectDir + '/build';
const iconsDir = buildDir + '/icons';
const tmpDir = buildDir + '/.tmp';

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Use RELATIVE paths (no drive letter, no colons)
const fontSrc = 'C:/Windows/Fonts/seguisym.ttf';
const fontDst = 'build/.tmp/font.ttf';
const textDst = 'build/.tmp/note.txt';
fs.copyFileSync(fontSrc, projectDir + '/' + fontDst);
fs.writeFileSync(projectDir + '/' + textDst, '\u266B', 'utf8');

function generateIcon(size) {
  const out = 'build/.tmp/' + size + '.png';
  const fs2 = Math.round(size * 0.45);
  const yOff = Math.round(size * 0.05);
  const cmd = [
    'ffmpeg',
    '-f', 'lavfi',
    '-i', 'gradients=s=' + size + 'x' + size + ':c0=#1a0a2e:c1=#cc1a4a:x0=0:y0=0:x1=' + size + ':y1=' + size,
    '-vf', 'drawtext=textfile=' + textDst + ':fontfile=' + fontDst + ':fontsize=' + fs2 + ':fontcolor=white@0.95:x=(w-text_w)/2:y=(h-text_h)/2-' + yOff,
    '-frames:v', '1',
    '-update', '1',
    out,
    '-y'
  ].join(' ');
  execSync(cmd, { stdio: 'pipe', shell: true, cwd: projectDir });
  console.log('Generated ' + size + 'x' + size);
}

const sizes = [16, 24, 32, 48, 64, 96, 128, 256];

for (const s of sizes) {
  generateIcon(s);
}
generateIcon(512);
console.log('Generated 512x512');

// Copy icons
for (const s of sizes) {
  const src = projectDir + '/build/.tmp/' + s + '.png';
  const dst = iconsDir + '/' + s + 'x' + s + '.png';
  fs.copyFileSync(src, dst);
}
fs.copyFileSync(projectDir + '/build/.tmp/512.png', iconsDir + '/512x512.png');
fs.copyFileSync(projectDir + '/build/.tmp/256.png', buildDir + '/icon.png');
fs.copyFileSync(projectDir + '/build/.tmp/16.png', buildDir + '/tray-icon.png');

// Create ICO
function createICO(pngPaths) {
  const count = pngPaths.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + count * 16;
  const entries = [];
  const pngBuffers = [];
  for (const fpath of pngPaths.reverse()) {
    const png = fs.readFileSync(fpath);
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const entry = Buffer.alloc(16);
    entry[0] = w >= 256 ? 0 : w;
    entry[1] = h >= 256 ? 0 : h;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    pngBuffers.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const icoPngs = [16, 24, 32, 48, 64, 128, 256].map(function(s) { return projectDir + '/build/.tmp/' + s + '.png'; });
fs.writeFileSync(buildDir + '/icon.ico', createICO(icoPngs));

// Clean up
function rmdir(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(function(f) {
      const fp = dir + '/' + f;
      if (fs.statSync(fp).isDirectory()) rmdir(fp);
      else fs.unlinkSync(fp);
    });
    fs.rmdirSync(dir);
  }
}
rmdir(tmpDir);

console.log('Done');
