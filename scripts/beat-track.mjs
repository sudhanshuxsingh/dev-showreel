// Proper beat tracking for the edit (Ellis-style dynamic programming):
// onset envelopes per band → tempo from autocorrelation → beat times that
// follow the actual groove → bar lines from where the kick lands → a list of
// the strongest real hits. Writes src/data/beats.json.
import fs from 'node:fs';
import path from 'node:path';
import { decodeMono, fft } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const RATE = 22050;
const N = 1024;
const HOP = 128;
const FPS = RATE / HOP; // envelope frames per second (~172)
const x = await decodeMono(path.join(root, 'public/audio/music.mp3'), RATE);
const frames = Math.floor((x.length - N) / HOP);
const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const binHz = RATE / N;
const bands = { low: [20, 150], mid: [150, 2500], high: [2500, 11000] };
const env = { full: new Float64Array(frames), low: new Float64Array(frames), mid: new Float64Array(frames), high: new Float64Array(frames) };
let prev = new Float64Array(N / 2);
const re = new Float64Array(N);
const im = new Float64Array(N);
for (let f = 0; f < frames; f++) {
  re.fill(0);
  im.fill(0);
  for (let i = 0; i < N; i++) re[i] = x[f * HOP + i] * win[i];
  fft(re, im, false);
  for (let k = 1; k < N / 2; k++) {
    const m = Math.log1p(1000 * Math.hypot(re[k], im[k]));
    const d = m - prev[k];
    prev[k] = m;
    if (d <= 0) continue;
    const hz = k * binHz;
    env.full[f] += d;
    if (hz < bands.low[1]) env.low[f] += d;
    else if (hz < bands.mid[1]) env.mid[f] += d;
    else if (hz < bands.high[1]) env.high[f] += d;
  }
}
// High-pass the envelopes (remove slow loudness drift) and normalise.
const detrend = (a, w = 32) => {
  const out = new Float64Array(a.length);
  let sum = 0;
  const q = [];
  for (let i = 0; i < a.length; i++) {
    q.push(a[i]);
    sum += a[i];
    if (q.length > w) sum -= q.shift();
    out[i] = Math.max(0, a[i] - sum / q.length);
  }
  const sd = Math.sqrt(out.reduce((s, v) => s + v * v, 0) / out.length) || 1;
  return out.map((v) => v / sd);
};
for (const k of Object.keys(env)) env[k] = detrend(env[k]);
const O = env.full;

// --- Tempo: autocorrelation peaks ---------------------------------------------------------
const ac = [];
for (let lag = Math.round(0.15 * FPS); lag <= Math.round(3.2 * FPS); lag++) {
  let s = 0;
  for (let i = 0; i + lag < O.length; i++) s += O[i] * O[i + lag];
  ac.push({ lag, sec: lag / FPS, s: s / (O.length - lag) });
}
const peaks = ac.filter((p, i) => i > 0 && i < ac.length - 1 && p.s > ac[i - 1].s && p.s >= ac[i + 1].s).sort((a, b) => b.s - a.s);
console.log('autocorrelation peaks (period s → strength):');
console.log(peaks.slice(0, 12).map((p) => `${p.sec.toFixed(3)}→${p.s.toFixed(3)}`).join('  '));

// Beat period: strongest peak between 0.4 and 1.0 s (a walkable beat).
const beatPeak = peaks.filter((p) => p.sec >= 0.4 && p.sec <= 1.0)[0];
const tau = beatPeak.lag;
console.log(`beat period ${beatPeak.sec.toFixed(4)} s = ${(60 / beatPeak.sec).toFixed(2)} BPM`);

// --- Dynamic-programming beat tracker -------------------------------------------------------
const alpha = 400;
const C = new Float64Array(O.length);
const P = new Int32Array(O.length).fill(-1);
for (let t = 0; t < O.length; t++) {
  let best = 0;
  let arg = -1;
  for (let p = t - Math.round(2 * tau); p <= t - Math.round(tau / 2); p++) {
    if (p < 0) continue;
    const score = C[p] - alpha * Math.log((t - p) / tau) ** 2;
    if (score > best) {
      best = score;
      arg = p;
    }
  }
  C[t] = O[t] + best;
  P[t] = arg;
}
let t = 0;
for (let i = O.length - Math.round(tau); i < O.length; i++) if (C[i] > C[t]) t = i;
const beats = [];
while (t >= 0) {
  beats.unshift(t / FPS);
  t = P[t];
}

// --- Bar lines: the beat phase (mod 4) where the kick is strongest --------------------------
const at = (e, sec) => {
  const i = Math.round(sec * FPS);
  let m = 0;
  for (let d = -3; d <= 3; d++) m = Math.max(m, e[i + d] ?? 0);
  return m;
};
const phaseScore = [0, 1, 2, 3].map((ph) => beats.reduce((s, b, i) => s + (i % 4 === ph ? at(env.low, b) + 0.5 * at(env.full, b) : 0), 0));
const phase = phaseScore.indexOf(Math.max(...phaseScore));
const bars = beats.filter((_, i) => i % 4 === phase);

// --- Strongest real hits per band (for in-scene accents) ------------------------------------
const hits = (e, min, gap = 0.12) => {
  const list = [];
  for (let i = 2; i < e.length - 2; i++) {
    if (e[i] > min && e[i] >= e[i - 1] && e[i] >= e[i + 1] && e[i] >= e[i - 2] && e[i] >= e[i + 2]) {
      const s = i / FPS;
      if (list.length && s - list[list.length - 1][0] < gap) {
        if (e[i] > list[list.length - 1][1]) list[list.length - 1] = [s, e[i]];
      } else list.push([s, e[i]]);
    }
  }
  return list.map(([s, v]) => [Number(s.toFixed(3)), Number(v.toFixed(2))]);
};
const result = {
  bpm: Number((60 / beatPeak.sec).toFixed(2)),
  beat: Number(beatPeak.sec.toFixed(4)),
  beats: beats.map((b) => Number(b.toFixed(3))),
  bars: bars.map((b) => Number(b.toFixed(3))),
  kicks: hits(env.low, 2.2),
  snares: hits(env.mid, 2.2),
  hats: hits(env.high, 2.0, 0.08),
  accents: hits(env.full, 2.6),
};
fs.writeFileSync(path.join(root, 'src/data/beats.json'), JSON.stringify(result) + '\n');
const upto = (arr, s) => arr.filter((v) => (Array.isArray(v) ? v[0] : v) < s);
console.log(`phase ${phase} · scores ${phaseScore.map((v) => v.toFixed(0)).join('/')}`);
console.log('beats < 50 s:', upto(result.beats, 50).map((b) => b.toFixed(2)).join(' '));
console.log('bars  < 50 s:', upto(result.bars, 50).map((b) => b.toFixed(2)).join(' '));
console.log('accents < 50 s:', upto(result.accents, 50).map(([s, v]) => `${s.toFixed(2)}(${v.toFixed(1)})`).join(' '));
console.log('kicks < 20 s:', upto(result.kicks, 20).map(([s, v]) => `${s.toFixed(2)}(${v.toFixed(1)})`).join(' '));
console.log('snares < 20 s:', upto(result.snares, 20).map(([s, v]) => `${s.toFixed(2)}(${v.toFixed(1)})`).join(' '));
