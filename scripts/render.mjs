// One command for the finished video: render, then master.
// Extra arguments go to `remotion render`, e.g. --props='{"music":false}'
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });

sh('npx', ['remotion', 'render', 'Showreel', 'out/showreel-raw.mp4', '--concurrency=8', ...process.argv.slice(2)]);
sh('node', ['scripts/master.mjs']);
