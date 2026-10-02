import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { hash } from '../../lib/anim';

/** Frames per exposure: on threes (10 a second) — calm, hand-made stop motion. */
export const STEP = 3;

/**
 * Stop-motion: everything inside animates "on threes" — the picture only
 * changes every `step` frames, like hand-moved cutouts under a camera.
 */
export function StopMotion({ children, step = STEP }: { children: React.ReactNode; step?: number }) {
  const frame = useCurrentFrame();
  return <Freeze frame={Math.floor(frame / step) * step}>{children}</Freeze>;
}

/** Per-exposure "boil": a tiny re-placement jitter that changes every step. */
export function Boil({ children, seed = 1, amount = 1, style }: { children: React.ReactNode; seed?: number; amount?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  // A new placement every other exposure: a gentle shimmer, not a vibration.
  const s = Math.floor(frame / (STEP * 2));
  const x = (hash(s, seed, 1) - 0.5) * 2.4 * amount;
  const y = (hash(s, seed, 2) - 0.5) * 2.4 * amount;
  const r = (hash(s, seed, 3) - 0.5) * 0.5 * amount;
  return <div style={{ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`, ...style }}>{children}</div>;
}

/** Exposure flicker + paper tooth: the "shot on a rostrum camera" layer. */
export function Exposure() {
  const frame = useCurrentFrame();
  const s = Math.floor(frame / STEP);
  const flicker = (hash(s, 77) - 0.5) * 0.04;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: flicker > 0 ? `rgba(255,248,235,${flicker * 0.5})` : `rgba(0,0,0,${-flicker})`,
      }}
    />
  );
}

/** Stepped interpolation: snap progress to a few held poses (classic stop-motion ease). */
export const held = (k: number, poses = 4) => Math.round(k * poses) / poses;
