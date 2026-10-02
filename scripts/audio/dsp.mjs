// A tiny offline DSP toolkit: everything the SFX and the ambient bed need,
// with no native dependencies. Signals are Float32Array (mono) or
// [Float32Array, Float32Array] (stereo) at SR. Time arguments are seconds.
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const SR = 48000;
export const TAU = Math.PI * 2;

export const samples = (seconds) => Math.max(0, Math.round(seconds * SR));
export const dbToGain = (db) => 10 ** (db / 20);
export const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic PRNG (mulberry32) so every render sounds the same. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const asFn = (v) => (typeof v === 'function' ? v : () => v);

// --- Curves --------------------------------------------------------------

/**
 * Piecewise curve through [t, value] points. Each segment eases with
 * `shape`: 1 = linear, >1 = slow start (exponential-ish), <1 = fast start.
 */
export function curve(points, shape = 1) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1, s] = points[i];
      const [t0, v0] = points[i - 1];
      if (t <= t1) {
        const k = (t - t0) / (t1 - t0 || 1);
        return v0 + (v1 - v0) * k ** (s ?? shape);
      }
    }
    return points[points.length - 1][1];
  };
}

/** Exponential glide between two frequencies over `duration` seconds. */
export const glide = (from, to, duration, delay = 0) => (t) => {
  const k = clamp((t - delay) / duration, 0, 1);
  return from * (to / from) ** k;
};

export const expDecay = (tau, delay = 0) => (t) =>
  t < delay ? 1 : Math.exp(-(t - delay) / tau);

/** Attack (linear) then exponential decay. */
export const pluck = (attack, tau) => (t) =>
  t < attack ? t / attack : Math.exp(-(t - attack) / tau);

/** Attack, hold, release envelope that ends exactly at `length`. */
export const ahr = (attack, length, release, shape = 2) => (t) => {
  if (t < attack) return (t / attack) ** shape;
  if (t > length) return 0;
  if (t > length - release) return ((length - t) / release) ** shape;
  return 1;
};

// --- Generators ------------------------------------------------------------

function polyBlep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Band-limited oscillator; `freq` may be a number or f(t). */
export function osc(type, freq, seconds, { phase = 0 } = {}) {
  const f = asFn(freq);
  const out = new Float32Array(samples(seconds));
  let p = phase % 1;
  for (let i = 0; i < out.length; i++) {
    const dt = Math.min(0.49, Math.max(0, f(i / SR) / SR));
    let v;
    switch (type) {
      case 'sine':
        v = Math.sin(TAU * p);
        break;
      case 'saw':
        v = 2 * p - 1 - polyBlep(p, dt);
        break;
      case 'square':
        v = (p < 0.5 ? 1 : -1) + polyBlep(p, dt) - polyBlep((p + 0.5) % 1, dt);
        break;
      case 'triangle':
        v = 1 - 4 * Math.abs(p - 0.5);
        break;
      default:
        throw new Error(`unknown oscillator ${type}`);
    }
    out[i] = v;
    p += dt;
    if (p >= 1) p -= 1;
  }
  return out;
}

/** Sum of detuned oscillators (supersaw-style), normalised to ~±1. */
export function unison(type, freq, seconds, { voices = 5, detune = 0.12, seed = 7 } = {}) {
  const f = asFn(freq);
  const r = rng(seed);
  const out = new Float32Array(samples(seconds));
  for (let v = 0; v < voices; v++) {
    const spread = voices === 1 ? 0 : (v / (voices - 1)) * 2 - 1;
    const ratio = 2 ** ((spread * detune) / 12);
    mixInto(out, osc(type, (t) => f(t) * ratio, seconds, { phase: r() }), 0, 1 / Math.sqrt(voices));
  }
  return out;
}

/** FM bell / pluck: carrier with one modulator whose index decays. */
export function fm(freq, seconds, { ratio = 3.5, index = 4, indexTau = 0.3 } = {}) {
  const f = asFn(freq);
  const out = new Float32Array(samples(seconds));
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fc = f(t);
    const I = index * Math.exp(-t / indexTau);
    out[i] = Math.sin(TAU * pc + I * Math.sin(TAU * pm));
    pc += fc / SR;
    pm += (fc * ratio) / SR;
    if (pc > 1) pc -= 1;
    if (pm > 1) pm -= 1;
  }
  return out;
}

