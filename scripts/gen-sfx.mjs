// Synthesises every sound effect from scratch (no samples, no licences) into
// public/sfx/*.wav and writes src/data/sfx.json with durations and a
// loudness-matched base volume per effect.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SR, TAU, ahr, bitcrush, clamp, curve, dust, expDecay, fade, filter, fm, glide,
  midiToHz, mixInto, noise, normalize, osc, pan, pluck, reverb, reverse, rng, samples,
  saturate, shape, stereo, trimTail, unison, writeWav,
} from './audio/dsp.mjs'; // prettier-ignore

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public/sfx');

const defs = {};
const def = (name, fn) => (defs[name] = fn);
const buf = (seconds) => new Float32Array(samples(seconds));

// --- Transitions -----------------------------------------------------------

function whoosh({ d = 1, peakAt = 0.55, top = 2600, seed = 11, from = -0.7, to = 0.7, rt = 1.2 }) {
  const x = filter(
    noise(d, 'pink', seed),
    'bandpass',
    curve([[0, 260], [peakAt, top, 1.6], [d, 520, 0.7]]),
    0.9,
  );
  shape(x, curve([[0, 0], [peakAt, 1, 2.2], [d, 0, 0.6]]));
  const air = filter(noise(d, 'white', seed + 1), 'highpass', curve([[0, 2500], [peakAt, 7000], [d, 3000]]));
  shape(air, curve([[0, 0], [peakAt, 0.22, 2.5], [d, 0, 0.7]]));
  mixInto(x, air);
  return reverb(pan(filter(x, 'highpass', 90), (t) => from + (to - from) * (t / d)), {
    rt60: rt, wet: 0.18, bright: 7000, dark: 1500,
  });
}

def('whoosh', () => whoosh({}));
def('whoosh-fast', () => whoosh({ d: 0.5, peakAt: 0.28, top: 3600, seed: 14, from: 0.6, to: -0.6, rt: 0.8 }));
def('whoosh-deep', () => {
  const w = whoosh({ d: 1.3, peakAt: 0.8, top: 1200, seed: 17, from: -0.3, to: 0.3, rt: 1.8 });
  const low = osc('sine', glide(70, 45, 1.3), 1.3);
  shape(low, curve([[0, 0], [0.8, 0.7, 2], [1.3, 0, 0.6]]));
  mixInto(w, low);
  return w;
});
def('swish', () => {
  const d = 0.32;
  const x = filter(noise(d, 'white', 41), 'bandpass', curve([[0, 2000], [0.12, 6500], [d, 3000]]), 1.2);
  shape(x, curve([[0, 0], [0.1, 1, 1.5], [d, 0, 0.8]]));
  return reverb(pan(x, (t) => -0.4 + (t / d) * 0.8), { rt60: 0.5, wet: 0.12 });
});

// --- Impacts ----------------------------------------------------------------

function impact({ d = 4, sub = [120, 34], subTau = 1.1, rt = 3.2, wet = 0.28, weight = 1, seed = 5 }) {
  const out = buf(d);
  const s = osc('sine', glide(sub[0], sub[1], 0.45), d);
  shape(s, (t) => Math.exp(-t / subTau) * Math.min(1, t / 0.003));
  mixInto(out, saturate(s, 1.6), 0, 1);
  const body = filter(noise(d, 'white', seed), 'lowpass', glide(5000, 180, 0.22), 0.8);
  mixInto(out, shape(body, expDecay(0.08)), 0, 0.5 * weight);
  const click = filter(noise(0.05, 'white', seed + 1), 'highpass', 2500);
  mixInto(out, shape(click, expDecay(0.006)), 0, 0.3);
  const rumble = filter(noise(d, 'brown', seed + 2), 'lowpass', 140);
  mixInto(out, shape(rumble, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 1.4)), 0, 0.9 * weight);
  fade(out, 0, d * 0.35);
  return reverb(out, { rt60: rt, wet, bright: 4000, dark: 380, predelay: 0.02, seed: seed + 30 });
}

