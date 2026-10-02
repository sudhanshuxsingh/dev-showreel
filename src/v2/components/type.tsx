import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { ease, tween } from '../../lib/anim';

/** Real (sub-frame) motion blur for fast-moving layers. */
export function Blur({ children, samples = 6, shutter = 200 }: { children: React.ReactNode; samples?: number; shutter?: number }) {
  return (
    <CameraMotionBlur samples={samples} shutterAngle={shutter}>
      {children}
    </CameraMotionBlur>
  );
}

/** A flat colour field, optionally revealed by an expanding circle from (x, y). */
export function Field({ color, t, at = -1, x = 540, y = 960, dur = 0.5 }: { color: string; t: number; at?: number; x?: number; y?: number; dur?: number }) {
  if (t < at) return null;
  const k = at < 0 ? 1 : tween(t, [at, at + dur], [0, 1], ease.inOutQuint);
  const r = k * 2300;
  return <AbsoluteFill style={{ background: color, clipPath: k >= 1 ? undefined : `circle(${r}px at ${x}px ${y}px)` }} />;
}

/**
 * Content that rises out of a mask (like type set in a slot). `out` slides it
 * up and away. Sizes are the slot's — keep `height` ≈ line height.
 */
export function Rise({
  t,
  at,
  out,
  dur = 0.6,
  outDur = 0.45,
  height,
  children,
  style,
  from = 1.05,
}: {
  t: number;
  at: number;
  out?: number;
  dur?: number;
  outDur?: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  from?: number;
}) {
  const inK = tween(t, [at, at + dur], [0, 1], ease.outExpo);
  const outK = out !== undefined ? tween(t, [out, out + outDur], [0, 1], ease.inExpo) : 0;
  const y = (1 - inK) * from - outK * from;
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', ...style }}>
      <div style={{ transform: `translateY(${y * 100}%)` }}>{children}</div>
    </div>
  );
}

/** Per-letter entrance: each glyph slides from `dir`, staggered. */
export function Letters({
  text,
  t,
  at,
  stagger = 0.04,
  dur = 0.55,
  dir = 'up',
  style,
  letterStyle,
}: {
  text: string;
  t: number;
  at: number;
  stagger?: number;
  dur?: number;
  dir?: 'up' | 'down' | 'right' | 'left';
  style?: React.CSSProperties;
  letterStyle?: (i: number, k: number) => React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', overflow: 'hidden', whiteSpace: 'pre', ...style }}>
      {[...text].map((ch, i) => {
        const k = tween(t, [at + i * stagger, at + i * stagger + dur], [0, 1], ease.outExpo);
        const d = 1 - k;
        const transform =
          dir === 'up' ? `translateY(${d * 110}%)` : dir === 'down' ? `translateY(${-d * 110}%)` : dir === 'right' ? `translateX(${d * 160}%)` : `translateX(${-d * 160}%)`;
        return (
          <span key={i} style={{ display: 'inline-block', transform, ...letterStyle?.(i, k) }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
}

/** Split-flap roll from one glyph to another at `at`. */
export function Roll({ from, to, t, at, dur = 0.32, height }: { from: string; to: string; t: number; at: number; dur?: number; height: number }) {
  const k = tween(t, [at, at + dur], [0, 1], ease.inOutQuint);
  if (from === to) return <span style={{ display: 'inline-block' }}>{to}</span>;
  // Both glyphs share one grid cell, so the slot is as wide as the wider one —
  // a blank "from" (e.g. a space) can no longer collapse and hide the new glyph.
  const glyph = (c: string) => (c.trim() === '' ? '\u00A0' : c);
  return (
    <span style={{ display: 'inline-grid', height, overflow: 'hidden', verticalAlign: 'top', whiteSpace: 'pre' }}>
      <span style={{ gridArea: '1 / 1', transform: `translateY(${-k * 100}%)` }}>{glyph(from)}</span>
      <span style={{ gridArea: '1 / 1', transform: `translateY(${(1 - k) * 100}%)` }}>{glyph(to)}</span>
    </span>
  );
}
