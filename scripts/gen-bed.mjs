// Generates the original underscore against src/data/timeline.json:
//
//   public/audio/bed.wav        main bed, from the arrival scene to the end
//   public/audio/bed-intro.wav  cold-open drone, used only when no music file
//                               is supplied (the Tame Impala track replaces it)
//
// D minor, 100 BPM. The beat grid is phased so a downbeat lands exactly on
// the end of "That's my haki" — the drop — and each scene's arrangement
// change snaps to the nearest bar. Energy climbs scene by scene.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SR, TAU, compress, curve, expDecay, fade, filter, midiToHz, mixInto, noise, normalize,
  osc, pan, pluck, reverb, delay, samples, saturate, shape, stereo, unison, writeWav, glide,
} from './audio/dsp.mjs'; // prettier-ignore

const root = path.resolve(import.meta.dirname, '..');
const timeline = JSON.parse(await fs.readFile(path.join(root, 'src/data/timeline.json'), 'utf8'));
const scene = (id) => timeline.scenes.find((s) => s.id === id);

const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const total = timeline.duration;

const haki = scene('haki');
const drop = haki.vo.start + haki.vo.segments[haki.vo.segments.length - 1][1] + 0.05;
const origin = ((drop % BAR) + BAR) % BAR;
const snapBar = (t) => origin + Math.round((t - origin) / BAR) * BAR;

// --- Arrangement ------------------------------------------------------------------

const start = snapBar(scene('arrival').start + 0.6);
const sections = [
  { at: start, energy: 1 },
  { at: snapBar(scene('workflow').start), energy: 1.5 },
  { at: snapBar(scene('think').start), energy: 2 },
  { at: snapBar(scene('design').start), energy: 2.5 },
  { at: snapBar(scene('build').start), energy: 3 },
  { at: snapBar(scene('intelligence').start), energy: 3.5 },
  { at: snapBar(scene('ship').start), energy: 3.5 },
  { at: snapBar(scene('taste').start), energy: 3 },
  { at: snapBar(haki.start) - BAR, energy: 2.5 },
  { at: snapBar(haki.start), energy: 0 },
  { at: drop, energy: 4 },
  { at: drop + BAR * 1.5, energy: 1 },
  { at: snapBar(scene('outro').start + 2.4), energy: 0.5 },
];
const energyAt = (t) => {
  let e = 0;
  for (const s of sections) if (t >= s.at - 1e-6) e = s.energy;
  return t < start ? 0 : e;
};

// Chords: two bars each, cycling from the first bar of the bed.
const CHORDS = [
  { root: 38, notes: [50, 53, 57, 60, 64] }, // Dm9
  { root: 34, notes: [46, 53, 57, 62] }, // Bbmaj7
  { root: 31, notes: [43, 50, 53, 58, 57] }, // Gm9
  { root: 33, notes: [45, 50, 52, 55, 57] }, // A7sus4
];
const RESOLVE = { root: 38, notes: [50, 54, 57, 62, 66] }; // D major: hopeful outro

const outroBar = snapBar(scene('outro').start);
const chordAt = (t) => {
  if (t >= outroBar) return RESOLVE;
  // The progression restarts on the drop so it lands on the tonic.
  const from = t >= drop ? drop : start;
  const index = Math.floor((t - from + 1e-6) / (BAR * 2));
  return CHORDS[((index % 4) + 4) % 4];
};

// Chord slots: two bars each, re-phased at the drop and at the outro.
const boundaries = [];
for (let t = start; t < drop - 1e-6; t += BAR * 2) boundaries.push(t);
for (let t = drop; t < total; t += BAR * 2) if (t < outroBar - 1e-6) boundaries.push(t);
boundaries.push(outroBar, total + 2);
boundaries.sort((a, b) => a - b);

const len = total + 4;
const pads = stereo(len);
const bass = stereo(len);
const arps = stereo(len);
const drums = stereo(len);
const kicks = [];

// --- Pads ---------------------------------------------------------------------------
for (let b = 0; b < boundaries.length - 1; b++) {
  const t = boundaries[b];
  const chord = chordAt(t + 0.01);
  const e = Math.max(energyAt(t + 0.01), t >= snapBar(haki.start) - BAR && t < drop ? 0.6 : 0);
  const dur = boundaries[b + 1] - t + 1.6;
  const outro = chord === RESOLVE;
  chord.notes.forEach((m, i) => {
    const v = unison('saw', midiToHz(m), dur, { voices: 3, detune: 0.09, seed: m * 7 + i });
    const cutoff = 500 + 260 * e + (outro ? 400 : 0);
    const x = filter(v, 'lowpass', (tt) => cutoff * (1 + 0.25 * Math.sin(TAU * 0.11 * (t + tt))), 0.8);
    shape(x, curve([[0, 0], [1.1, 1, 0.7], [dur - 1.6, 0.85], [dur, 0, 1.6]]));
    mixInto(pads, pan(x, (i / (chord.notes.length - 1)) * 1.2 - 0.6), t, 0.11 * (0.32 + 0.23 * Math.min(e, 3)));
  });
}

