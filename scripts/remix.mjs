// Audio-only re-mix: renders just the soundtrack of the current composition and
// swaps it into out/showreel-raw.mp4 (video untouched), then masters.
// Use after changing music/SFX levels — no frames are re-rendered.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const root = path.resolve(import.meta.dirname, '..');
const raw = path.join(root, 'out/showreel-raw.mp4');
if (!fs.existsSync(raw)) throw new Error('out/showreel-raw.mp4 not found — run `pnpm render` once first');
const wav = path.join(root, 'out/mix.wav');
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') });
const composition = await selectComposition({ serveUrl, id: 'Showreel', inputProps: {} });
await renderMedia({ serveUrl, composition, codec: 'wav', outputLocation: wav, inputProps: {}, concurrency: 8 });
const tmp = path.join(root, 'out/showreel-raw.tmp.mp4');
execFileSync('npx', ['remotion', 'ffmpeg', '-v', 'error', '-y', '-i', raw, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', tmp], { cwd: root, stdio: 'inherit' });
fs.renameSync(tmp, raw);
console.log('soundtrack replaced → out/showreel-raw.mp4');
execFileSync('node', [path.join(root, 'scripts/master.mjs')], { cwd: root, stdio: 'inherit' });
