export interface LRCLine {
  time: number;
  text: string;
}

export interface LRCData {
  lines: LRCLine[];
  meta: Record<string, string>;
}

const LRC_LINE_RE = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/;
const LRC_META_RE = /^\[(\w+):(.*)\]$/;

export function parseLRC(lrc: string): LRCData {
  const lines: LRCLine[] = [];
  const meta: Record<string, string> = {};

  for (const raw of lrc.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(LRC_LINE_RE);
    if (m) {
      const min = parseInt(m[1]);
      const sec = parseInt(m[2]);
      let ms = 0;
      if (m[3]) ms = parseInt(m[3].length === 2 ? m[3] + '0' : m[3]);
      lines.push({ time: min * 60 + sec + ms / 1000, text: m[4] });
      continue;
    }

    const metaM = line.match(LRC_META_RE);
    if (metaM) meta[metaM[1].trim().toLowerCase()] = metaM[2].trim();
  }

  lines.sort((a, b) => a.time - b.time);
  return { lines, meta };
}

export function buildLRC(data: LRCData): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data.meta)) {
    parts.push(`[${k}:${v}]`);
  }
  if (data.meta && Object.keys(data.meta).length > 0 && data.lines.length > 0) parts.push('');
  for (const l of data.lines) {
    const min = Math.floor(l.time / 60);
    const sec = Math.floor(l.time % 60);
    const ms = Math.round((l.time - Math.floor(l.time)) * 100);
    parts.push(`[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${l.text}`);
  }
  return parts.join('\n');
}

export function isLRC(text: string): boolean {
  return LRC_LINE_RE.test(text.trim());
}

export function getCurrentLineIndex(lines: LRCLine[], currentTime: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) idx = i;
    else break;
  }
  return idx;
}
