// Audio QA without ears: renders each stem solo (vo / sfx / bed), then
// reports clipping, loudness over time, and how far the voice sits above
// everything else while it speaks.
//
//   node scripts/audio-qa.mjs            # renders stems + analyses out/showreel.mp4
//   SKIP_RENDER=1 node scripts/audio-qa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { decodeMono } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const stemsDir = path.join(root, 'out/stems');
fs.mkdirSync(stemsDir, { recursive: true });
const stems = ['vo', 'sfx', 'bed'];

if (!process.env.SKIP_RENDER) {
  const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') });
  for (const stem of stems) {
    const inputProps = { withMusic: true, musicStart: 0, solo: stem };
    const composition = await selectComposition({ serveUrl, id: 'Showreel', inputProps });
    const started = Date.now();
    await renderMedia({ serveUrl, composition, codec: 'wav', outputLocation: path.join(stemsDir, `${stem}.wav`), inputProps, concurrency: 8 });
    console.log(`stem ${stem} rendered in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
}

const RATE = 16000;
const win = RATE / 2;
const rmsDb = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return 10 * Math.log10(s / Math.max(1, b - a) + 1e-12);
};

const data = {};
for (const stem of stems) data[stem] = await decodeMono(path.join(stemsDir, `${stem}.wav`), RATE);
const mix = await decodeMono(path.join(root, 'out/showreel.mp4'), RATE);

let peak = 0;
let clipped = 0;
for (const v of mix) {
  peak = Math.max(peak, Math.abs(v));
  if (Math.abs(v) > 0.995) clipped++;
}
console.log(`\nmix: ${(mix.length / RATE).toFixed(1)}s · peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS · clipped samples ${clipped}`);
console.log(`mix overall RMS ${rmsDb(mix, 0, mix.length).toFixed(1)} dBFS`);

const timeline = JSON.parse(fs.readFileSync(path.join(root, 'src/data/timeline.json'), 'utf8'));
console.log('\nvoice vs background while speaking (want ≥ 8 dB):');
for (const s of timeline.scenes.filter((x) => x.vo)) {
  const a = Math.floor(s.vo.start * RATE);
  const b = Math.floor((s.vo.start + s.vo.duration) * RATE);
  const vo = rmsDb(data.vo, a, b);
  const bg = 10 * Math.log10(10 ** (rmsDb(data.bed, a, b) / 10) + 10 ** (rmsDb(data.sfx, a, b) / 10));
  console.log(`  ${s.vo.id.padEnd(13)} vo ${vo.toFixed(1)}  bg ${bg.toFixed(1)}  → ${(vo - bg).toFixed(1)} dB`);
}

console.log('\nloudness per second (mix | vo | sfx | bed), dBFS:');
const rows = [];
for (let i = 0; i + win <= mix.length; i += win * 2) {
  const f = (x) => rmsDb(x, i, Math.min(x.length, i + win * 2)).toFixed(0).padStart(4);
  rows.push(`${String(Math.round(i / RATE)).padStart(3)}s ${f(mix)} |${f(data.vo)} |${f(data.sfx)} |${f(data.bed)}`);
}
console.log(rows.join('\n'));
