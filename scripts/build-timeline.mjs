// Builds src/data/timeline.json (scene + voiceover timing) and
// src/data/lipsync.json (mouth-openness envelope per line) from
// src/data/script.json and whatever voice files sit in public/vo/.
//
// Voice files can be any format (wav, mp3, m4a…) named <line-id>.<ext>, so a
// re-recorded voiceover drops straight in: scenes re-time themselves.
import fs from 'node:fs/promises';
import path from 'node:path';
import { decodeMono, parseWav } from './audio/dsp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const script = JSON.parse(await fs.readFile(path.join(root, 'src/data/script.json'), 'utf8'));
const fps = script.fps;
const voDir = path.join(root, 'public/vo');
const files = await fs.readdir(voDir).catch(() => []);

async function loadVoice(id) {
  const file = files.find((f) => path.parse(f).name === id && /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(f));
  if (!file) throw new Error(`missing voice file for "${id}" in public/vo/`);
  const full = path.join(voDir, file);
  if (/\.wav$/i.test(file)) {
    try {
      const { rate, channels } = parseWav(await fs.readFile(full));
      return { file, rate, x: channels[0] };
    } catch {
      // Unusual WAV flavours fall through to ffmpeg.
    }
  }
  return { file, rate: 16000, x: await decodeMono(full, 16000) };
}

/** RMS per 10 ms hop over a 25 ms window. */
function envelope(x, rate) {
  const hop = Math.round(rate / 100);
  const win = Math.round(rate * 0.025);
  const out = [];
  for (let s = 0; s < x.length; s += hop) {
    let sum = 0;
    const end = Math.min(x.length, s + win);
    for (let i = s; i < end; i++) sum += x[i] * x[i];
    out.push(Math.sqrt(sum / Math.max(1, end - s)));
  }
  return out;
}

const percentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

/** Speech segments in seconds: above -22 dB of p95, gaps < 140 ms merged. */
function segments(env) {
  const th = percentile(env, 0.95) * 0.08;
  const segs = [];
  let start = -1;
  env.forEach((v, i) => {
    if (v > th && start < 0) start = i;
    if (v <= th && start >= 0) {
      segs.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) segs.push([start, env.length]);
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] < 14) last[1] = s[1];
    else merged.push([...s]);
  }
  return merged.filter(([a, b]) => b - a >= 6).map(([a, b]) => [a / 100, b / 100]);
}

/**
 * Words grouped into phrases at punctuation that usually produces a pause.
 * `strong` marks phrases ending in . : ; ! ? or an em dash — where a voice
 * actually breathes — as opposed to a comma.
 */
function phrases(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const words = tokens.filter((w) => w !== '—');
  const groups = [];
  const strong = [];
  let current = [];
  const close = (isStrong) => {
    if (!current.length) return;
    groups.push(current);
    strong.push(isStrong);
    current = [];
  };
  for (const w of tokens) {
    if (w === '—') {
      close(true);
      continue;
    }
    current.push(w);
    if (/[.:;!?]$/.test(w)) close(true);
    else if (/,$/.test(w)) close(false);
  }
  close(true);
  return { words, groups, strong };
}

const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5;

/** Spread words across [a, b] proportionally to their length. */
function spread(words, a, b) {
  const total = words.reduce((s, w) => s + weight(w), 0);
  let t = a;
  return words.map((w) => {
    const d = ((b - a) * weight(w)) / total;
    const item = { w, s: Number(t.toFixed(3)), e: Number((t + d).toFixed(3)) };
    t += d;
    return item;
  });
}

/** Merge the closest neighbouring segments until at most `n` remain. */
function mergeTo(segs, n) {
  const out = segs.map((s) => [...s]);
  while (out.length > n) {
    let best = 0;
    for (let i = 1; i < out.length - 1; i++) {
      if (out[i + 1][0] - out[i][1] < out[best + 1][0] - out[best][1]) best = i;
    }
    out.splice(best, 2, [out[best][0], out[best + 1][1]]);
  }
  return out;
}

