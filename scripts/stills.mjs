// QA helper: bundles once, renders a list of frames (or seconds with "s"),
// and tiles them into a contact sheet.
//
//   node scripts/stills.mjs 60 120 9.5s 13s   → out/stills/sheet.png
//   SCALE=0.5 COLS=3 node scripts/stills.mjs …
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const comp = process.env.COMP || 'Showreel';
const scale = Number(process.env.SCALE || 0.42);
const cols = Number(process.env.COLS || 4);
const outDir = path.join(root, 'out/stills');
await fs.mkdir(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: {} });
const frames = args.map((a) => (a.endsWith('s') ? Math.round(parseFloat(a) * composition.fps) : Number(a)));

const tiles = [];
for (const frame of frames) {
  const file = path.join(outDir, `f${String(frame).padStart(5, '0')}.png`);
  await renderStill({ serveUrl, composition, frame, output: file, imageFormat: 'png', inputProps: {}, chromiumOptions: { gl: 'angle' } });
  const lw = Math.min(300, Math.round(composition.width * scale));
  const label = Buffer.from(
    `<svg width="${lw}" height="40"><rect width="${lw}" height="40" fill="#000" opacity="0.7"/><text x="8" y="28" font-family="Menlo" font-size="${lw < 300 ? 20 : 26}" fill="#fff">${frame} · ${(frame / composition.fps).toFixed(2)}s</text></svg>`,
  );
  tiles.push(
    await sharp(file)
      .resize(Math.round(composition.width * scale), Math.round(composition.height * scale), { fit: 'fill' })
      .composite([{ input: label, left: 0, top: 0 }])
      .png()
      .toBuffer(),
  );
  console.log('rendered', frame);
}
const tw = Math.round(composition.width * scale);
const th = Math.round(composition.height * scale);
const rows = Math.ceil(tiles.length / cols);
const gap = 8;
await sharp({ create: { width: cols * tw + (cols - 1) * gap, height: rows * th + (rows - 1) * gap, channels: 3, background: '#333' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * (tw + gap), top: Math.floor(i / cols) * (th + gap) })))
  .png()
  .toFile(path.join(outDir, process.env.NAME || 'sheet.png'));
console.log('sheet →', path.join(outDir, process.env.NAME || 'sheet.png'));
