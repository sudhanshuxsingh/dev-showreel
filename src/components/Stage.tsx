import React, { useId } from 'react';
import { ease, hash, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, W, glow, withAlpha } from '../lib/theme';

// --- Chapter header ------------------------------------------------------------------

export function ChapterHeader({
  t,
  fps,
  index,
  label,
  kanji,
  line,
  exit,
  top = 168,
}: {
  t: number;
  fps: number;
  index: number;
  label: string;
  kanji: string;
  line: string;
  exit?: number;
  top?: number;
}) {
  const leave = exit !== undefined ? tween(t, [exit, exit + 0.4], [0, 1], ease.inOutCubic) : 0;
  const rule = tween(t, [0.05, 0.9], [0, 1], ease.inOutQuint);
  const num = tween(t, [0, 0.5]);
  const word = pop(t, fps, 0.08, { damping: 18, stiffness: 140 });
  const kanjiIn = tween(t, [0.15, 0.9]);
  const sub = tween(t, [0.35, 1.1]);
  return (
    <div style={{ position: 'absolute', left: M, right: M, top, opacity: 1 - leave, transform: `translateY(${-leave * 40}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.16em', color: C.dim, opacity: num }}>
        <span style={{ color: C.red }}>CH.{String(index).padStart(2, '0')}</span>
        <span style={{ flex: 1, height: 1, background: C.lineStrong, transform: `scaleX(${rule})`, transformOrigin: 'left' }} />
        <span>{String(index).padStart(2, '0')} / 05</span>
      </div>
      <div style={{ position: 'relative', marginTop: 18, height: 132, overflow: 'hidden' }}>
        <div
          style={{
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: label.length > 8 ? 108 : 132,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: C.text,
            transform: `translateY(${(1 - word) * 110}%)`,
            paddingTop: label.length > 8 ? 18 : 0,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: -6,
          top: 44,
          fontFamily: F.jp,
          fontWeight: 900,
          fontSize: 86,
          lineHeight: 1,
          color: C.red,
          writingMode: 'vertical-rl',
          letterSpacing: '0.08em',
          textShadow: glow(C.red, 20, 0.5),
          opacity: kanjiIn,
          clipPath: `inset(0 0 ${(1 - kanjiIn) * 100}% 0)`,
        }}
      >
        {kanji}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 46,
          color: C.dim,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 16}px)`,
          letterSpacing: '-0.01em',
        }}
      >
        {line}
      </div>
    </div>
  );
}

// --- App window -----------------------------------------------------------------------------

export function Window({
  x,
  y,
  w,
  h,
  title,
  children,
  style,
  bar = 56,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bar?: number;
  accent?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 26,
        background: C.panel,
        border: `1.5px solid ${C.lineStrong}`,
        boxShadow: '0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 22px',
          borderBottom: `1px solid ${C.line}`,
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        {[accent ?? '#3a3a42', '#3a3a42', '#3a3a42'].map((c, i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
        ))}
        <div style={{ flex: 1, textAlign: 'center', fontFamily: F.mono, fontSize: 21, color: C.mute, marginRight: 66 }}>{title}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: bar, bottom: 0 }}>{children}</div>
    </div>
  );
}

// --- Cursor ---------------------------------------------------------------------------------

export type CursorKey = { t: number; x: number; y: number };