export function noise(seconds, color = 'white', seed = 1) {
  const r = rng(seed);
  const out = new Float32Array(samples(seconds));
  if (color === 'white') {
    for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  } else if (color === 'pink') {
    // Paul Kellet's economy pink filter.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < out.length; i++) {
      const w = r() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < out.length; i++) {
      last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
      out[i] = last * 3.5;
    }
  }
  return out;
}

/** Sparse random impulses (crackle); density = impulses per second. */
export function dust(seconds, density, seed = 3) {
  const r = rng(seed);
  const out = new Float32Array(samples(seconds));
  const p = density / SR;
  for (let i = 0; i < out.length; i++) if (r() < p) out[i] = r() * 2 - 1;
  return out;
}

// --- Processing --------------------------------------------------------------

function biquadCoeffs(type, f0, Q, gainDb) {
  const w0 = (TAU * clamp(f0, 10, SR * 0.49)) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Q);
  const A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'peak':
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s); b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - s); a0 = A + 1 + (A - 1) * cos + s;
      a1 = -2 * (A - 1 + (A + 1) * cos); a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s); b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - s); a0 = A + 1 - (A - 1) * cos + s;
      a1 = 2 * (A - 1 - (A + 1) * cos); a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
    default:
      throw new Error(`unknown filter ${type}`);
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
} // prettier-ignore

/** RBJ biquad; `freq` and `q` may be functions of time (updated every 16 samples). */
export function filter(x, type, freq, q = Math.SQRT1_2, gainDb = 0) {
  const f = asFn(freq);
  const Q = asFn(q);
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = biquadCoeffs(type, f(0), Q(0), gainDb);
  for (let i = 0; i < x.length; i++) {
    if ((i & 15) === 0 && i > 0) c = biquadCoeffs(type, f(i / SR), Q(i / SR), gainDb);
    const xi = x[i];
    const yi = c[0] * xi + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    y[i] = yi;
  }
  return y;
}

/** Multiply by an envelope function of time. Mutates and returns x. */
export function shape(x, fn) {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR);
  return x;
}

export function gain(x, g) {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

/** Soft saturation; drive > 1 adds harmonics. */
export function saturate(x, drive = 2) {
  const norm = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / norm;
  return x;
}

export function bitcrush(x, bits = 6, hold = 4) {
  const steps = 2 ** bits;
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round(x[i] * steps) / steps;
    x[i] = held;
  }
  return x;
}

export function reverse(x) {
  return Float32Array.from(x).reverse();
}

/** Add `src` into `dst` at `at` seconds. Works for mono or stereo pairs. */
export function mixInto(dst, src, at = 0, g = 1) {
  const offset = samples(at);
  if (Array.isArray(dst)) {
    const pair = Array.isArray(src) ? src : [src, src];
    for (let c = 0; c < 2; c++) mixInto(dst[c], pair[c], at, g);
    return dst;
  }
  const n = Math.min(src.length, dst.length - offset);
  for (let i = 0; i < n; i++) dst[i + offset] += src[i] * g;
  return dst;
}

/** Equal-power pan of a mono signal; `pan` is -1..1 or f(t). */
export function pan(x, position = 0) {
  const p = asFn(position);
  const L = new Float32Array(x.length);
  const R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const a = ((clamp(p(i / SR), -1, 1) + 1) * Math.PI) / 4;
    L[i] = x[i] * Math.cos(a);
    R[i] = x[i] * Math.sin(a);
  }
  return [L, R];
}

export const stereo = (seconds) => [new Float32Array(samples(seconds)), new Float32Array(samples(seconds))];

export function peak(sig) {
  const chans = Array.isArray(sig) ? sig : [sig];
  let p = 0;
  for (const ch of chans) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]));
  return p;
}

export function normalize(sig, db = -1) {
  const p = peak(sig) || 1;
  const g = dbToGain(db) / p;
  for (const ch of Array.isArray(sig) ? sig : [sig]) gain(ch, g);
  return sig;
}