/** All ways to choose `k` items from `items` (small inputs only). */
const choose = (items, k) =>
  k === 0 ? [[]] : items.flatMap((x, i) => choose(items.slice(i + 1), k - 1).map((rest) => [x, ...rest]));

/**
 * Approximate word timings without a forced aligner: speech segments come
 * from pauses in the audio, phrases from punctuation. When there are fewer
 * pauses than phrases, pick the phrase boundaries whose text lengths best
 * match the segment lengths, then spread words by length inside each segment.
 */
function wordTimings(text, rawSegs, duration) {
  const { words, groups, strong } = phrases(text);
  if (!rawSegs.length) return spread(words, 0, duration);
  const segs = mergeTo(rawSegs, groups.length);
  const k = segs.length;
  const totalW = groups.flat().reduce((s, w) => s + weight(w), 0);
  const totalD = segs.reduce((s, [a, b]) => s + (b - a), 0);
  let best = null;
  for (const cuts of choose([...Array(groups.length - 1).keys()].map((i) => i + 1), k - 1)) {
    const bounds = [0, ...cuts, groups.length];
    const merged = bounds.slice(1).map((end, i) => groups.slice(bounds[i], end).flat());
    // Fit text length to segment length; cutting at a comma costs extra.
    const score =
      merged.reduce((s, g, i) => {
        const w = g.reduce((t, x) => t + weight(x), 0) / totalW;
        const d = (segs[i][1] - segs[i][0]) / totalD;
        return s + Math.abs(w - d);
      }, 0) + cuts.reduce((s, c) => s + (strong[c - 1] ? 0 : 0.12), 0);
    if (!best || score < best.score) best = { score, merged };
  }
  return best.merged.flatMap((g, i) => spread(g, segs[i][0], segs[i][1]));
}

const lipsync = {};
const scenes = [];
let cursor = 0;
for (const scene of script.scenes) {
  let vo = null;
  let duration = scene.min;
  if (scene.vo) {
    const line = script.lines[scene.vo];
    const { file, rate, x } = await loadVoice(scene.vo);
    const length = x.length / rate;
    const env = envelope(x, rate);
    const p95 = percentile(env, 0.95) || 1;
    lipsync[scene.vo] = env.map((v) => Math.min(9, Math.round((v / p95) * 9))).join('');
    const segs = segments(env);
    duration = Math.max(scene.min, scene.lead + length + scene.tail);
    vo = {
      id: scene.vo,
      file: `vo/${file}`,
      start: Number((cursor + scene.lead).toFixed(3)),
      duration: Number(length.toFixed(3)),
      text: line.text,
      words: wordTimings(line.text, segs, length),
      segments: segs,
    };
  }
  // Snap scene boundaries to whole frames so Sequences line up exactly.
  const from = Math.round(cursor * fps);
  const frames = Math.round((cursor + duration) * fps) - from;
  scenes.push({ id: scene.id, from, durationInFrames: frames, start: from / fps, duration: frames / fps, vo });
  cursor = (from + frames) / fps;
}

const timeline = {
  fps,
  durationInFrames: Math.round(cursor * fps),
  duration: Number(cursor.toFixed(3)),
  scenes,
};
await fs.writeFile(path.join(root, 'src/data/timeline.json'), JSON.stringify(timeline, null, 2) + '\n');
await fs.writeFile(path.join(root, 'src/data/lipsync.json'), JSON.stringify({ rate: 100, lines: lipsync }) + '\n');

for (const s of scenes) {
  const v = s.vo ? `vo ${s.vo.start.toFixed(2)}s +${s.vo.duration.toFixed(2)}s  ${s.vo.segments.length} seg / ${phrases(s.vo.text).groups.length} phr` : '';
  console.log(`${s.id.padEnd(13)} ${s.start.toFixed(2).padStart(6)}s  ${s.duration.toFixed(2).padStart(5)}s  ${v}`);
}
console.log(`total ${timeline.duration.toFixed(2)}s · ${timeline.durationInFrames} frames @ ${fps}fps`);
