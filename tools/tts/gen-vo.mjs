// Generates the voiceover with Kokoro-82M (Apache-2.0, runs locally on CPU).
// Reads lines from src/data/script.json, writes public/vo/<id>.wav (48 kHz,
// mono, 16-bit), cleaned up and loudness-matched so every line sits together.
//
//   node tools/tts/gen-vo.mjs                 # all lines, voice from script.json
//   VOICE=am_puck node tools/tts/gen-vo.mjs   # another voice
//   OUT=public/vo-samples ONLY=arrival VOICE=am_fenrir node tools/tts/gen-vo.mjs
//   SCRIPT=src/v2/vo.json OUT=public/vo2 node tools/tts/gen-vo.mjs   # v2 lines
import fs from 'node:fs/promises';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import {
  activeRms, compress, dbToGain, fade, filter, gain, limit, peak, upsample2, writeWav,
} from '../../scripts/audio/dsp.mjs'; // prettier-ignore

const root = path.resolve(import.meta.dirname, '../..');
const script = JSON.parse(await fs.readFile(path.resolve(root, process.env.SCRIPT || 'src/data/script.json'), 'utf8'));
const voice = process.env.VOICE || script.voice;
const speed = Number(process.env.SPEED || script.speed || 1);
const outDir = path.resolve(root, process.env.OUT || 'public/vo');
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const dtype = process.env.DTYPE || 'fp32';

await fs.mkdir(outDir, { recursive: true });
console.log(`Loading Kokoro-82M (${dtype}) — first run downloads the model from Hugging Face…`);
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype,
  device: 'cpu',
});

/** Trim leading/trailing silence, keeping a little air around the words. */
function trim(x, rate) {
  const th = peak(x) * dbToGain(-42);
  let a = 0;
  let b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < th) a++;
  while (b > a && Math.abs(x[b]) < th) b--;
  return x.slice(Math.max(0, a - Math.round(0.03 * rate)), Math.min(x.length, b + Math.round(0.12 * rate)));
}

// Hot, dense dialogue: it has to cut through a score and sound effects on phone speakers.
const targetRms = dbToGain(-15);
const summary = {};
for (const [id, line] of Object.entries(script.lines)) {
  if (only && !only.includes(id)) continue;
  const started = performance.now();
  const audio = await tts.generate(line.say ?? line.text, { voice, speed });
  if (audio.sampling_rate !== 24000) throw new Error(`unexpected rate ${audio.sampling_rate}`);
  let x = trim(Float32Array.from(audio.audio), 24000);
  x = upsample2(x);
  // Broadcast-style polish: rumble cut, a touch of warmth and presence,
  // gentle compression, then match loudness across lines.
  x = filter(x, 'highpass', 70, 0.7);
  x = filter(x, 'lowshelf', 180, 0.7, 1.5);
  x = filter(x, 'peak', 3200, 0.9, 2);
  x = filter(x, 'highshelf', 10000, 0.7, -1.5);
  compress(x, { threshold: -24, ratio: 3, attack: 0.005, release: 0.16 });
  gain(x, targetRms / activeRms(x));
  limit(x, { ceiling: 0.89 });
  const p = peak(x);
  if (p > 0.89) gain(x, 0.89 / p);
  fade(x, 0.01, 0.04);
  await writeWav(path.join(outDir, `${id}.wav`), x);
  summary[id] = Number((x.length / 48000).toFixed(2));
  console.log(`${id.padEnd(13)} ${summary[id].toFixed(2)}s  (${Math.round(performance.now() - started)}ms)`);
}
console.log(`voice ${voice} · speed ${speed} · total ${Object.values(summary).reduce((a, b) => a + b, 0).toFixed(1)}s`);
