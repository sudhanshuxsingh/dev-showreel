// Prepares the song for the reel, starting at 0:30 of the track
// (public/audio/music.mp3 → public/audio/music-edit.wav, git-ignored like the source).
// Times below are VIDEO seconds (= song seconds − SONG_START).
//
// The song plays continuously — nothing is cut or filtered mid-way:
//   0 → ~6 s     a soft volume rise (the music sits a little lower at the start)
//   throughout   an even, gentle low-end lift
//   LAST_BAR     the final crash is kept, then the dry song stops and the crash
//                rings out on a long reverb tail ("echo out") under the logo
import fs from 'node:fs';
import path from 'node:path';
import beats from '../src/data/beats.json' with { type: 'json' };
import { SR, curve, decodeStereo, fade, filter, mixInto, normalize, reverb, samples, shape, stereo, writeWav } from './audio/dsp.mjs';

export const SONG_START = 30;
const root = path.resolve(import.meta.dirname, '..');
const bars = beats.bars.map((b) => b - SONG_START).filter((b) => b > 0);
const beat = beats.beat;
// The song moves in 2-bar phrases from 0:30; the phrase at bar 4 opens on a
// crash — the name lands there. Nothing in the audio changes at that point.
const DROP = bars[4];
const LAST_BAR = bars.find((b) => b > 64); // a big crash: the logo lands on it
const CRASH = 0.16; // keep the final crash's attack before the dry song stops
const END = LAST_BAR + 1.9;
console.log(`drop ${DROP.toFixed(3)} · last bar ${LAST_BAR.toFixed(3)} · end ${END.toFixed(2)}`);

const [Lf, Rf] = await decodeStereo(path.join(root, 'public/audio/music.mp3'), SR);
const from = samples(SONG_START);
const slice = (ch, a, b) => ch.slice(from + samples(a), from + samples(b));
const out = stereo(END + 0.3);

// --- The song, untouched in time: gentle low-end lift, soft start -----------------------------
const song = [slice(Lf, 0, LAST_BAR + CRASH), slice(Rf, 0, LAST_BAR + CRASH)].map((ch) => filter(ch, 'lowshelf', 95, 0.7, 2.5));
for (const ch of song) shape(ch, curve([[0, 0.72], [6, 1, 0.8]]));
fade(song, 0.03, 0.06);
mixInto(out, song, 0, 1);

// --- Never a dead gap: where the song itself stops (it does, ~0.75 s at 1:22), --------------
// its last moment rings on through the silence on a reverb tail.
const rms = (ch, a, b) => {
  let q = 0;
  for (let i = samples(a); i < samples(b); i++) q += ch[i] * ch[i];
  return 10 * Math.log10(q / Math.max(1, samples(b) - samples(a)) + 1e-12);
};
// Find runs of 50 ms windows under -30 dB lasting at least 0.5 s. Shorter stops
// are the song's own stop-time stabs (band stops, hits, stops) — they're groove,
// so they stay, and the cuts land on them.
const gaps = [];
let runStart = -1;
for (let t = 1; t < LAST_BAR - 1; t += 0.05) {
  const quiet = rms(song[0], t, t + 0.05) < -30;
  if (quiet && runStart < 0) runStart = t;
  if (!quiet && runStart >= 0) {
    if (t - runStart >= 0.5) gaps.push({ from: runStart, to: t });
    runStart = -1;
  }
}
for (const g of gaps) {
  const lead = 0.6;
  const src = [slice(Lf, g.from - lead, g.from), slice(Rf, g.from - lead, g.from)];
  fade(src, 0.05, 0.03);
  const ring = reverb(src, { rt60: 2.4, wet: 1, dry: 0, dark: 900, bright: 5000, seed: 604 });
  // Fade the tail in over the song's last 60 ms, let it carry through the hole,
  // and fade it away over the first 150 ms of the song's return.
  const len = g.to - g.from;
  for (const ch of ring) {
    shape(ch, (t) => {
      const k = t - lead;
      const fadeIn = Math.min(1, Math.max(0, (k + 0.06) / 0.06));
      const fadeOut = Math.min(1, Math.max(0, 1 - (k - len) / 0.15));
      return fadeIn * fadeOut;
    });
  }
  mixInto(out, ring, g.from - lead, 0.42);
  console.log(`filled the song's own gap at ${g.from.toFixed(2)}–${g.to.toFixed(2)} s`);
}

// --- Echo out on the final crash ----------------------------------------------------------------
const tailSrc = [slice(Lf, LAST_BAR - beat, LAST_BAR + CRASH + 0.25), slice(Rf, LAST_BAR - beat, LAST_BAR + CRASH + 0.25)];
for (const ch of tailSrc) shape(ch, curve([[0, 0.25], [beat, 1, 1.6], [beat + CRASH + 0.25, 1]]));
fade(tailSrc, 0, 0.08);
const tail = reverb(tailSrc, { rt60: 4.2, wet: 1, dry: 0, dark: 700, bright: 4000, seed: 603 });
mixInto(out, tail, LAST_BAR - beat, 0.85);

for (const ch of out) shape(ch, (t) => (t < END - 0.5 ? 1 : Math.max(0, (END - t) / 0.5) ** 1.5));
const trimmed = out.map((ch) => ch.slice(0, samples(END)));
normalize(trimmed, -1);
await writeWav(path.join(root, 'public/audio/music-edit.wav'), trimmed);
fs.writeFileSync(
  path.join(root, 'src/data/edit.json'),
  JSON.stringify({ songStart: SONG_START, drop: DROP, lastBar: LAST_BAR, end: Number(END.toFixed(3)) }, null, 2) + '\n',
);
console.log(`music-edit.wav: ${END.toFixed(2)} s · ${(fs.statSync(path.join(root, 'public/audio/music-edit.wav')).size / 1e6).toFixed(1)} MB`);