def('impact', () => impact({}));
def('impact-soft', () => impact({ d: 2.5, sub: [90, 40], subTau: 0.5, rt: 2, wet: 0.22, weight: 0.4, seed: 8 }));
def('kick', () => {
  const d = 0.7;
  const out = buf(d);
  const s = osc('sine', glide(160, 46, 0.07), d);
  mixInto(out, shape(s, (t) => Math.exp(-t / 0.22) * Math.min(1, t / 0.002)), 0, 1);
  const c = filter(noise(0.03, 'white', 9), 'highpass', 3000);
  mixInto(out, shape(c, expDecay(0.004)), 0, 0.25);
  return fade(saturate(out, 1.4), 0, 0.2);
});
def('slam', () => {
  const k = impact({ d: 2.2, sub: [140, 42], subTau: 0.35, rt: 1.6, wet: 0.2, weight: 0.8, seed: 61 });
  const crash = filter(noise(2.2, 'white', 62), 'highpass', 3500);
  shape(crash, (t) => Math.exp(-t / 0.5) * Math.min(1, t / 0.002));
  mixInto(k, pan(crash, 0), 0, 0.18);
  return k;
});

def('braam', () => {
  const d = 3.8;
  const tone = buf(d);
  const f0 = midiToHz(33); // A1
  for (const [ratio, g, seed] of [[1, 1, 1], [2, 0.55, 2], [1.5, 0.3, 3], [0.5, 0.75, 4]]) {
    mixInto(tone, unison('saw', f0 * ratio, d, { voices: 5, detune: 0.2, seed }), 0, g);
  }
  const x = filter(tone, 'lowpass', curve([[0, 120], [0.09, 1900, 0.5], [1.2, 520], [d, 140]]), 2.4);
  shape(x, curve([[0, 0], [0.05, 1, 0.5], [0.5, 0.8], [d, 0, 1.4]]));
  saturate(x, 2.2);
  const hit = impact({ d, sub: [100, 36], subTau: 0.9, wet: 0, rt: 0.5, weight: 0.6, seed: 77 });
  const wet = reverb(x, { rt60: 3.5, wet: 0.35, dark: 500, bright: 3000, seed: 40 });
  mixInto(wet, hit, 0, 0.7);
  return wet;
});

def('sub-drop', () => {
  const d = 2.6;
  const s = osc('sine', glide(95, 27, 1.8), d);
  shape(s, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 1.1));
  return fade(saturate(s, 1.3), 0, 0.8);
});

// --- Builds ------------------------------------------------------------------

function riser(d, seed = 21) {
  const x = filter(noise(d, 'white', seed), 'bandpass', glide(300, 9000, d), curve([[0, 1.5], [d, 4]]));
  const tone = filter(unison('saw', glide(110, 880, d), d, { voices: 6, detune: 0.25, seed }), 'lowpass', glide(400, 8000, d), 1.2);
  mixInto(x, tone, 0, 0.35);
  shape(x, (t) => (t / d) ** 2.2 * (0.78 + 0.22 * Math.sin(TAU * (4 * t + (3 * t * t) / d))));
  fade(x, 0.01, 0.004);
  return reverb(pan(x, (t) => Math.sin(t * 3) * 0.3), { rt60: 1.4, wet: 0.2, seed: seed + 3 });
}
def('riser', () => riser(3));
def('riser-short', () => riser(1.5, 27));

def('reverse-swell', () => {
  const src = buf(0.4);
  mixInto(src, shape(filter(noise(0.4, 'white', 51), 'lowpass', 6000), expDecay(0.05)), 0, 0.6);
  for (const m of [57, 64, 69, 72]) mixInto(src, shape(osc('triangle', midiToHz(m), 0.4), expDecay(0.12)), 0, 0.3);
  const wet = reverb(src, { rt60: 2.6, wet: 1, dry: 0, seed: 52 });
  const len = samples(1.6);
  const out = wet.map((ch) => reverse(ch.slice(0, len)));
  return fade(out, 0.05, 0.003);
});

def('powerup', () => {
  const d = 2.4;
  const tone = unison('saw', glide(70, 300, d), d, { voices: 7, detune: 0.3, seed: 81 });
  const x = filter(tone, 'lowpass', glide(220, 6000, d), 3);
  shape(x, (t) => (0.25 + 0.75 * (t / d) ** 1.5) * (0.7 + 0.3 * Math.sin(TAU * (5 * t + (12 * t * t) / d))));
  const air = filter(noise(d, 'white', 82), 'bandpass', glide(500, 8000, d), 2);
  mixInto(x, shape(air, (t) => (t / d) ** 2), 0, 0.6);
  saturate(x, 2.6);
  fade(x, 0.02, 0.004);
  return reverb(x, { rt60: 1.6, wet: 0.25, seed: 83 });
});

