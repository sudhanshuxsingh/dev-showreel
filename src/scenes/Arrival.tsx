import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Character, walkFrame } from '../components/Character';
import { Rails, Sfx } from '../components/core';
import { PixelFrame } from '../components/DialogBox';
import { Sun } from '../components/Stage';
import { ease, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow } from '../lib/theme';
import { useScene } from '../lib/timeline';

const HORIZON = 1150;
const WALK_FPS = 9;

/** RPG character sheet — the recruiter's five facts, as a stat card. */
function StatCard({ t, at }: { t: number; at: number }) {
  const rows: [string, React.ReactNode][] = [
    ['CLASS', 'Full-stack Gen-AI Developer'],
    ['RANK', 'Tech Lead @ TCS'],
    ['BASE', 'Kolkata, India'],
    [
      'STATUS',
      <span key="s" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: C.green }}>
        <span style={{ width: 13, height: 13, borderRadius: 7, background: C.green, boxShadow: `0 0 14px ${C.green}` }} />
        Open to new roles
      </span>,
    ],
  ];
  const open = Math.floor(tween(t, [at, at + 0.22], [0, 1], ease.linear) * 5) / 5;
  if (open <= 0) return null;
  const w = 936;
  const h = 330;
  return (
    <div style={{ position: 'absolute', left: M, top: 230, width: w, height: h, transform: `scaleY(${open})`, transformOrigin: '50% 0' }}>
      <PixelFrame w={w} h={h} fill="rgba(9,9,11,0.82)" />
      <div style={{ position: 'absolute', left: 40, right: 40, top: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: F.pixel, fontSize: 30, letterSpacing: '0.14em', color: C.red, opacity: tween(t, [at + 0.2, at + 0.4]) }}>
          <span>PLAYER 1</span>
          <span style={{ fontSize: 24, color: C.mute, letterSpacing: '0.2em' }}>EXP 4Y+</span>
        </div>
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '170px 1fr', rowGap: 16 }}>
          {rows.map(([k, v], i) => {
            const p = tween(t, [at + 0.35 + i * 0.16, at + 0.75 + i * 0.16]);
            return (
              <React.Fragment key={k}>
                <div style={{ fontFamily: F.pixel, fontSize: 28, letterSpacing: '0.12em', color: C.mute, opacity: p }}>{k}</div>
                <div style={{ fontFamily: F.mono, fontSize: 32, color: C.text, opacity: p, transform: `translateX(${(1 - p) * 20}px)` }}>{v}</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The avatar walks into frame in front of a rising sun and introduces himself. */
export const Arrival: React.FC<SceneProps> = ({ scene }) => {
  const { t, end } = useScene(scene);
  const walkStart = 0.25;
  const walkEnd = 2.35;
  const x = tween(t, [walkStart, walkEnd], [-200, 540], (k) => 1 - (1 - k) ** 1.6);
  const walking = t < walkEnd;
  const frame = walking ? walkFrame(t, WALK_FPS) : 'idle-a';
  const breathe = walking ? 0 : Math.sin((t - walkEnd) * 2.6) * 1.5;

  const sunRise = tween(t, [0, 2.6], [0, 1], ease.outQuart);
  const out = tween(t, [end - 0.4, end + 0.3], [0, 1], ease.inOutCubic);
  const push = 1 + t * 0.006;

  // One footstep per contact frame (walk-1 and walk-3).
  const steps: number[] = [];
  for (let s = walkStart; s < walkEnd; s += 2 / WALK_FPS) steps.push(s);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push}) translateY(${-out * 120}px)`, opacity: 1 - out * 0.9, filter: out > 0 ? `blur(${out * 10}px)` : undefined }}>
        {/* Sky: sun rising behind the horizon */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: HORIZON, overflow: 'hidden' }}>
          <Sun cx={540} cy={HORIZON + 40 - sunRise * 130} r={330} t={t} glowAmount={0.9} />
        </div>
        {/* Ground: dark water with a smeared reflection */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: HORIZON, bottom: 0, background: 'linear-gradient(#0b0606, #060607 40%)' }}>
          <div
            style={{
              position: 'absolute',
              left: 540 - 260,
              top: 0,
              width: 520,
              height: 420,
              background: `linear-gradient(${C.red}, transparent)`,
              opacity: 0.16 * sunRise,
              filter: 'blur(26px)',
              WebkitMaskImage: 'repeating-linear-gradient(#000 0 10px, transparent 10px 22px)',
              maskImage: 'repeating-linear-gradient(#000 0 10px, transparent 10px 22px)',
            }}
          />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: HORIZON, height: 2, background: `linear-gradient(90deg, transparent, ${C.redHot}, transparent)`, boxShadow: glow(C.red, 18, 0.6) }} />
        <Rails opacity={0.6} />

        <Character frame={frame} x={x} y={HORIZON + 6} scale={1.12} reflection={0.22} style={{ transform: `translateY(${breathe}px)` }} />
        <StatCard t={t} at={2.55} />
      </AbsoluteFill>

      {steps.map((s, i) => (
        <Sfx key={s} name="step" at={s} volume={0.32 + (i % 2) * 0.05} rate={i % 2 ? 1.06 : 1} />
      ))}
      <Sfx name="pop-hi" at={2.55} volume={0.45} />
      <Sfx name="dialog-open" at={2.2} volume={0.4} />
      <Sfx name="whoosh" at={end - 0.55} volume={0.5} />
    </AbsoluteFill>
  );
};
