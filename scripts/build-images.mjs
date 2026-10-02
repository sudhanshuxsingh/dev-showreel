// Image pipeline: slices the source sheets in assets-src/ into individual,
// registered frames in public/sprites/ and writes src/data/sprites.json.
// Also generates the film-grain tiles in public/textures/.
//
//   body-sheet.webp   2 × 4 full-body pixel frames (idle, walk, power-up)
//   faces-sheet.webp  3 × 12 expression portraits with labels underneath
//   haki-strip.webp   8 × (250 × 340) face power-up on black (from the portfolio)
//
// Every frame of a set is placed on one shared canvas with its anchor at the
// same pixel, so swapping frames never makes the character jump.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = (p) => path.join(root, 'assets-src', p);
const out = (p) => path.join(root, 'public', p);

async function load(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function crop(img, x0, y0, w, h) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x + x0;
      const sy = y + y0;
      if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
      img.data.copy(data, (y * w + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
    }
  }
  return { data, w, h };
}

const alphaAt = (img, x, y) => img.data[(y * img.w + x) * 4 + 3];

function bbox(img, threshold = 16) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (alphaAt(img, x, y) > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

const runs = (arr) => {
  const result = [];
  let start = -1;
  arr.forEach((v, i) => {
    if (v > 0 && start < 0) start = i;
    if (v === 0 && start >= 0) {
      result.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) result.push([start, arr.length - 1]);
  return result;
};

/** Paste `img` into a new canvas so that its (ax, ay) lands on (cx, cy). */
function place(img, ax, ay, cw, ch, cx, cy) {
  return crop(img, Math.round(ax - cx), Math.round(ay - cy), cw, ch);
}

async function save(img, file) {
  await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

/** Sum of squared RGB differences over pixels opaque in both, per pixel. */
function diff(a, b, dx, dy, region) {
  let sum = 0;
  let n = 0;
  for (let y = region.y0; y < region.y1; y += 1) {
    for (let x = region.x0; x < region.x1; x += 1) {
      const bx = x + dx;
      const by = y + dy;
      if (bx < 0 || by < 0 || bx >= b.w || by >= b.h) continue;
      const ia = (y * a.w + x) * 4;
      const ib = (by * b.w + bx) * 4;
      if (a.data[ia + 3] < 200 || b.data[ib + 3] < 200) continue;
      for (let c = 0; c < 3; c++) {
        const d = a.data[ia + c] - b.data[ib + c];
        sum += d * d;
      }
      n++;
    }
  }
  return n > 50 ? sum / n : Infinity;
}

/** Best integer translation of `b` onto `a`, judged on the eyes/glasses band. */
function register(a, b, region, range = 10) {
  let best = { dx: 0, dy: 0, score: Infinity };
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const score = diff(a, b, dx, dy, region);
      if (score < best.score) best = { dx, dy, score };
    }
  }
  return best;
}

// --- Body sheet --------------------------------------------------------------
async function body() {
  const sheet = await load(src('body-sheet.webp'));
  const rowCounts = new Array(sheet.h).fill(0);
  for (let y = 0; y < sheet.h; y++)
    for (let x = 0; x < sheet.w; x++) if (alphaAt(sheet, x, y) > 24) rowCounts[y]++;
  const bands = runs(rowCounts).filter(([a, b]) => b - a > 40);

  const frames = [];
  for (const [y0, y1] of bands) {
    const colCounts = new Array(sheet.w).fill(0);
    for (let y = y0; y <= y1; y++)
      for (let x = 0; x < sheet.w; x++) if (alphaAt(sheet, x, y) > 24) colCounts[x]++;
    for (const [x0, x1] of runs(colCounts).filter(([a, b]) => b - a > 20)) {
      const pad = 6;
      const img = crop(sheet, x0 - pad, y0 - pad, x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2);
      frames.push(img);
    }
  }
  if (frames.length !== 8) throw new Error(`expected 8 body frames, got ${frames.length}`);

  // Anchor: horizontal = centroid of the head (top 22% of the solid figure),
  // vertical = lowest row of solid shoe pixels. Haki lightning is mostly
  // saturated red, so "solid" excludes strongly red pixels.
  const solid = (img, x, y) => {
    const i = (y * img.w + x) * 4;
    const [r, g, b, a] = [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
    const reddish = r > 140 && r > g * 2.2 && r > b * 2.2;
    return a > 200 && !reddish;
  };
  const anchors = frames.map((img) => {
    let top = img.h, bottom = -1;
    for (let y = 0; y < img.h; y++) {
      let count = 0;
      for (let x = 0; x < img.w; x++) if (solid(img, x, y)) count++;
      if (count > 6) {
        if (y < top) top = y;
        bottom = y;
      }
    }
    const headEnd = top + (bottom - top) * 0.22;
    let sx = 0, n = 0;
    for (let y = top; y < headEnd; y++)
      for (let x = 0; x < img.w; x++)
        if (solid(img, x, y)) {
          sx += x;
          n++;
        }
    return { ax: sx / n, ay: bottom, top };
  });

  const left = Math.max(...anchors.map((a) => a.ax));
  const right = Math.max(...frames.map((f, i) => f.w - anchors[i].ax));
  const up = Math.max(...anchors.map((a) => a.ay));
  const down = Math.max(...frames.map((f, i) => f.h - anchors[i].ay));
  const half = Math.ceil(Math.max(left, right));
  const cw = half * 2;
  const ch = Math.ceil(up + down);
  const cy = Math.ceil(up);

  const names = ['idle-a', 'idle-b', 'walk-1', 'walk-2', 'walk-3', 'walk-4', 'haki-a', 'haki-b'];
  for (let i = 0; i < frames.length; i++) {
    const placed = place(frames[i], anchors[i].ax, anchors[i].ay, cw, ch, half, cy);
    await save(placed, out(`sprites/body-${names[i]}.png`));
  }
  const heights = anchors.map((a) => Math.round(a.ay - a.top));
  return { width: cw, height: ch, anchorX: half, anchorY: cy, figureHeight: Math.max(...heights), frames: names };
}

// --- Faces sheet ---------------------------------------------------------------
const FACE_NAMES = [
  'neutral', 'serious', 'happy', 'smile', 'angry', 'focused', 'suspicious', 'surprised',
  'talk-1', 'talk-2', 'talk-3', 'talk-4',
  'left-neutral', 'left-serious', 'left-smile', 'left-angry',
  'right-neutral', 'right-serious', 'right-smile', 'right-angry',
  'look-up', 'look-down', 'blink', 'wink',
  'haki-idle', 'haki-intense', 'haki-eye-glow', 'haki-rage', 'haki-side-1', 'haki-side-2',
  'haki-down', 'haki-up', 'eyes-closed', 'shadow', 'profile-left', 'profile-right',
]; // prettier-ignore

async function faces() {
  const sheet = await load(src('faces-sheet.webp'));
  // Band tops and the first row of each label line, measured from the sheet.
  const bands = [
    { top: 0, labelTop: 152 },
    { top: 170, labelTop: 312 },
    { top: 332, labelTop: 475 },
  ];
  const cell = 125;
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 12; c++) {
      const { top, labelTop } = bands[r];
      const img = crop(sheet, c * cell, top, cell, labelTop - top);
      // Soften the vertical cell cuts so a neighbour's aura never ends in a hard edge.
      const feather = 6;
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < feather; x++) {
          const k = x / feather;
          img.data[(y * img.w + x) * 4 + 3] *= k;
          img.data[(y * img.w + (img.w - 1 - x)) * 4 + 3] *= k;
        }
      }
      cells.push(img);
    }
  }

  // Register every face that shares the reference's framing (front-facing)
  // against 01_NEUTRAL using the eyes/glasses band, so lip-sync swaps are still.
  const reference = cells[0];
  const box = bbox(reference, 128);
  const eyeBand = {
    x0: box.x0 + 8,
    x1: box.x1 - 8,
    y0: Math.round(box.y0 + (box.y1 - box.y0) * 0.42),
    y1: Math.round(box.y0 + (box.y1 - box.y0) * 0.62),
  };
  const frontFacing = new Set([
    'neutral', 'serious', 'happy', 'smile', 'angry', 'focused', 'suspicious', 'surprised',
    'talk-1', 'talk-2', 'talk-3', 'talk-4', 'blink', 'wink',
    'haki-idle', 'haki-intense', 'haki-eye-glow', 'eyes-closed',
  ]); // prettier-ignore

  const offsets = cells.map((img, i) => {
    if (i === 0 || !frontFacing.has(FACE_NAMES[i])) return { dx: 0, dy: 0 };
    const { dx, dy, score } = register(reference, img, eyeBand, 9);
    return { dx, dy, score: Math.round(score) };
  });

  const pad = 12;
  const cw = cell + pad * 2;
  const ch = Math.max(...cells.map((c) => c.h)) + pad * 2;
  for (let i = 0; i < cells.length; i++) {
    const { dx, dy } = offsets[i];
    // Shift so the face's features line up with the reference.
    const placed = crop(cells[i], -pad + dx, -pad + dy, cw, ch);
    await save(placed, out(`sprites/face-${String(i + 1).padStart(2, '0')}-${FACE_NAMES[i]}.png`));
  }
  return {
    width: cw,
    height: ch,
    frames: FACE_NAMES.map((name, i) => ({
      name,
      file: `sprites/face-${String(i + 1).padStart(2, '0')}-${name}.png`,
      ...offsets[i],
    })),
  };
}

