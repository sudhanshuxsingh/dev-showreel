// v2: measure the two voice lines (public/vo2) → src/v2/vo-timing.json
// { id: { file, duration, speechStart, speechEnd, words: [{ w, s, e }] } }
// Word times are relative to the file start; spread by length within the
// speech segments found from the loudness envelope.
import fs from 'node:fs';
import path from 'node:path';
import { parseWav } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'src/v2/vo.json'), 'utf8'));
const out = {};
for (const [id, line] of Object.entries(script.lines)) {
  const file = `vo2/${id}.wav`;
  const { rate, channels } = parseWav(fs.readFileSync(path.join(root, 'public', file)));
  const x = channels[0];
  const hop = Math.round(rate / 100);
  const env = [];
  for (let s = 0; s < x.length; s += hop) {
    let sum = 0;
    for (let i = s; i < Math.min(x.length, s + hop * 2); i++) sum += x[i] * x[i];
    env.push(Math.sqrt(sum / (hop * 2)));
  }
  const peak = Math.max(...env);
  const on = env.map((v) => v > peak * 0.06);
  const segs = [];
  let start = -1;
  on.forEach((v, i) => {
    if (v && start < 0) start = i;
    if (!v && start >= 0) {
      segs.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) segs.push([start, on.length]);
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] < 12) last[1] = s[1];
    else merged.push([...s]);
  }
  const speech = merged.map(([a, b]) => [a / 100, b / 100]);
  const words = line.text.split(/\s+/);
  const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5;
  const total = words.reduce((s, w) => s + weight(w), 0);
  const a = speech[0][0];
  const b = speech[speech.length - 1][1];
  let t = a;
  const timed = words.map((w) => {
    const d = ((b - a) * weight(w)) / total;
    const item = { w, s: Number(t.toFixed(3)), e: Number((t + d).toFixed(3)) };
    t += d;
    return item;
  });
  out[id] = { file, duration: Number((x.length / rate).toFixed(3)), speechStart: a, speechEnd: b, segments: speech, words: timed };
  console.log(id, out[id].duration, 'speech', a, '→', b, timed.map((w) => `${w.w}@${w.s.toFixed(2)}`).join(' '));
}
fs.writeFileSync(path.join(root, 'src/v2/vo-timing.json'), JSON.stringify(out, null, 2) + '\n');