// --- Bass: root eighths with a little movement --------------------------------------
for (let i = 0; start + (i * BEAT) / 2 < total; i++) {
  const t = start + (i * BEAT) / 2;
  const e = energyAt(t);
  const step = i % 8;
  // Below energy 2 the bass only holds a long root on each downbeat.
  if (e < 1 || (e < 2 && step !== 0)) continue;
  const chord = chordAt(t + 0.01);
  const m = chord.root + (step === 6 ? 12 : 0);
  const d = e < 2 ? BAR * 0.95 : BEAT / 2 - 0.02;
  const x = osc('saw', midiToHz(m), d + 0.05);
  const y = filter(x, 'lowpass', 180 + 90 * e, 1.1);
  shape(y, e < 2 ? curve([[0, 0], [0.3, 1], [d, 0]]) : pluck(0.004, 0.16));
  saturate(y, 1.8);
  mixInto(bass, y, t, e < 2 ? 0.18 : 0.26);
}

// --- Drums ------------------------------------------------------------------------------
function kick() {
  const d = 0.45;
  const s = osc('sine', glide(130, 48, 0.06), d);
  shape(s, (tt) => Math.exp(-tt / 0.16) * Math.min(1, tt / 0.002));
  const c = filter(noise(0.02, 'white', 5), 'highpass', 2500);
  mixInto(s, shape(c, expDecay(0.004)), 0, 0.2);
  return fade(saturate(s, 1.3), 0, 0.05);
}
function hat(open = false, seed = 1) {
  const d = open ? 0.18 : 0.05;
  const n = filter(noise(d, 'white', seed), 'highpass', 7000);
  return shape(n, expDecay(open ? 0.05 : 0.012));
}
function clap(seed = 9) {
  const d = 0.35;
  const out = new Float32Array(samples(d));
  for (const at of [0, 0.011, 0.023]) {
    const n = filter(noise(0.2, 'white', seed + at * 1000), 'bandpass', 1500, 1.2);
    mixInto(out, shape(n, expDecay(at === 0.023 ? 0.08 : 0.01)), at, 0.8);
  }
  return out;
}
const K = kick();
for (let pos = 0; start + (pos * BEAT) / 4 < total; pos++) {
  const t = start + (pos * BEAT) / 4;
  const e = energyAt(t);
  const sixteenth = pos % 16;
  const onBeat = sixteenth % 4 === 0;
  if (onBeat && e >= 2) {
    mixInto(drums, K, t, e >= 4 ? 0.62 : 0.45);
    kicks.push(t);
  }
  if (e >= 3 && sixteenth % 4 === 2) mixInto(drums, pan(hat(false, pos), 0.25), t, 0.06);
  if (e >= 3.5 && sixteenth % 2 === 1) mixInto(drums, pan(hat(false, pos + 1), -0.25), t, 0.03);
  if (e >= 3.5 && (sixteenth === 4 || sixteenth === 12)) mixInto(drums, clap(pos), t, 0.1);
  if (e >= 4 && sixteenth === 14) mixInto(drums, pan(hat(true, pos), 0.1), t, 0.05);
}
// A four-on-the-floor lift into each bar where energy rises.
for (const s of sections.slice(1)) {
  if (s.energy <= 1 || s.at === drop) continue;
  for (let i = 0; i < 4; i++) {
    mixInto(drums, pan(hat(false, i + 50), 0), s.at - BEAT + i * (BEAT / 4), 0.025 + i * 0.012);
  }
}

// --- Arp: 16th-note plucks through the chord, opening with energy ---------------------
const PATTERN = [0, 2, 3, 4, 3, 2, 1, 2];
for (let pos = 0; start + (pos * BEAT) / 4 < total; pos++) {
  const t = start + (pos * BEAT) / 4;
  const e = energyAt(t);
  if (e < 2.5) continue;
  const chord = chordAt(t + 0.01);
  const notes = [...chord.notes].sort((a, b) => a - b).map((m) => m + 12);
  const m = notes[PATTERN[pos % 8] % notes.length];
  const d = 0.32;
  const x = osc('saw', midiToHz(m), d);
  const cut = 900 + 900 * (e - 2.5);
  const y = filter(x, 'lowpass', (tt) => cut + 2500 * Math.exp(-tt / 0.05), 1.4);
  shape(y, pluck(0.003, 0.09));
  const accent = pos % 4 === 0 ? 1 : 0.7;
  mixInto(arps, pan(y, Math.sin(pos * 0.7) * 0.4), t, 0.06 * accent);
}

