import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Character, HakiFace } from '../components/Character';
import { Flash, Sfx } from '../components/core';
import { Embers, Lightning, Shockwave, type BoltSpec } from '../components/Stage';
import { ease, hash, pop, shake, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, glow, withAlpha } from '../lib/theme';
import { music, useScene } from '../lib/timeline';

const FEET = 1262;
const CX = 540;
const BODY_SCALE = 1.25;

/** Hand-placed constellation: Gen-AI arcs over the head, models left, UI stack right. */
const SKILLS: { name: string; group: 'ai' | 'model' | 'ui'; x: number; y: number }[] = [
  { name: 'RAG', group: 'ai', x: 170, y: 330 },
  { name: 'Embeddings', group: 'ai', x: 405, y: 318 },
  { name: 'Vector search', group: 'ai', x: 676, y: 318 },
  { name: 'Agents', group: 'ai', x: 918, y: 330 },
  { name: 'Tool calling', group: 'ai', x: 236, y: 432 },
  { name: 'Prompt engineering', group: 'ai', x: 560, y: 418 },
  { name: 'LLM evals', group: 'ai', x: 880, y: 432 },
  { name: 'OpenAI', group: 'model', x: 172, y: 560 },
  { name: 'Claude', group: 'model', x: 232, y: 662 },
  { name: 'Gemini', group: 'model', x: 176, y: 764 },
  { name: 'Azure OpenAI', group: 'model', x: 222, y: 866 },
  { name: 'LangChain', group: 'model', x: 180, y: 968 },
  { name: 'Langfuse', group: 'model', x: 236, y: 1070 },
  { name: 'TypeScript', group: 'ui', x: 896, y: 560 },
  { name: 'React', group: 'ui', x: 846, y: 652 },
  { name: 'Next.js', group: 'ui', x: 902, y: 744 },
  { name: 'Tailwind CSS', group: 'ui', x: 858, y: 836 },
  { name: 'shadcn/ui', group: 'ui', x: 900, y: 928 },
  { name: 'Radix UI', group: 'ui', x: 850, y: 1020 },
  { name: 'Motion', group: 'ui', x: 900, y: 1112 },
];

const BOLTS: BoltSpec[] = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 9) * Math.PI * 2 + 0.3;
  return { x1: CX + Math.cos(a) * 60, y1: 960 + Math.sin(a) * 120, x2: CX + Math.cos(a) * (360 + hash(i, 2) * 220), y2: 960 + Math.sin(a) * (520 + hash(i, 3) * 260) };
});
const SKY_BOLTS: BoltSpec[] = [
  { x1: 140, y1: 0, x2: 360, y2: 760 },
  { x1: 960, y1: 0, x2: 700, y2: 820 },
  { x1: 40, y1: 600, x2: 330, y2: 1250 },
  { x1: 1060, y1: 520, x2: 760, y2: 1240 },
];