export function fade(sig, inSec = 0.002, outSec = 0.01) {
  for (const ch of Array.isArray(sig) ? sig : [sig]) {
    const a = samples(inSec);
    const b = samples(outSec);
    for (let i = 0; i < a && i < ch.length; i++) ch[i] *= i / a;
    for (let i = 0; i < b && i < ch.length; i++) ch[ch.length - 1 - i] *= i / b;
  }
  return sig;
}

/** Cut trailing samples quieter than `db` (keeps files short). */
export function trimTail(sig, db = -72) {
  const chans = Array.isArray(sig) ? sig : [sig];
  const th = dbToGain(db);
  let end = 0;
  for (const ch of chans) for (let i = ch.length - 1; i > end; i--) if (Math.abs(ch[i]) > th) { end = i; break; }
  const cut = chans.map((ch) => ch.slice(0, end + samples(0.02)));
  return fade(Array.isArray(sig) ? cut : cut[0], 0, 0.02);
}

// --- FFT convolution reverb ----------------------------------------------------

export function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = ((inverse ? 1 : -1) * TAU) / len;
    const wr0 = Math.cos(ang);
    const wi0 = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const vr = re[b] * wr - im[b] * wi;
        const vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
        const t = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = t;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

const pow2 = (n) => 2 ** Math.ceil(Math.log2(n));

/** Overlap-add FFT convolution. Output length = x + h - 1. */
export function convolve(x, h) {
  const M = h.length;
  const L = pow2(Math.max(M, 1 << 16));
  const N = pow2(L + M - 1);
  const Hr = new Float64Array(N);
  const Hi = new Float64Array(N);
  Hr.set(h);
  fft(Hr, Hi, false);
  const y = new Float32Array(x.length + M - 1);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let start = 0; start < x.length; start += L) {
    re.fill(0);
    im.fill(0);
    re.set(x.subarray(start, Math.min(start + L, x.length)));
    fft(re, im, false);
    for (let k = 0; k < N; k++) {
      const r = re[k] * Hr[k] - im[k] * Hi[k];
      im[k] = re[k] * Hi[k] + im[k] * Hr[k];
      re[k] = r;
    }
    fft(re, im, true);
    const n = Math.min(N, y.length - start);
    for (let i = 0; i < n; i++) y[start + i] += re[i];
  }
  return y;
}

const irCache = new Map();

/**
 * Synthetic stereo impulse response: decorrelated noise with an RT60 decay
 * and high frequencies dying faster than lows (a darkening, natural tail).
 */
export function impulse({ rt60 = 2, predelay = 0.012, bright = 6000, dark = 900, seed = 21 } = {}) {
  const key = JSON.stringify({ rt60, predelay, bright, dark, seed });
  if (irCache.has(key)) return irCache.get(key);
  const length = rt60 * 1.1 + predelay;
  const make = (s) => {
    const n = noise(length, 'white', s);
    const pre = samples(predelay);
    for (let i = 0; i < pre; i++) n[i] = 0;
    const out = filter(n, 'lowpass', (t) => dark + (bright - dark) * Math.exp(-t / (rt60 * 0.25)), 0.5);
    shape(out, (t) => (t < predelay ? 0 : Math.exp((-6.9 * (t - predelay)) / rt60)));
    // Early reflections: a few discrete taps for a sense of space.
    const r = rng(s + 99);
    for (let k = 0; k < 8; k++) {
      const at = samples(predelay + 0.004 + r() * 0.05);
      if (at < out.length) out[at] += (r() * 2 - 1) * 0.6 * (1 - k / 10);
    }
    return out;
  };
  const ir = [make(seed), make(seed + 1)];
  const norm = Math.sqrt(ir[0].reduce((s, v) => s + v * v, 0));
  for (const ch of ir) gain(ch, 1 / norm);
  irCache.set(key, ir);
  return ir;
}