def('rumble', () => {
  const d = 4.5;
  const r = filter(noise(d, 'brown', 91), 'lowpass', 95);
  const lfo = filter(noise(d, 'white', 92), 'lowpass', 5);
  const peakLfo = lfo.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  shape(r, (t) => 0.6 + 0.4 * (lfo[Math.min(lfo.length - 1, Math.floor(t * SR))] / peakLfo));
  const s = osc('sine', 41, d);
  mixInto(r, s, 0, 0.35);
  return shape(r, ahr(1.2, d, 1.2, 1.5));
});

// --- Electricity / haki -----------------------------------------------------

function crackle(d, density, seed, center = 3500) {
  const x = filter(dust(d, density, seed), 'bandpass', center, 0.8);
  const y = filter(dust(d, density / 3, seed + 1), 'bandpass', center * 0.4, 1.4);
  mixInto(x, y, 0, 1.4);
  return x;
}

def('zap', () => {
  const d = 0.8;
  const x = crackle(d, 1400, 101);
  const r = rng(102);
  const buzz = osc('saw', (t) => 100 + 12 * Math.sin(t * 90) + r() * 4, d);
  const gate = filter(noise(d, 'white', 103), 'lowpass', 40);
  shape(buzz, (t) => Math.max(0, gate[Math.min(gate.length - 1, Math.floor(t * SR))] * 8));
  mixInto(x, filter(buzz, 'highpass', 300), 0, 0.25);
  shape(x, (t) => Math.min(1, t / 0.005) * Math.exp(-t / 0.3));
  saturate(x, 2);
  const st = pan(x, (t) => Math.sin(t * 37) * 0.6);
  return reverb(st, { rt60: 0.8, wet: 0.18, seed: 104 });
});

def('thunder', () => {
  const d = 3.4;
  const out = buf(d);
  const crack = filter(noise(d, 'white', 111), 'highpass', 900);
  mixInto(out, shape(crack, (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.12)), 0, 0.8);
  mixInto(out, shape(crackle(d, 2500, 112, 4200), (t) => Math.exp(-t / 0.6)), 0, 0.9);
  const rumble = filter(noise(d, 'brown', 113), 'lowpass', 190);
  const lfo = filter(noise(d, 'white', 114), 'lowpass', 7);
  const pk = lfo.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  shape(rumble, (t) => Math.exp(-t / 1.4) * (0.55 + 0.45 * lfo[Math.min(lfo.length - 1, Math.floor(t * SR))] / pk));
  mixInto(out, rumble, 0.03, 1.2);
  const thump = osc('sine', glide(85, 35, 0.4), d);
  mixInto(out, shape(thump, (t) => Math.exp(-t / 0.6)), 0, 0.8);
  saturate(out, 1.5);
  fade(out, 0, 1);
  return reverb(pan(out, (t) => Math.sin(t * 5) * 0.25), { rt60: 3, wet: 0.3, dark: 400, seed: 115 });
});

// --- Glitch ---------------------------------------------------------------------

function glitch(seed, d = 0.45) {
  const out = buf(d);
  const r = rng(seed);
  let t = 0;
  while (t < d - 0.01) {
    const seg = 0.012 + r() * 0.05;
    const kind = r();
    let s;
    if (kind < 0.35) s = osc('square', 50 + r() * 400, seg);
    else if (kind < 0.7) s = bitcrush(noise(seg, 'white', Math.floor(r() * 1e6)), 3, 6 + Math.floor(r() * 30));
    else s = osc('saw', 700 + r() * 3200, seg);
    fade(s, 0.001, 0.002);
    const reps = r() < 0.3 ? 2 + Math.floor(r() * 3) : 1;
    for (let k = 0; k < reps; k++) mixInto(out, s, t + k * seg, 0.5 + r() * 0.5);
    t += seg * reps + (r() < 0.25 ? r() * 0.03 : 0);
  }
  const x = filter(out, 'highpass', 90);
  return pan(x, (tt) => (Math.floor(tt * 45) % 2 ? -0.55 : 0.55));
}
def('glitch-1', () => glitch(201));
def('glitch-2', () => glitch(202, 0.3));
def('glitch-3', () => glitch(203, 0.6));

// --- UI --------------------------------------------------------------------------

