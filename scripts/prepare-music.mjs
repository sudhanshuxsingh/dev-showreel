// Measures the user-supplied song (public/audio/music.*) over the part that
// plays, and writes a gain to src/data/music-gain.json so any master — quiet
// or brick-walled — sits at the same level under the cold open.
import fs from 'node:fs';
import path from 'node:path';
import { decodeMono } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'src/data/music-gain.json');
const script = JSON.parse(fs.readFileSync(path.join(root, 'src/data/script.json'), 'utf8'));
const { start = 0, targetRmsDb = -17 } = script.music ?? {};
const file = fs
  .readdirSync(path.join(root, 'public/audio'))
  .find((f) => /^music\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f));

if (!file) {
  fs.writeFileSync(out, JSON.stringify({ file: null, gain: 1 }, null, 2) + '\n');
  console.log('music: none (public/audio/music.* not found) — the original intro drone will play');
} else {
  const rate = 16000;
  const x = await decodeMono(path.join(root, 'public/audio', file), rate);
  const a = Math.floor(start * rate);
  const b = Math.min(x.length, a + 18 * rate);
  let sum = 0;
  for (let i = a; i < b; i++) sum += x[i] * x[i];
  const rms = 10 * Math.log10(sum / Math.max(1, b - a) + 1e-12);
  const gain = Math.min(1.5, Math.max(0.08, 10 ** ((targetRmsDb - rms) / 20)));
  fs.writeFileSync(out, JSON.stringify({ file, start, measuredRmsDb: Number(rms.toFixed(1)), gain: Number(gain.toFixed(3)) }, null, 2) + '\n');
  console.log(`music: ${file} · ${rms.toFixed(1)} dBFS RMS from ${start}s → gain ${gain.toFixed(2)}`);
}
