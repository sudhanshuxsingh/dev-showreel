// Beat + structure analysis of public/audio/music.* → src/data/music-analysis.json
// Spectral-flux onsets, tempo by autocorrelation, beat phase by comb scoring,
// and an energy curve to find the song's sections.
import fs from 'node:fs';
import path from 'node:path';
import { decodeMono, fft } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const file = fs.readdirSync(path.join(root, 'public/audio')).find((f) => /^music\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f));
if (!file) throw new Error('no public/audio/music.* file');
const RATE = 22050;
const x = await decodeMono(path.join(root, 'public/audio', file), RATE);
const N = 1024;
const HOP = 256;
const frames = Math.floor((x.length - N) / HOP);
const fps = RATE / HOP;
const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
let prev = new Float64Array(N / 2);
const flux = new Float64Array(frames);
const lowFlux = new Float64Array(frames);
const energy = new Float64Array(frames);
for (let f = 0; f < frames; f++) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[f * HOP + i] * win[i];
  fft(re, im, false);
  const mag = new Float64Array(N / 2);
  let fl = 0;
  let lf = 0;
  let e = 0;
  for (let k = 1; k < N / 2; k++) {
    mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
    const d = mag[k] - prev[k];
    if (d > 0) {
      fl += d;
      if (k < 12) lf += d; // < ~260 Hz: kick / bass
    }
    e += re[k] * re[k] + im[k] * im[k];
  }
  flux[f] = fl;
  lowFlux[f] = lf;
  energy[f] = e;
  prev = mag;
}
// Normalise + local mean removal.
const smooth = (a, w) => a.map((_, i) => {
  let s = 0, n = 0;
  for (let j = Math.max(0, i - w); j <= Math.min(a.length - 1, i + w); j++) { s += a[j]; n++; }
  return s / n;
}); // prettier-ignore
const local = smooth(flux, 8);
const onset = flux.map((v, i) => Math.max(0, v - local[i]));

// Tempo: autocorrelation over 70–180 BPM, with a mild preference near 110.
let best = { bpm: 0, score: -Infinity };
for (let bpm = 70; bpm <= 180; bpm += 0.25) {
  const lag = (60 / bpm) * fps;
  let s = 0;
  for (let i = 0; i + lag * 4 + 1 < onset.length; i++) {
    const a = onset[i];
    for (let m = 1; m <= 4; m *= 2) {
      const j = i + lag * m;
      const lo = Math.floor(j);
      s += (a * (onset[lo] * (1 - (j - lo)) + (onset[lo + 1] ?? 0) * (j - lo))) / m;
    }
  }
  const prior = Math.exp(-((Math.log2(bpm / 110)) ** 2) / 0.5);
  if (s * prior > best.score) best = { bpm, score: s * prior };
}
if (!best.bpm) throw new Error('tempo detection failed');
const period = 60 / best.bpm;
// Phase: comb over the whole song.
let phase = { t: 0, score: -Infinity };
for (let p = 0; p < period; p += 0.005) {
  let s = 0;
  for (let t = p; t < x.length / RATE; t += period) {
    const i = Math.round(t * fps);
    s += (onset[i] ?? 0) + 0.5 * (lowFlux[i] ?? 0);
  }
  if (s > phase.score) phase = { t: p, score: s };
}
// Energy per second (dB) and sections by novelty in a 4 s window.
const secs = Math.floor(x.length / RATE);
const db = [];
for (let s = 0; s < secs; s++) {
  let e = 0;
  for (let i = s * RATE; i < (s + 1) * RATE; i++) e += x[i] * x[i];
  db.push(Number((10 * Math.log10(e / RATE + 1e-12)).toFixed(1)));
}
const lowDb = [];
for (let s = 0; s < secs; s++) {
  let e = 0;
  const a = Math.floor(s * fps);
  const b = Math.floor((s + 1) * fps);
  for (let i = a; i < b; i++) e += lowFlux[i];
  lowDb.push(Number((e / (b - a)).toFixed(2)));
}
// Onset peaks (first 60 s), strength normalised 0..1 — drives audio-reactive visuals.
const onsetPeaks = [];
const maxOnset = Math.max(...onset.slice(0, Math.floor(60 * fps)));
for (let i = 2; i < Math.min(onset.length - 2, 60 * fps); i++) {
  if (onset[i] > onset[i - 1] && onset[i] >= onset[i + 1] && onset[i] > maxOnset * 0.12) {
    const t = i / fps;
    if (!onsetPeaks.length || t - onsetPeaks[onsetPeaks.length - 1][0] > 0.07) onsetPeaks.push([Number(t.toFixed(3)), Number((onset[i] / maxOnset).toFixed(2))]);
  }
}
const result = {
  file,
  onsets: onsetPeaks,
  duration: Number((x.length / RATE).toFixed(2)),
  bpm: best.bpm,
  beat: Number(period.toFixed(4)),
  firstBeat: Number(phase.t.toFixed(3)),
  energyDb: db,
  kick: lowDb,
};
fs.writeFileSync(path.join(root, 'src/data/music-analysis.json'), JSON.stringify(result) + '\n');
console.log(`${file}: ${result.duration}s · ${best.bpm} BPM (beat ${period.toFixed(3)}s) · first beat ${phase.t.toFixed(3)}s`);
console.log('energy dB per second:');
for (let s = 0; s < secs; s += 10) console.log(String(s).padStart(4) + 's  ' + db.slice(s, s + 10).map((v) => String(Math.round(v)).padStart(4)).join(''));
console.log('kick/low-onset per second:');
for (let s = 0; s < secs; s += 10) console.log(String(s).padStart(4) + 's  ' + lowDb.slice(s, s + 10).map((v) => v.toFixed(1).padStart(5)).join(''));