def('click', () => {
  const d = 0.08;
  const t1 = osc('sine', glide(2400, 1700, 0.02), d);
  shape(t1, expDecay(0.008));
  const n = filter(noise(d, 'white', 31), 'bandpass', 4500, 1.5);
  mixInto(t1, shape(n, expDecay(0.003)), 0, 0.8);
  return reverb(t1, { rt60: 0.3, wet: 0.1, seed: 32 });
});

def('tick', () => {
  const d = 0.06;
  const s = osc('sine', 1700, d);
  shape(s, expDecay(0.01));
  const n = filter(noise(d, 'white', 33), 'bandpass', 3000, 3);
  mixInto(s, shape(n, expDecay(0.006)), 0, 1.2);
  return s;
});

function pop(from, to, seed) {
  const d = 0.22;
  const s = osc('sine', glide(from, to, 0.03), d);
  shape(s, pluck(0.002, 0.05));
  const n = filter(noise(0.02, 'white', seed), 'highpass', 3000);
  mixInto(s, shape(n, expDecay(0.003)), 0, 0.25);
  return reverb(s, { rt60: 0.45, wet: 0.14, seed: seed + 1 });
}
def('pop', () => pop(320, 980, 41));
def('pop-hi', () => pop(520, 1400, 43));

def('toggle', () => {
  const out = buf(0.16);
  for (const [at, f] of [[0, 1800], [0.055, 2600]]) {
    const s = osc('sine', f, 0.05);
    shape(s, expDecay(0.008));
    mixInto(out, s, at, 0.9);
  }
  return out;
});

def('blip', () => {
  const s = filter(osc('square', 760, 0.05), 'lowpass', 2600);
  return shape(s, ahr(0.002, 0.045, 0.02, 1));
});

def('dialog-open', () => {
  const d = 0.28;
  const s = filter(osc('square', glide(380, 820, 0.09), d), 'lowpass', 3000);
  shape(s, ahr(0.003, d, 0.15, 1.5));
  return reverb(s, { rt60: 0.6, wet: 0.2, seed: 45 });
});

def('step', () => {
  const d = 0.13;
  const s = filter(osc('square', glide(120, 70, 0.03), d), 'lowpass', 700);
  shape(s, expDecay(0.028));
  const n = filter(noise(d, 'white', 47), 'lowpass', 1400);
  mixInto(s, shape(n, expDecay(0.018)), 0, 0.5);
  return s;
});

def('notify', () => {
  const out = buf(0.9);
  [84, 91].forEach((m, i) => {
    const s = fm(midiToHz(m), 0.6, { ratio: 2, index: 1.2, indexTau: 0.1 });
    mixInto(out, shape(s, pluck(0.003, 0.18)), i * 0.075, 0.6);
  });
  return reverb(out, { rt60: 1, wet: 0.2, seed: 48 });
});

def('success', () => {
  const out = buf(1.6);
  [72, 76, 79, 84].forEach((m, i) => {
    const s = fm(midiToHz(m), 1, { ratio: 2, index: 1.5, indexTau: 0.12 });
    mixInto(out, shape(s, pluck(0.003, 0.25)), i * 0.065, 0.45);
  });
  return reverb(out, { rt60: 1.6, wet: 0.25, seed: 49 });
});

def('chime', () => {
  const s = fm(midiToHz(88), 2, { ratio: 3.5, index: 2.4, indexTau: 0.15 });
  shape(s, pluck(0.002, 0.5));
  const s2 = fm(midiToHz(95), 2, { ratio: 3.5, index: 1.6, indexTau: 0.12 });
  mixInto(s, shape(s2, pluck(0.002, 0.35)), 0.06, 0.45);
  return reverb(s, { rt60: 2.2, wet: 0.3, seed: 50 });
});

def('shimmer', () => {
  const d = 2;
  const out = stereo(d);
  const r = rng(301);
  for (let i = 0; i < 26; i++) {
    const f = 2000 + r() * 5000;
    const s = osc('sine', f, 0.5);
    shape(s, pluck(0.002, 0.05 + r() * 0.2));
    mixInto(out, pan(s, r() * 1.6 - 0.8), r() * 0.9, 0.25);
  }
  return reverb(out, { rt60: 2.4, wet: 0.5, seed: 302 });
});