/** Conqueror's Haki: charge, three slams, the eyes, the drop. */
export const Haki: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, frame, end, at } = useScene(scene);
  const slams = [at(/^Gen-AI/, 2.42), at(/^Interfaces/, 2.93), at(/^Taste/, 3.84)];
  const thatAt = at(/^That's/, 4.64);
  const hakiAt = at(/^haki/, 5.27);
  const drop = music.drop - scene.start;
  const words = ['GEN-AI', 'INTERFACES', 'TASTE'];

  const charge = tween(t, [0, slams[0]], [0, 1], ease.inOutCubic);
  const after = t >= drop;
  const decay = after ? Math.exp(-(t - drop) * 1.6) : 0;
  const slamKick = slams.reduce((m, s) => Math.max(m, t >= s ? Math.exp(-(t - s) * 9) : 0), 0);
  const shakeAmt = after ? 4 + 22 * decay : 1 + charge * 6 + slamKick * 16;
  const cam = shake(t, shakeAmt, 'haki', after ? 26 : 20);
  const powerDown = tween(t, [end - 1.0, end], [0, 1], ease.inOutCubic);

  const bodyFrame = after ? 'haki-b' : t > 0.9 ? 'haki-a' : 'idle-a';
  const faceIn = tween(t, [thatAt - 0.1, thatAt + 0.25]) * (1 - tween(t, [drop - 0.02, drop + 0.02], [0, 1], ease.linear));
  const faceFrame = Math.min(7, Math.floor(tween(t, [thatAt, drop], [0, 7.99], ease.linear)));
  const wordsDim = tween(t, [thatAt - 0.1, thatAt + 0.3], [1, 0.25]);
  const wordsBlow = tween(t, [drop, drop + 0.5], [0, 1], ease.outExpo);
  const glowPulse = 0.5 + 0.5 * Math.sin(t * (6 + charge * 10));
  const aura = (after ? 0.85 + 0.15 * glowPulse : charge * (0.35 + 0.25 * glowPulse)) * (1 - powerDown);

  return (
    <AbsoluteFill style={{ background: '#030303', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg)`, opacity: 1 - powerDown * 0.85 }}>
        {/* Aura */}
        <div style={{ position: 'absolute', left: CX - 700, top: 960 - 820, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(C.red, 0.55 * aura)}, ${withAlpha(C.redDeep, 0.25 * aura)} 45%, transparent 75%)` }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: FEET, height: 2, background: `linear-gradient(90deg, transparent, ${withAlpha(C.red, 0.6 + aura * 0.4)}, transparent)`, boxShadow: glow(C.red, 18, 0.5 * aura) }} />

        {/* Slam words, stacked behind the body */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 250, opacity: wordsDim * (1 - wordsBlow), transform: `scale(${1 + wordsBlow * 0.5})`, filter: wordsBlow > 0 ? `blur(${wordsBlow * 20}px)` : undefined }}>
          {words.map((w, i) => {
            const k = tween(t, [slams[i], slams[i] + 0.14], [0, 1], ease.outQuart);
            if (t < slams[i]) return null;
            return (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontFamily: F.sans,
                  fontWeight: 800,
                  fontSize: w.length > 6 ? 128 : 150,
                  lineHeight: 1.04,
                  letterSpacing: '-0.045em',
                  color: i === 2 ? C.red : C.text,
                  textShadow: i === 2 ? glow(C.red, 30, 0.6) : `0 0 40px ${withAlpha(C.red, 0.35)}`,
                  transform: `scale(${1.5 - k * 0.5})`,
                  filter: k < 1 ? `blur(${(1 - k) * 14}px)` : undefined,
                  opacity: k,
                }}
              >
                {w}
              </div>
            );
          })}
        </div>

        <Embers t={t} count={after ? 80 : Math.round(20 + charge * 40)} x0={120} x1={960} y0={FEET} rise={after ? 1300 : 700} intensity={(after ? 1 : 0.3 + charge * 0.7) * (1 - powerDown)} seed={7} size={after ? 8 : 6} />

        {/* Body */}
        <Character frame={bodyFrame} x={CX} y={FEET} scale={BODY_SCALE} shadow={0.8} filter={`drop-shadow(0 0 ${12 + aura * 30}px ${withAlpha(C.red, 0.5 + aura * 0.4)})`} />

        <Lightning frame={frame} bolts={BOLTS} intensity={after ? 0.4 + 0.6 * decay + 0.25 : charge * 0.45 + slamKick * 0.5} seed={3} />
        {after && <Lightning frame={frame + 1} bolts={SKY_BOLTS} intensity={decay * 1.2} seed={4} />}

        {/* The eyes: the portfolio's power-up strip, full screen */}
        {faceIn > 0 && (
          <div
            style={{
              position: 'absolute',
              left: CX - 330,
              top: 380,
              width: 660,
              opacity: faceIn,
              transform: `scale(${0.92 + faceIn * 0.08 + (t - thatAt) * 0.04})`,
              WebkitMaskImage: 'radial-gradient(closest-side, #000 62%, transparent 100%)',
              maskImage: 'radial-gradient(closest-side, #000 62%, transparent 100%)',
            }}
          >
            <HakiFace frame={faceFrame} size={660} />
          </div>
        )}

        {/* Skill constellation */}
        {after &&
          SKILLS.map((s, i) => {
            const p = pop(t, fps, drop + 0.06 + Math.hypot(s.x - CX, s.y - 960) / 2600, { damping: 13, stiffness: 120 });
            // Fly out from the chest to a hand-placed slot, then drift.
            const drift = Math.sin(t * 0.8 + i) * 6;
            const x = CX + (s.x - CX) * p;
            const y = 960 + (s.y - 960) * p + drift;
            const color = s.group === 'ai' ? C.red : s.group === 'model' ? C.text : C.dim;
            return (
              <div
                key={s.name}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) scale(${0.6 + p * 0.4})`,
                  padding: '10px 20px',
                  borderRadius: 999,
                  border: `1.5px solid ${s.group === 'ai' ? withAlpha(C.red, 0.8) : C.lineStrong}`,
                  background: s.group === 'ai' ? withAlpha(C.red, 0.14) : 'rgba(12,12,15,0.85)',
                  color,
                  fontFamily: s.group === 'ui' ? F.mono : F.sans,
                  fontWeight: s.group === 'ui' ? 400 : 600,
                  fontSize: 26,
                  whiteSpace: 'nowrap',
                  boxShadow: s.group === 'ai' ? glow(C.red, 12, 0.35) : undefined,
                  opacity: Math.min(1, p * 1.5) * (1 - powerDown),
                }}
              >
                {s.name}
              </div>
            );
          })}

        <Shockwave t={t} at={drop} cx={CX} cy={980} size={1500} dur={1.0} />
        <Shockwave t={t} at={drop + 0.16} cx={CX} cy={980} size={1900} dur={1.2} width={3} color={C.redHot} />
        {slams.map((s) => (
          <Shockwave key={s} t={t} at={s} cx={CX} cy={980} size={900} dur={0.5} width={3} />
        ))}
      </AbsoluteFill>

      {slams.map((s) => (
        <Flash key={s} t={t} at={s} dur={0.18} color={C.red} peak={0.35} />
      ))}
      <Flash t={t} at={drop} dur={0.55} peak={1} />
      <Flash t={t} at={hakiAt} dur={0.2} color={C.red} peak={0.25} />
      <AbsoluteFill style={{ background: '#000', opacity: powerDown * 0.6, pointerEvents: 'none' }} />

      {/* Sound */}
      <Sfx name="sub-drop" at={0} volume={0.8} />
      <Sfx name="rumble" at={0} volume={0.7} />
      <Sfx name="powerup" at={slams[0] - 2.35} volume={0.55} />
      <Sfx name="zap" at={0.9} volume={0.6} />
      <Sfx name="zap" at={1.7} volume={0.45} rate={1.2} />
      {slams.map((s, i) => (
        <React.Fragment key={s}>
          <Sfx name="slam" at={s} volume={0.75 + i * 0.05} />
          <Sfx name="glitch-2" at={s} volume={0.25} />
        </React.Fragment>
      ))}
      <Sfx name="reverse-swell" at={drop - 1.6} volume={0.6} />
      <Sfx name="glitch-1" at={hakiAt} volume={0.35} />
      <Sfx name="thunder" at={drop} volume={0.9} />
      <Sfx name="impact" at={drop} volume={0.85} />
      <Sfx name="shimmer" at={drop + 0.25} volume={0.4} />
      <Sfx name="zap" at={drop + 0.9} volume={0.4} />
      <Sfx name="whoosh-deep" at={end - 1.0} volume={0.5} />
    </AbsoluteFill>
  );
};
