import { Easing, interpolate, spring, type SpringConfig } from 'remotion';
import { noise2D } from '@remotion/noise';

export const ease = {
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  outQuart: Easing.bezier(0.25, 1, 0.5, 1),
  inOutCubic: Easing.bezier(0.65, 0, 0.35, 1),
  inOutQuint: Easing.bezier(0.83, 0, 0.17, 1),
  inExpo: Easing.bezier(0.7, 0, 0.84, 0),
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: (x: number) => x,
};

/** interpolate() over seconds, clamped, with an easing. */
export function tween(
  t: number,
  [t0, t1]: [number, number],
  [v0, v1]: [number, number] = [0, 1],
  easing: (x: number) => number = ease.outExpo,
) {
  return interpolate(t, [t0, t1], [v0, v1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Multi-stop clamped interpolation over seconds. */
export function keys(t: number, times: number[], values: number[], easing = ease.inOutCubic) {
  return interpolate(t, times, values, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** A spring that starts at `at` seconds. */
export function pop(t: number, fps: number, at: number, config: Partial<SpringConfig> = {}) {
  return spring({
    frame: Math.round((t - at) * fps),
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.8, ...config },
  });
}

/** In-then-out envelope: rises over `inDur` after `a`, falls over `outDur` before `b`. */
export function inOut(t: number, a: number, b: number, inDur = 0.35, outDur = 0.3) {
  return Math.min(tween(t, [a, a + inDur]), 1 - tween(t, [b - outDur, b], [0, 1], ease.inOutCubic));
}

/** Organic camera shake (pixels / degrees) driven by simplex noise. */
export function shake(t: number, amount: number, seed = 'shake', speed = 18) {
  return {
    x: noise2D(`${seed}-x`, t * speed, 0) * amount,
    y: noise2D(`${seed}-y`, t * speed, 0) * amount,
    r: noise2D(`${seed}-r`, t * speed * 0.6, 0) * amount * 0.04,
  };
}

/** Deterministic pseudo-random in [0, 1) from any number of inputs. */
export function hash(...n: number[]) {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) + 0x9e3779b9;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