def('sparkle', () => {
  const d = 0.8;
  const s = osc('sine', glide(2637, 2900, 0.05), d);
  shape(s, pluck(0.002, 0.18));
  const s2 = osc('sine', 3951, d);
  mixInto(s, shape(s2, pluck(0.002, 0.12)), 0.04, 0.6);
  return reverb(s, { rt60: 1.4, wet: 0.35, seed: 303 });
});

def('scan', () => {
  const d = 1.2;
  const out = buf(d);
  const notes = [76, 79, 81, 84, 86, 88, 91, 93, 96, 98];
  notes.forEach((m, i) => {
    const s = osc('sine', midiToHz(m), 0.06);
    mixInto(out, shape(s, pluck(0.002, 0.015)), i * 0.075, 0.5);
  });
  const sweep = filter(noise(d, 'white', 304), 'bandpass', glide(800, 6000, d), 3);
  mixInto(out, shape(sweep, ahr(0.1, d, 0.3)), 0, 0.15);
  return reverb(pan(out, (t) => -0.5 + t / d), { rt60: 0.8, wet: 0.2, seed: 305 });
});

def('compute', () => {
  const d = 0.9;
  const out = buf(d);
  const r = rng(306);
  for (let i = 0; i < 22; i++) {
    const s = osc('square', 1200 + r() * 2800, 0.018);
    mixInto(out, shape(filter(s, 'lowpass', 5000), expDecay(0.006)), r() * (d - 0.05), 0.25);
  }
  return pan(out, (t) => Math.sin(t * 20) * 0.5);
});

// --- Typing -----------------------------------------------------------------------

function key(r) {
  const d = 0.09;
  const out = buf(d);
  const thock = filter(noise(d, 'white', Math.floor(r() * 1e6)), 'bandpass', 900 + r() * 900, 2);
  mixInto(out, shape(thock, expDecay(0.016)), 0, 1);
  const clk = filter(noise(0.01, 'white', Math.floor(r() * 1e6)), 'highpass', 4000);
  mixInto(out, shape(clk, expDecay(0.003)), 0, 0.5);
  const body = osc('sine', 170 + r() * 60, d);
  mixInto(out, shape(body, expDecay(0.02)), 0, 0.35);
  return out;
}

function typing(seconds, seed) {
  const out = stereo(seconds + 0.2);
  const r = rng(seed);
  let t = 0.02;
  while (t < seconds) {
    const k = key(r);
    mixInto(out, pan(k, (r() - 0.5) * 0.5), t, 0.6 + r() * 0.4);
    const pause = r() < 0.08 ? 0.22 + r() * 0.2 : 0.055 + r() * 0.07;
    t += pause;
  }
  return reverb(out, { rt60: 0.35, wet: 0.12, seed: seed + 1 });
}
def('typing-3s', () => typing(3, 401));
def('typing-6s', () => typing(6, 402));

// --- Render all ----------------------------------------------------------------------

/** Base volume that brings every effect to a similar perceived level. */
function loudness(sig) {
  const [L, R] = Array.isArray(sig) ? sig : [sig, sig];
  const win = samples(0.3);
  let best = 0;
  for (let s = 0; s + win <= L.length || s === 0; s += Math.max(1, win >> 2)) {
    let sum = 0;
    const end = Math.min(L.length, s + win);
    for (let i = s; i < end; i++) sum += (L[i] * L[i] + R[i] * R[i]) / 2;
    best = Math.max(best, Math.sqrt(sum / Math.max(1, end - s)));
    if (end === L.length) break;
  }
  return best;
}

await fs.mkdir(outDir, { recursive: true });
const only = process.argv.slice(2);
const manifestPath = path.join(root, 'src/data/sfx.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8').catch(() => '{}'));
const targetRms = 0.16;

for (const [name, make] of Object.entries(defs)) {
  if (only.length && !only.includes(name)) continue;
  const started = performance.now();
  let sig = make();
  sig = trimTail(sig, -70);
  normalize(sig, -1);
  const rms = loudness(sig);
  await writeWav(path.join(outDir, `${name}.wav`), sig);
  const length = (Array.isArray(sig) ? sig[0] : sig).length;
  manifest[name] = {
    duration: Number((length / SR).toFixed(3)),
    base: Number(clamp(targetRms / rms, 0.05, 1).toFixed(3)),
  };
  console.log(`${name.padEnd(14)} ${manifest[name].duration.toFixed(2)}s base ${manifest[name].base}  (${Math.round(performance.now() - started)}ms)`);
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