// --- Haki strip (face power-up on black) ------------------------------------
async function hakiStrip() {
  const meta = await sharp(src('haki-strip.webp')).metadata();
  const frames = 8;
  const fw = Math.round(meta.width / frames);
  for (let i = 0; i < frames; i++) {
    await sharp(src('haki-strip.webp'))
      .extract({ left: i * fw, top: 0, width: fw, height: meta.height })
      .png({ compressionLevel: 9 })
      .toFile(out(`sprites/haki-face-${i}.png`));
  }
  return { width: fw, height: meta.height, frames };
}

// --- Grain ----------------------------------------------------------------------
async function grain() {
  // Half-resolution frames, shown at 2x: softer, more filmic grain.
  const width = 600;
  const height = 1080;
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let t = 0; t < 6; t++) {
    const data = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      // Sum of uniforms ≈ gaussian, centred on mid-grey for overlay blending.
      const v = Math.max(0, Math.min(255, 128 + ((rand() + rand() + rand() - 1.5) / 1.5) * 150));
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(out(`textures/grain-${t}.png`));
  }
  return { width, height, tiles: 6 };
}

await fs.mkdir(out('sprites'), { recursive: true });
await fs.mkdir(out('textures'), { recursive: true });
const manifest = {
  body: await body(),
  faces: await faces(),
  hakiFace: await hakiStrip(),
  grain: await grain(),
};
await fs.writeFile(
  path.join(root, 'src/data/sprites.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(JSON.stringify(
  { body: { ...manifest.body, frames: undefined }, faces: manifest.faces.frames.filter((f) => f.score !== undefined).map((f) => `${f.name}:${f.dx},${f.dy} (${f.score})`) },
  null,
  1,
));
