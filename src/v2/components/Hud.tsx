import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fg, fgSoft, mono, type Tone } from '../theme';

export type HudCue = { at: number; tone: Tone | 'hidden'; section?: string };

const W = 1080;
const H = 1920;
const M = 64;

/**
 * Tiny mono labels in the corners and crop marks — the reel's frame. The
 * colour follows the field underneath (cue list), so it never fights it.
 */
export function Hud({ cues }: { cues: HudCue[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cue = [...cues].reverse().find((c) => t >= c.at) ?? cues[0];
  if (cue.tone === 'hidden') return null;
  const tone = cue.tone;
  const color = fgSoft(tone);
  const strong = fg(tone);
  const tc = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const label: React.CSSProperties = { ...mono, position: 'absolute', fontSize: 20, color, whiteSpace: 'nowrap' };
  const mark = (x: number, y: number, dx: number, dy: number) => (
    <path d={`M${x} ${y + dy * 26} L${x} ${y} L${x + dx * 26} ${y}`} stroke={color} strokeWidth={2} fill="none" />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {mark(36, 36, 1, 1)}
        {mark(W - 36, 36, -1, 1)}
        {mark(36, H - 36, 1, -1)}
        {mark(W - 36, H - 36, -1, -1)}
      </svg>
      <div style={{ ...label, left: M, top: 58, color: strong }}>Sudhanshu Singh</div>
      <div style={{ ...label, right: M, top: 58 }}>{cue.section ?? 'Showreel ’26'}</div>
      <div style={{ ...label, left: M, bottom: 56 }}>Gen-AI · UI · Full-stack</div>
      <div style={{ ...label, right: M, bottom: 56 }}>
        {tc(t / 60)}:{tc(t % 60)}:{tc(frame % fps)}
      </div>
    </AbsoluteFill>
  );
}