/** Wet/dry reverb on mono or stereo input; returns a stereo pair with the tail. */
export function reverb(sig, { wet = 0.3, dry = 1, ...ir } = {}) {
  const [L, R] = Array.isArray(sig) ? sig : [sig, sig];
  const [irL, irR] = impulse(ir);
  const wl = convolve(L, irL);
  const wr = convolve(R, irR);
  const out = [new Float32Array(wl.length), new Float32Array(wr.length)];
  mixInto(out[0], L, 0, dry);
  mixInto(out[1], R, 0, dry);
  mixInto(out[0], wl, 0, wet);
  mixInto(out[1], wr, 0, wet);
  return out;
}

/** Stereo feedback delay (ping-pong). */
export function delay(sig, { time = 0.25, feedback = 0.35, mix = 0.25, tail = 2, lowpass = 3500 } = {}) {
  const [L, R] = Array.isArray(sig) ? sig : [sig, sig];
  const len = L.length + samples(tail);
  const out = [new Float32Array(len), new Float32Array(len)];
  mixInto(out[0], L);
  mixInto(out[1], R);
  const d = samples(time);
  // Two lines: A echoes on the left, B (fed by A) on the right, B feeds A back.
  const A = new Float32Array(len);
  const B = new Float32Array(len);
  let lp = 0;
  const k = Math.exp((-TAU * lowpass) / SR);
  for (let i = 0; i < len; i++) {
    const input = ((i < L.length ? L[i] : 0) + (i < R.length ? R[i] : 0)) * 0.5;
    const a = i >= d ? A[i - d] : 0;
    const b = i >= d ? B[i - d] : 0;
    lp = b + (lp - b) * k;
    A[i] = input + lp * feedback;
    B[i] = a;
    out[0][i] += a * mix;
    out[1][i] += b * mix;
  }
  return out;
}

// --- I/O ------------------------------------------------------------------------

/** 16-bit PCM WAV with TPDF dither. */
export async function writeWav(file, sig, { db } = {}) {
  const chans = Array.isArray(sig) ? sig : [sig];
  if (db !== undefined) normalize(chans, db);
  const len = chans[0].length;
  const nch = chans.length;
  const dataSize = len * nch * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nch * 2, 28);
  buf.writeUInt16LE(nch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  const r = rng(12345);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nch; c++) {
      const v = clamp(chans[c][i] * 32767 + (r() - r()), -32768, 32767);
      buf.writeInt16LE(Math.round(v), o);
      o += 2;
    }
  }
  await fs.writeFile(file, buf);
}

/** Parse a PCM/float WAV into Float32Array channels. */
export function parseWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a RIFF file');
  let o = 12;
  let fmt;
  while (o < buf.length) {
    const id = buf.toString('ascii', o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(o + 8),
        channels: buf.readUInt16LE(o + 10),
        rate: buf.readUInt32LE(o + 12),
        bits: buf.readUInt16LE(o + 22),
      };
    } else if (id === 'data') {
      const { channels, bits, format, rate } = fmt;
      const bytes = bits / 8;
      const frames = Math.floor(size / (bytes * channels));
      const out = Array.from({ length: channels }, () => new Float32Array(frames));
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < channels; c++) {
          const p = o + 8 + (i * channels + c) * bytes;
          let v;
          if (format === 3 && bits === 32) v = buf.readFloatLE(p);
          else if (bits === 16) v = buf.readInt16LE(p) / 32768;
          else if (bits === 24) v = buf.readIntLE(p, 3) / 8388608;
          else if (bits === 32) v = buf.readInt32LE(p) / 2147483648;
          else throw new Error(`unsupported wav: ${bits} bit`);
          out[c][i] = v;
        }
      }
      return { rate, channels: out };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error('no data chunk');
}

const run = promisify(execFile);

/**
 * Decode any audio file (mp3, m4a, wav, flac…) to mono Float32 at `rate`
 * using the ffmpeg binary that ships with Remotion (its build has no raw
 * PCM muxer, so it goes through a temporary 16-bit WAV).
 */