/** Smoothly interpolated cursor along keyframes, with click ripples. */
export function Cursor({
  t,
  path,
  name,
  color = C.red,
  clicks = [],
  scale = 1,
  opacity = 1,
}: {
  t: number;
  path: CursorKey[];
  name?: string;
  color?: string;
  clicks?: number[];
  scale?: number;
  opacity?: number;
}) {
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (t >= a.t) {
      const k = tween(t, [a.t, b.t], [0, 1], ease.inOutCubic);
      x = a.x + (b.x - a.x) * k;
      y = a.y + (b.y - a.y) * k;
    }
  }
  const pressed = clicks.some((c) => t >= c && t < c + 0.12);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity, transform: `scale(${scale * (pressed ? 0.88 : 1)})`, transformOrigin: '0 0' }}>
      {clicks.map((c) =>
        t >= c && t < c + 0.6 ? (
          <div
            key={c}
            style={{
              position: 'absolute',
              left: -30,
              top: -30,
              width: 60,
              height: 60,
              borderRadius: 30,
              border: `3px solid ${color}`,
              opacity: 1 - tween(t, [c, c + 0.6]),
              transform: `scale(${0.3 + tween(t, [c, c + 0.6]) * 1.2})`,
            }}
          />
        ) : null,
      )}
      <svg width={40} height={46} viewBox="0 0 20 23" style={{ display: 'block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
        <path d="M2 1.5 L2 18 L6.4 14 L9.6 21 L12.6 19.6 L9.5 12.8 L15.5 12.8 Z" fill={color} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
      {name && (
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 34,
            padding: '6px 14px',
            borderRadius: 10,
            background: color,
            color: '#fff',
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 22,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}

// --- Red sun -------------------------------------------------------------------------------

/** The hinomaru / synth sun: gradient disc with stripes cut into its lower half. */
export function Sun({ cx, cy, r, t, stripes = 1, glowAmount = 1, opacity = 1 }: { cx: number; cy: number; r: number; t: number; stripes?: number; glowAmount?: number; opacity?: number }) {
  const id = useId().replace(/:/g, '');
  const bands = 7;
  const scroll = (t * 0.35) % 1;
  return (
    <div style={{ position: 'absolute', left: cx - r * 1.8, top: cy - r * 1.8, width: r * 3.6, height: r * 3.6, opacity, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${withAlpha(C.red, 0.55 * glowAmount)}, ${withAlpha(C.redDeep, 0.18 * glowAmount)} 55%, transparent 100%)`,
        }}
      />
      <svg width={r * 3.6} height={r * 3.6} viewBox={`${-r * 1.8} ${-r * 1.8} ${r * 3.6} ${r * 3.6}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF6A3D" />
            <stop offset="0.5" stopColor={C.red} />
            <stop offset="1" stopColor={C.redDeep} />
          </linearGradient>
          <mask id={`${id}m`}>
            <rect x={-r} y={-r} width={r * 2} height={r * 2} fill="#fff" />
            {Array.from({ length: bands }, (_, i) => {
              const k = (i + scroll) / bands;
              const y = k * r;
              const hgt = (2 + k * k * r * 0.13) * stripes;
              return <rect key={i} x={-r} y={y} width={r * 2} height={hgt} fill="#000" />;
            })}
          </mask>
        </defs>
        <circle cx={0} cy={0} r={r} fill={`url(#${id}f)`} mask={`url(#${id}m)`} />
      </svg>
    </div>
  );
}

// --- Lightning ------------------------------------------------------------------------------

function bolt(x1: number, y1: number, x2: number, y2: number, seed: number, detail = 6, spread = 0.22) {
  let pts: [number, number][] = [
    [x1, y1],
    [x2, y2],
  ];
  let off = Math.hypot(x2 - x1, y2 - y1) * spread;
  for (let level = 0; level < detail; level++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const nx = -(by - ay);
      const ny = bx - ax;
      const len = Math.hypot(nx, ny) || 1;
      const d = (hash(seed, level, i) - 0.5) * 2 * off;
      next.push([mx + (nx / len) * d, my + (ny / len) * d], pts[i]);
    }
    pts = next;
    off *= 0.55;
  }
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
}

export type BoltSpec = { x1: number; y1: number; x2: number; y2: number };

/** Flickering lightning bolts; re-rolled every couple of frames. */
export function Lightning({ frame, bolts, intensity = 1, width = W, height = 1920, seed = 1 }: { frame: number; bolts: BoltSpec[]; intensity?: number; width?: number; height?: number; seed?: number }) {
  if (intensity <= 0) return null;
  const roll = Math.floor(frame / 2);
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <defs>
        <filter id={`boltglow${seed}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {bolts.map((b, i) => {
        if (hash(roll, i, seed) > 0.55 + intensity * 0.4) return null;
        const d = bolt(b.x1, b.y1, b.x2, b.y2, roll * 31 + i * 7 + seed);
        const a = intensity * (0.6 + hash(roll, i, 3) * 0.4);
        return (
          <g key={i} opacity={a}>
            <path d={d} stroke={C.red} strokeWidth={14} fill="none" filter={`url(#boltglow${seed})`} />
            <path d={d} stroke={C.redHot} strokeWidth={5} fill="none" strokeLinejoin="bevel" />
            <path d={d} stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="bevel" />
          </g>
        );
      })}
    </svg>
  );
}

// --- Embers ---------------------------------------------------------------------------------

/** Stateless rising embers: position is a pure function of time. */
export function Embers({ t, count = 40, x0 = 0, x1 = W, y0 = 1920, rise = 900, intensity = 1, color = C.red, seed = 1, size = 6 }: {
  t: number;
  count?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  rise?: number;
  intensity?: number;
  color?: string;
  seed?: number;
  size?: number;
}) {
  if (intensity <= 0) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const life = 1.6 + hash(i, seed) * 2.2;
        const phase = ((t + hash(i, seed, 2) * life) % life) / life;
        const x = x0 + hash(i, seed, 3) * (x1 - x0) + Math.sin(t * 2 + i) * 18 * phase;
        const y = y0 - phase * rise * (0.6 + hash(i, seed, 4) * 0.6);
        const s = size * (0.5 + hash(i, seed, 5));
        const o = Math.sin(phase * Math.PI) * intensity;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: s,
              height: s,
              background: hash(i, seed, 6) > 0.8 ? '#FFD2C2' : color,
              boxShadow: `0 0 ${s * 2.4}px ${withAlpha(color, 0.9)}`,
              opacity: o,
            }}
          />
        );
      })}
    </>
  );
}

// --- Shockwave ------------------------------------------------------------------------------

export function Shockwave({ t, at, cx, cy, size = 1400, dur = 0.9, color = C.red, width = 6 }: { t: number; at: number; cx: number; cy: number; size?: number; dur?: number; color?: string; width?: number }) {
  if (t < at || t > at + dur) return null;
  const k = tween(t, [at, at + dur], [0, 1], ease.outExpo);
  const s = 0.05 + k;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${width}px solid ${color}`,
        boxShadow: `${glow(color, 30, 0.7)}, inset ${glow(color, 20, 0.5)}`,
        transform: `scale(${s})`,
        opacity: 1 - tween(t, [at + dur * 0.3, at + dur], [0, 1], ease.linear),
        pointerEvents: 'none',
      }}
    />
  );
}
