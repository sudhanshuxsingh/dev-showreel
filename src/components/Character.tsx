import React from 'react';
import { Img, staticFile } from 'remotion';
import sprites from '../data/sprites.json';
import lipsync from '../data/lipsync.json';
import { hash } from '../lib/anim';

const B = sprites.body;

export type BodyFrame = 'idle-a' | 'idle-b' | 'walk-1' | 'walk-2' | 'walk-3' | 'walk-4' | 'haki-a' | 'haki-b';

/** Walk cycle frame at `fps` sprite frames per second. */
export const walkFrame = (t: number, fps = 8): BodyFrame => `walk-${((Math.floor(t * fps) % 4) + 4) % 4 + 1}` as BodyFrame;

/**
 * Full-body pixel sprite. (x, y) is where the feet touch the ground, so
 * every frame of every pose stands on the same spot.
 */
export function Character({
  frame,
  x,
  y,
  scale = 1,
  flip = false,
  shadow = 1,
  reflection = 0,
  style,
  filter,
}: {
  frame: BodyFrame;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  shadow?: number;
  reflection?: number;
  style?: React.CSSProperties;
  filter?: string;
}) {
  const w = B.width * scale;
  const h = B.height * scale;
  const src = staticFile(`sprites/body-${frame}.png`);
  const img: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: w,
    height: h,
    imageRendering: 'pixelated',
  };
  return (
    <div style={{ position: 'absolute', left: x - B.anchorX * scale, top: y - B.anchorY * scale, width: w, height: h, ...style }}>
      {shadow > 0 && (
        <div
          style={{
            position: 'absolute',
            left: (B.anchorX - 130) * scale,
            top: (B.anchorY - 16) * scale,
            width: 260 * scale,
            height: 34 * scale,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(0,0,0,0.85), rgba(0,0,0,0))',
            opacity: shadow,
          }}
        />
      )}
      {reflection > 0 && (
        <Img
          src={src}
          style={{
            ...img,
            top: (2 * B.anchorY - B.height) * scale,
            transform: `scaleY(-1) ${flip ? 'scaleX(-1)' : ''}`,
            opacity: reflection,
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 45%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 45%)',
          }}
        />
      )}
      <Img src={src} style={{ ...img, top: 0, transform: flip ? 'scaleX(-1)' : undefined, filter }} />
    </div>
  );
}

// --- Portraits -------------------------------------------------------------------------

export type Face =
  | 'neutral' | 'serious' | 'happy' | 'smile' | 'angry' | 'focused' | 'suspicious' | 'surprised'
  | 'talk-1' | 'talk-2' | 'talk-3' | 'talk-4'
  | 'left-neutral' | 'left-serious' | 'left-smile' | 'left-angry'
  | 'right-neutral' | 'right-serious' | 'right-smile' | 'right-angry'
  | 'look-up' | 'look-down' | 'blink' | 'wink'
  | 'haki-idle' | 'haki-intense' | 'haki-eye-glow' | 'haki-rage' | 'haki-side-1' | 'haki-side-2'
  | 'haki-down' | 'haki-up' | 'eyes-closed' | 'shadow' | 'profile-left' | 'profile-right'; // prettier-ignore
const faceFile = Object.fromEntries(sprites.faces.frames.map((f) => [f.name, f.file])) as Record<Face, string>;
const lines = lipsync.lines as Record<string, string>;
const FRONT = new Set<Face>(['neutral', 'serious', 'happy', 'smile', 'focused', 'suspicious', 'angry', 'surprised']);

/**
 * Picks the portrait frame: mouth shapes follow the voiceover's loudness
 * envelope (talk-1…4), and the eyes blink every few seconds when quiet.
 */
export function faceAt({ base, voId, v, t, seed = 1 }: { base: Face; voId?: string; v?: number; t: number; seed?: number }): Face {
  if (voId && v !== undefined && v >= 0) {
    const env = lines[voId];
    const i = Math.floor(v * 100);
    if (env && i < env.length) {
      const level = Math.max(Number(env[i] ?? 0), Number(env[i + 1] ?? 0), Number(env[i + 2] ?? 0));
      if (level >= 8) return 'talk-4';
      if (level >= 6) return 'talk-3';
      if (level >= 4) return 'talk-2';
      if (level >= 2) return 'talk-1';
    }
  }
  if (FRONT.has(base)) {
    const period = 3.1 + hash(seed) * 1.4;
    const phase = (t + hash(seed, 7) * period) % period;
    if (phase < 0.11) return 'blink';
  }
  return base;
}

export function Portrait({ face, size, style }: { face: Face; size: number; style?: React.CSSProperties }) {
  const ratio = sprites.faces.height / sprites.faces.width;
  return (
    <Img
      src={staticFile(faceFile[face])}
      style={{ width: size, height: size * ratio, imageRendering: 'pixelated', display: 'block', ...style }}
    />
  );
}

export function HakiFace({ frame, size, style }: { frame: number; size: number; style?: React.CSSProperties }) {
  const ratio = sprites.hakiFace.height / sprites.hakiFace.width;
  return (
    <Img
      src={staticFile(`sprites/haki-face-${Math.max(0, Math.min(7, frame))}.png`)}
      style={{ width: size, height: size * ratio, imageRendering: 'pixelated', display: 'block', ...style }}
    />
  );
}
