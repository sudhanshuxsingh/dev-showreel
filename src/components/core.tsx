import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Html5Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import sfxJson from '../data/sfx.json';
import { hash, tween, ease } from '../lib/anim';
import { C, M, W, H, withAlpha } from '../lib/theme';

export const MIX = {
  vo: 1,
  sfx: 0.72,
  bed: 0.42,
  music: 0.6,
};

/**
 * Per-bus multipliers (lets a render solo one stem for level checks) and the
 * SFX duck curve, a function of absolute time, so effects sit under speech.
 */
export type Mix = { vo: number; sfx: number; bed: number; music: number; sfxDuck: (t: number) => number };
export const MixContext = createContext<Mix>({ vo: 1, sfx: 1, bed: 1, music: 1, sfxDuck: () => 1 });
/** Absolute start frame of the enclosing scene (Sfx uses it to read the duck curve). */
export const SceneOffset = createContext(0);

export type SfxName = keyof typeof sfxJson;
const sfxMeta = sfxJson as Record<SfxName, { duration: number; base: number }>;

/**
 * One sound effect at `at` seconds (relative to the enclosing Sequence).
 * `dur` cuts it short with a quick fade (e.g. typing that stops early).
 */
export function Sfx({ name, at, volume = 1, rate = 1, dur }: { name: SfxName; at: number; volume?: number; rate?: number; dur?: number }) {
  const { fps } = useVideoConfig();
  const { sfx: bus, sfxDuck } = useContext(MixContext);
  const offset = useContext(SceneOffset);
  const meta = sfxMeta[name];
  if (bus === 0) return null;
  const startFrame = Math.round(at * fps);
  const full = Math.ceil((meta.duration / rate) * fps) + 2;
  const frames = dur ? Math.min(full, Math.round(dur * fps)) : full;
  const gain = volume * meta.base * MIX.sfx * bus;
  const fadeFrames = 4;
  return (
    <Sequence from={startFrame} durationInFrames={frames} layout="none" name={`sfx · ${name}`}>
      <Html5Audio
        src={staticFile(`sfx/${name}.wav`)}
        playbackRate={rate}
        volume={(f) =>
          gain * sfxDuck((offset + startFrame + f) / fps) * (dur ? Math.min(1, Math.max(0, (frames - f) / fadeFrames)) : 1)
        }
      />
    </Sequence>
  );
}

/** Film grain: six pre-rendered frames at half resolution, jittered every other frame. */
export function Grain({ opacity = 1 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  const tile = step % 6;
  const x = -hash(step, 1) * 120;
  const y = -hash(step, 2) * 240;
  const src = staticFile(`textures/grain-${tile}.png`);
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: 1200,
    height: 2160,
    pointerEvents: 'none',
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      <Img src={src} style={{ ...style, mixBlendMode: 'overlay', opacity: 0.22 }} />
      <Img src={src} style={{ ...style, mixBlendMode: 'screen', opacity: 0.045 }} />
    </AbsoluteFill>
  );
}

export function Vignette({ strength = 0.62 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(120% 80% at 50% 45%, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
}

/** The portfolio's ruled-sheet grammar: hairline rails at the margins. */
export function Rails({ opacity = 1, top = 0, bottom = H }: { opacity?: number; top?: number; bottom?: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {[M, W - M].map((x) => (
        <div key={x} style={{ position: 'absolute', left: x, top, height: bottom - top, width: 1, background: C.line }} />
      ))}
    </AbsoluteFill>
  );
}

/** Blueprint dot grid. */
export function DotGrid({ opacity = 1, gap = 36, color = 'rgba(244,241,234,0.10)' }: { opacity?: number; gap?: number; color?: string }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
        backgroundImage: `radial-gradient(${color} 1.4px, transparent 1.6px)`,
        backgroundSize: `${gap}px ${gap}px`,
        backgroundPosition: `${M % gap}px ${M % gap}px`,
      }}
    />
  );
}

/** Full-frame flash: `at` seconds, `dur` fade, colour. */
export function Flash({ t, at, dur = 0.35, color = '#fff', peak = 1 }: { t: number; at: number; dur?: number; color?: string; peak?: number }) {
  if (t < at || t > at + dur) return null;
  const o = peak * (1 - tween(t, [at, at + dur], [0, 1], ease.outQuart));
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: 'none' }} />;
}

/** Corner registration marks, like a viewfinder. */
export function CornerMarks({ opacity = 1, inset = 40, size = 34, color = C.lineStrong }: { opacity?: number; inset?: number; size?: number; color?: string }) {
  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
  ];
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {corners.map(([x, y, dx, dy]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y + dy * size} L${x} ${y} L${x + dx * size} ${y}`} stroke={color} strokeWidth={2} fill="none" />
      ))}
    </svg>
  );
}

/** Small pill label. */
export function Chip({
  children,
  color = C.text,
  bg = 'rgba(244,241,234,0.04)',
  border = C.lineStrong,
  size = 24,
  style,
  dot,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
  size?: number;
  style?: React.CSSProperties;
  dot?: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        height: size * 2,
        padding: `0 ${size * 0.8}px`,
        borderRadius: size,
        border: `1.5px solid ${border}`,
        background: bg,
        color,
        fontSize: size,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && <span style={{ width: size * 0.36, height: size * 0.36, borderRadius: '50%', background: dot, boxShadow: `0 0 ${size * 0.6}px ${withAlpha(dot, 0.8)}` }} />}
      {children}
    </div>
  );
}
