// Rebuilds every generated asset in dependency order.
// The voiceover step is skipped if the TTS tool isn't installed and voice
// files already exist (e.g. you recorded your own).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const run = (file) => {
  console.log(`\n▶ ${file}`);
  execFileSync('node', [path.join(root, file)], { stdio: 'inherit', cwd: root });
};

run('scripts/build-images.mjs');
run('scripts/gen-sfx.mjs');
const ttsReady = fs.existsSync(path.join(root, 'tools/tts/node_modules/kokoro-js'));
const haveVoice = fs.existsSync(path.join(root, 'public/vo')) && fs.readdirSync(path.join(root, 'public/vo')).length > 0;
if (ttsReady) run('tools/tts/gen-vo.mjs');
else if (!haveVoice) throw new Error('No voice files and no TTS: run `pnpm assets:tts-install` or add public/vo/*.wav');
else console.log('\n▶ voiceover: using existing public/vo files');
run('scripts/build-timeline.mjs');
run('scripts/gen-bed.mjs');
console.log('\n✓ assets ready');
