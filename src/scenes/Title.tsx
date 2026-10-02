import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Flash, Rails, Sfx } from '../components/core';
import { Sun } from '../components/Stage';
import { ease, shake, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow } from '../lib/theme';
import { useScene } from '../lib/timeline';

/** Letters rise out of a mask, staggered. */
export function Letters({ text, t, at, size, stagger = 0.035, weight = 800, color = C.text, tracking = '-0.04em', dur = 0.75 }: {
  text: string;
  t: number;
  at: number;
  size: number;
  stagger?: number;
  weight?: number;
  color?: string;
  tracking?: string;
  dur?: number;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', height: size * 1.02, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: 1, letterSpacing: tracking, color }}>
      {[...text].map((ch, i) => {
        const p = tween(t, [at + i * stagger, at + i * stagger + dur], [0, 1], ease.outExpo);
        return (
          <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, whiteSpace: 'pre' }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
}

/** The name, set huge over the striped sun. */
export const Title: React.FC<SceneProps> = ({ scene }) => {
  const { t, end } = useScene(scene);
  const out = tween(t, [end - 0.45, end + 0.25], [0, 1], ease.inOutCubic);
  const hit = shake(t, 14 * (1 - tween(t, [0, 0.7])), 'title');
  const sunY = 760 + out * 520;
  const role = tween(t, [0.75, 1.5]);
  const meta = tween(t, [1.1, 1.9]);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${hit.x}px, ${hit.y}px)` }}>
        <Sun cx={540} cy={sunY} r={390 + t * 12} t={t} opacity={1 - out * 0.8} />
        <Rails opacity={0.8} />

        <div style={{ position: 'absolute', left: 0, right: 0, top: 1010, filter: out > 0 ? `blur(${out * 16}px)` : undefined, opacity: 1 - out, transform: `translateY(${out * -60}px)` }}>
          <div style={{ textShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <Letters text="SUDHANSHU" t={t} at={0.02} size={150} />
            <Letters text="SINGH" t={t} at={0.16} size={150} color={C.text} />
          </div>
          <div
            style={{
              marginTop: 40,
              textAlign: 'center',
              fontFamily: F.mono,
              fontSize: 27,
              letterSpacing: '0.22em',
              color: C.text,
              opacity: role,
              transform: `translateY(${(1 - role) * 20}px)`,
            }}
          >
            TECH LEAD · FULL-STACK <span style={{ color: C.red, textShadow: glow(C.red, 12, 0.5) }}>GEN-AI</span> DEVELOPER
          </div>
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', gap: 28, fontFamily: F.serif, fontStyle: 'italic', fontSize: 40, color: C.dim, opacity: meta }}>
            <span>interfaces</span>
            <span style={{ color: C.mute }}>×</span>
            <span>intelligence</span>
            <span style={{ color: C.mute }}>×</span>
            <span>taste</span>
          </div>
        </div>

        <div style={{ position: 'absolute', left: M, right: M, top: 300, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.24em', color: C.dim, opacity: meta * (1 - out) }}>
          <span>SHOWREEL</span>
          <span style={{ color: C.red }}>’26</span>
        </div>
        <div style={{ position: 'absolute', right: 74, top: 520, writingMode: 'vertical-rl', fontFamily: F.jp, fontWeight: 900, fontSize: 64, letterSpacing: '0.3em', color: C.red, textShadow: glow(C.red, 18, 0.5), opacity: 1 - out }}>
          天照大神
        </div>
      </AbsoluteFill>

      <Flash t={t} at={0} dur={0.5} peak={0.95} />
      <Sfx name="braam" at={0} volume={0.85} />
      <Sfx name="whoosh-deep" at={end - 0.75} volume={0.6} />
    </AbsoluteFill>
  );
};
