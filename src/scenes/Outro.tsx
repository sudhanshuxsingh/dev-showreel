import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Character } from '../components/Character';
import { Rails, Sfx } from '../components/core';
import { SSMark } from '../components/SSMark';
import { Embers, Sun } from '../components/Stage';
import { Words } from '../components/Words';
import { ease, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

const HORIZON = 1236;

function Icon({ kind, size = 30 }: { kind: 'github' | 'linkedin' | 'mail'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: C.text, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'github')
    return (
      <svg {...common}>
        <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
      </svg>
    );
  if (kind === 'linkedin')
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 11v5M8 8v.01M12 16v-5M16 16v-3a2 2 0 0 0-4 0" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

/** Sunrise, one sentence, how to reach him — then the SS mark under its spotlight. */
export const Outro: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end } = useScene(scene);
  const vo = scene.vo!;
  const voAt = vo.start - scene.start;
  const times = vo.words.map((w) => voAt + w.s);
  const fadeIn = tween(t, [0, 0.8]);
  const rise = tween(t, [0, 3], [0, 1], ease.outQuart);
  const ctaAt = voAt + vo.duration + 0.1;
  const finalAt = end - 2.15;
  const leave = tween(t, [finalAt - 0.2, finalAt + 0.35], [0, 1], ease.inOutCubic);
  const markIn = tween(t, [finalAt, finalAt + 0.9], [0, 1], ease.inOutCubic);
  const light = tween(t, [finalAt + 0.3, end - 0.4], [-0.2, 0.32], ease.inOutCubic);
  const blackout = tween(t, [end - 0.45, end], [0, 1], ease.inOutCubic);
  const underline = tween(t, [ctaAt + 0.15, ctaAt + 0.8], [0, 1], ease.inOutQuint);

  const chips: { kind: 'github' | 'linkedin' | 'mail'; text: string }[] = [
    { kind: 'github', text: 'sudhanshuxsingh' },
    { kind: 'linkedin', text: 'sudhanshuxsingh' },
    { kind: 'mail', text: 'contact@sudhanshuxsingh.in' },
  ];

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: fadeIn * (1 - leave), filter: leave > 0 ? `blur(${leave * 12}px)` : undefined }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: HORIZON, overflow: 'hidden' }}>
          <Sun cx={540} cy={HORIZON + 60 - rise * 150} r={300} t={t} glowAmount={0.85} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: HORIZON, height: 2, background: `linear-gradient(90deg, transparent, ${C.redHot}, transparent)`, boxShadow: glow(C.red, 18, 0.6) }} />
        <Rails opacity={0.6} />
        <Embers t={t} count={18} x0={200} x1={880} y0={HORIZON} rise={500} intensity={0.5} seed={11} size={5} />
        <Character frame="idle-a" x={540} y={HORIZON + 4} scale={0.8} reflection={0.2} style={{ transform: `translateY(${Math.sin(t * 2.6) * 1.2}px)` }} />

        <div style={{ position: 'absolute', left: 50, right: 50, top: 236 }}>
          <Words text="Let's build something ~people remember.~" t={t} at={times[0]} times={times} size={82} weight={600} lineHeight={1.08} serifScale={1.2} />
        </div>

        {/* Contact */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', position: 'relative', fontFamily: F.mono, fontSize: 52, color: C.text, opacity: tween(t, [ctaAt, ctaAt + 0.4]), transform: `translateY(${(1 - tween(t, [ctaAt, ctaAt + 0.5])) * 20}px)` }}>
            sudhanshuxsingh.in <span style={{ color: C.red }}>↗</span>
            <div style={{ position: 'absolute', left: 0, bottom: -10, height: 3, width: `${underline * 100}%`, background: C.red, boxShadow: glow(C.red, 10, 0.6) }} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: M, right: M, top: 608, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          {chips.map((c, i) => {
            const p = pop(t, fps, ctaAt + 0.3 + i * 0.1, { damping: 14 });
            return (
              <div key={c.text + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, height: 62, padding: '0 22px', borderRadius: 16, border: `1.5px solid ${C.lineStrong}`, background: 'rgba(12,12,15,0.8)', fontFamily: F.mono, fontSize: 24, color: C.text, transform: `translateY(${(1 - p) * 24}px)`, opacity: Math.min(1, p * 1.4) }}>
                <Icon kind={c.kind} />
                {c.text}
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 772, display: 'flex', justifyContent: 'center' }}>
          {(() => {
            const p = pop(t, fps, ctaAt + 0.65, { damping: 12 });
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, height: 56, padding: '0 26px', borderRadius: 999, background: withAlpha(C.green, 0.1), border: `1.5px solid ${withAlpha(C.green, 0.55)}`, fontFamily: F.sans, fontWeight: 600, fontSize: 26, color: C.green, transform: `scale(${p})` }}>
                <span style={{ position: 'relative', width: 14, height: 14 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 7, background: C.green, opacity: 0.4, transform: `scale(${1 + ((t * 1.2) % 1) * 1.6})` }} />
                  <span style={{ position: 'absolute', inset: 2, borderRadius: 5, background: C.green }} />
                </span>
                Open to new roles · Kolkata, India
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>

      {/* End card */}
      {markIn > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - blackout }}>
          <div style={{ position: 'absolute', left: 540 - 420, top: 960 - 520, width: 840, height: 840, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(C.red, 0.22 * markIn)}, transparent 70%)` }} />
          <div style={{ transform: `translateY(${-60 + (1 - markIn) * 30}px)`, opacity: markIn, filter: `drop-shadow(0 0 24px ${withAlpha(C.red, 0.35)})` }}>
            <SSMark width={430} light={[light + 0.3, 0.3]} lit={markIn} draw={markIn} />
          </div>
          <div style={{ marginTop: 18, fontFamily: F.sans, fontWeight: 600, fontSize: 50, letterSpacing: '-0.03em', color: C.text, opacity: tween(t, [finalAt + 0.4, finalAt + 0.9]) }}>Sudhanshu Singh</div>
          <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.16em', color: C.dim, opacity: tween(t, [finalAt + 0.6, finalAt + 1.1]) }}>
            SUDHANSHUXSINGH.IN
          </div>
        </AbsoluteFill>
      )}

      <Sfx name="chime" at={0.4} volume={0.35} />
      <Sfx name="swish" at={ctaAt} volume={0.4} />
      {chips.map((c, i) => (
        <Sfx key={c.text + i} name="pop" at={ctaAt + 0.3 + i * 0.1} volume={0.35} rate={1 + i * 0.08} />
      ))}
      <Sfx name="notify" at={ctaAt + 0.65} volume={0.4} />
      <Sfx name="sparkle" at={4.1} volume={0.5} />
      <Sfx name="impact-soft" at={finalAt + 0.05} volume={0.55} />
      <Sfx name="shimmer" at={finalAt + 0.3} volume={0.3} />
    </AbsoluteFill>
  );
};
