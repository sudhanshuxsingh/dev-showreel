// Mastering pass on the raw render (out/showreel-raw.mp4), with the ffmpeg
// that ships with Remotion:
//
//   out/showreel.mp4         video stream untouched, audio loudness-normalised
//   out/showreel-social.mp4  re-encoded lighter (CRF 23) for uploads, same audio
//
// Audio: two-pass EBU R128 loudnorm to -18 LUFS integrated, -1.5 dBTP.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const raw = path.join(root, 'out/showreel-raw.mp4');
if (!fs.existsSync(raw)) throw new Error('out/showreel-raw.mp4 not found — run `pnpm render` first');

// -18 LUFS: deliberately under the platforms' -14 reference — the song is meant
// to sit low under the sound design (the user asked for it lower throughout).
const TARGET = { I: -18, TP: -1.5, LRA: 11 };
const ffmpeg = (args) => run('npx', ['remotion', 'ffmpeg', '-hide_banner', ...args], { cwd: root, maxBuffer: 1024 * 1024 * 64 });

// Pass 1: measure.
const { stderr } = await ffmpeg(['-i', raw, '-vn', '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, '-f', 'null', '-']);
const m = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
console.log(`measured: ${m.input_i} LUFS · ${m.input_tp} dBTP · LRA ${m.input_lra}`);

// Pass 2: apply with the measured values (linear when possible = no pumping).
const af = [
  `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}`,
  `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}`,
  `measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
].join(':');
const audio = ['-af', `${af},aresample=48000`, '-c:a', 'aac', '-b:a', '320k', '-ar', '48000'];

await ffmpeg(['-y', '-i', raw, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', ...audio, '-movflags', '+faststart', path.join(root, 'out/showreel.mp4')]);
console.log('→ out/showreel.mp4');

await ffmpeg([
  '-y', '-i', raw, '-map', '0:v:0', '-map', '0:a:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  ...audio.slice(0, 4), '-b:a', '256k', '-ar', '48000',
  '-movflags', '+faststart', path.join(root, 'out/showreel-social.mp4'),
]); // prettier-ignore
console.log('→ out/showreel-social.mp4');

for (const f of ['showreel.mp4', 'showreel-social.mp4']) {
  const { stderr: check } = await ffmpeg(['-i', path.join(root, 'out', f), '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
  const r = JSON.parse(check.slice(check.lastIndexOf('{'), check.lastIndexOf('}') + 1));
  const mb = (fs.statSync(path.join(root, 'out', f)).size / 1e6).toFixed(1);
  console.log(`${f.padEnd(20)} ${mb} MB · ${r.input_i} LUFS · ${r.input_tp} dBTP`);
}