// --- Sidechain pump -----------------------------------------------------------------
const duck = new Float32Array(samples(len)).fill(1);
for (const k of kicks) {
  const a = samples(k);
  for (let i = 0; i < samples(0.4) && a + i < duck.length; i++) {
    duck[a + i] = Math.min(duck[a + i], 1 - 0.55 * Math.exp(-i / SR / 0.12));
  }
}
for (const bus of [pads, bass, arps]) for (const ch of bus) for (let i = 0; i < ch.length; i++) ch[i] *= duck[i];

// --- Mix ------------------------------------------------------------------------------
const arpWet = delay(arps, { time: BEAT * 0.75, feedback: 0.38, mix: 0.35, tail: 0.1, lowpass: 3000 });
const padWet = reverb(pads, { rt60: 4.2, wet: 0.55, dry: 0.8, dark: 700, bright: 4500, seed: 71 });
const drumWet = reverb(drums, { rt60: 1.1, wet: 0.12, seed: 72 });
const master = stereo(len);
mixInto(master, padWet);
mixInto(master, bass);
mixInto(master, reverb(arpWet, { rt60: 2.4, wet: 0.3, seed: 73 }));
mixInto(master, drumWet);
const out = master.map((ch) => compress(filter(ch, 'highpass', 30), { threshold: -16, ratio: 2, attack: 0.01, release: 0.2 }));
// Fade in from silence as the music track leaves; fade out at the very end.
const fadeInEnd = start + BAR;
for (const ch of out) {
  shape(ch, (t) => (t < start ? 0 : t < fadeInEnd ? ((t - start) / BAR) ** 2 : 1));
}
const endAt = total + 1.5;
const trimmed = out.map((ch) => ch.slice(0, samples(endAt)));
fade(trimmed, 0, 3.5);
normalize(trimmed, -3);
await fs.mkdir(path.join(root, 'public/audio'), { recursive: true });
await writeWav(path.join(root, 'public/audio/bed.wav'), trimmed);

// --- Intro drone (fallback when no music file) -----------------------------------------
const titleAt = scene('title').start;
const introLen = scene('arrival').start + 3;
const intro = stereo(introLen);
for (const [m, g, s] of [[26, 0.5, 1], [33, 0.35, 2], [38, 0.25, 3], [45, 0.12, 4]]) {
  const v = unison('saw', midiToHz(m), introLen, { voices: 3, detune: 0.12, seed: s });
  const x = filter(v, 'lowpass', curve([[0, 120], [titleAt, 900, 2.2], [titleAt + 0.4, 300], [introLen, 160]]), 1.2);
  shape(x, curve([[0, 0], [2.5, 0.6, 0.6], [titleAt - 0.05, 1, 1.5], [titleAt + 0.2, 0.55], [introLen, 0, 1.2]]));
  mixInto(intro, pan(x, (s - 2.5) * 0.25), 0, g);
}
// Heartbeat pulses that quicken toward the title.
let hb = 1.2;
let gap = 1.25;
while (hb < titleAt - 0.4) {
  for (const [off, g] of [[0, 0.5], [0.22, 0.32]]) mixInto(intro, K, hb + off, g);
  hb += gap;
  gap = Math.max(0.55, gap * 0.9);
}
const introOut = reverb(intro, { rt60: 3.5, wet: 0.35, dark: 500, seed: 74 }).map((ch) => ch.slice(0, samples(introLen)));
fade(introOut, 0.5, 2.5);
normalize(introOut, -3);
await writeWav(path.join(root, 'public/audio/bed-intro.wav'), introOut);

console.log(`bed: ${endAt.toFixed(2)}s, starts ${start.toFixed(2)}s, drop at ${drop.toFixed(2)}s (grid origin ${origin.toFixed(3)}s)`);
await fs.writeFile(
  path.join(root, 'src/data/music.json'),
  JSON.stringify({ bpm: BPM, origin: Number(origin.toFixed(4)), bedStart: Number(start.toFixed(3)), drop: Number(drop.toFixed(3)), sections }, null, 2) + '\n',
);