export async function decodeMono(file, rate = 16000) {
  const dir = new URL('../.cache/', import.meta.url).pathname;
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${dir}decode-${process.pid}-${Date.now()}.wav`;
  await run('npx', ['remotion', 'ffmpeg', '-v', 'error', '-y', '-i', file, '-ac', '1', '-ar', String(rate), '-acodec', 'pcm_s16le', '-f', 'wav', tmp], {
    maxBuffer: 1024 * 1024 * 64,
  });
  const { channels } = parseWav(await fs.readFile(tmp));
  await fs.rm(tmp, { force: true });
  return channels[0];
}

/** Decode any audio file to stereo Float32 channels at `rate` (Remotion's ffmpeg). */
export async function decodeStereo(file, rate = SR) {
  const dir = new URL('../.cache/', import.meta.url).pathname;
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${dir}decode-st-${process.pid}-${Date.now()}.wav`;
  await run('npx', ['remotion', 'ffmpeg', '-v', 'error', '-y', '-i', file, '-ac', '2', '-ar', String(rate), '-acodec', 'pcm_s16le', '-f', 'wav', tmp], {
    maxBuffer: 1024 * 1024 * 64,
  });
  const { channels } = parseWav(await fs.readFile(tmp));
  await fs.rm(tmp, { force: true });
  return channels;
}

// --- Voice helpers ----------------------------------------------------------------

/** Feed-forward peak compressor (smooth, for dialogue). Mutates x. */
export function compress(x, { threshold = -20, ratio = 3, attack = 0.004, release = 0.15, makeup = 0 } = {}) {
  const a = Math.exp(-1 / (attack * SR));
  const r = Math.exp(-1 / (release * SR));
  const th = dbToGain(threshold);
  const mk = dbToGain(makeup);
  let env = 0;
  for (let i = 0; i < x.length; i++) {
    const level = Math.abs(x[i]);
    env = level > env ? a * env + (1 - a) * level : r * env + (1 - r) * level;
    let g = 1;
    if (env > th) {
      const over = 20 * Math.log10(env / th);
      g = dbToGain(over / ratio - over);
    }
    x[i] *= g * mk;
  }
  return x;
}

/** Exact 2× upsampling with a Blackman-windowed sinc (e.g. 24 kHz TTS → 48 kHz). */
export function upsample2(x, taps = 24) {
  const out = new Float32Array(x.length * 2);
  const weights = [];
  for (let k = -taps + 1; k <= taps; k++) {
    const d = 0.5 - k;
    const sinc = Math.sin(Math.PI * d) / (Math.PI * d);
    const n = (d + taps) / (2 * taps);
    const w = 0.42 - 0.5 * Math.cos(TAU * n) + 0.08 * Math.cos(2 * TAU * n);
    weights.push([k, sinc * w]);
  }
  for (let i = 0; i < x.length; i++) {
    out[2 * i] = x[i];
    let s = 0;
    for (const [k, w] of weights) {
      const j = i + k;
      if (j >= 0 && j < x.length) s += x[j] * w;
    }
    out[2 * i + 1] = s;
  }
  return out;
}

/** RMS over the samples louder than `gateDb` below peak (speech-only loudness). */
export function activeRms(x, gateDb = -35) {
  const gate = peak(x) * dbToGain(gateDb);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i]) > gate) {
      sum += x[i] * x[i];
      n++;
    }
  }
  return Math.sqrt(sum / Math.max(1, n));
}

/**
 * Look-ahead peak limiter: never lets |x| exceed `ceiling`, with a smooth
 * release so it doesn't pump. Mutates x.
 */
export function limit(x, { ceiling = 0.89, lookahead = 0.005, release = 0.08 } = {}) {
  const la = Math.max(1, samples(lookahead));
  const rel = Math.exp(-1 / (release * SR));
  const need = new Float32Array(x.length);
  // Required gain per sample, spread back over the look-ahead window.
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    need[i] = a > ceiling ? ceiling / a : 1;
  }
  let current = 1;
  for (let i = 0; i < x.length; i++) {
    let target = 1;
    for (let k = 0; k < la && i + k < x.length; k++) target = Math.min(target, need[i + k]);
    current = target < current ? target : rel * current + (1 - rel) * target;
    x[i] *= Math.min(current, target === 1 ? current : target);
  }
  return x;
}
