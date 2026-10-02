import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Portrait } from '../components/Character';
import { Sfx } from '../components/core';
import { Sun } from '../components/Stage';
import { Words } from '../components/Words';
import { ease, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, glow } from '../lib/theme';
import { useScene } from '../lib/timeline';

/** Eye centres in the shadow portrait's sprite pixels (measured). */
const EYES: [number, number][] = [
  [62, 106.7],
  [96.8, 107.9],
];
const FACE_SCALE = 460 / 149;

/**
 * Music only. A red hairline, three lines of conviction, then the sun swells
 * and a shadow with burning eyes looks back.
 */
export const ColdOpen: React.FC<SceneProps> = ({ scene }) => {
  const { t, end } = useScene(scene);
  const cy = 960;

  // Hairline: draws out from the centre, then collapses into the sun's seed.
  const lineIn = tween(t, [0.35, 1.6], [0, 1], ease.inOutQuint);
  const lineOut = tween(t, [5.6, 6.2], [0, 1], ease.inOutCubic);
  const lineW = 820 * lineIn * (1 - lineOut);

  // Sun swell + shadow face.
  const sunK = tween(t, [7.15, 8.2], [0, 1], ease.outExpo);
  const face = tween(t, [7.55, 8.45], [0, 1], ease.outQuart);
  const ignite = tween(t, [8.2, 8.32], [0, 1], ease.linear) * (1 - tween(t, [8.32, 8.9], [0, 0.6]));
  const push = tween(t, [7.2, end], [1, 1.12], ease.inOutCubic);
  const kanji = tween(t, [8.2, 8.9]);
  const preFlash = tween(t, [end - 0.25, end], [0, 1], ease.inExpo);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {sunK > 0 && <Sun cx={540} cy={cy} r={20 + 330 * sunK} t={t} glowAmount={sunK} stripes={sunK} />}
        {face > 0 && (
          <div style={{ position: 'absolute', left: 540 - 230, top: cy - 300, width: 460, opacity: face, transform: `translateY(${(1 - face) * 40}px)` }}>
            <Portrait face="shadow" size={460} style={{ filter: `drop-shadow(0 0 ${30 + ignite * 50}px rgba(255,42,31,${0.4 + ignite * 0.5}))` }} />
            {/* Eyes ignite: two hot cores and an anamorphic streak through them. */}
            {ignite > 0 &&
              EYES.map(([ex, ey]) => (
                <div
                  key={ex}
                  style={{
                    position: 'absolute',
                    left: ex * FACE_SCALE - 70,
                    top: ey * FACE_SCALE - 70,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: `radial-gradient(closest-side, rgba(255,250,245,${ignite}), rgba(255,60,40,${ignite * 0.7}) 35%, transparent 100%)`,
                    mixBlendMode: 'screen',
                  }}
                />
              ))}
            {ignite > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 230 - 560 + 14,
                  top: EYES[0][1] * FACE_SCALE - 3,
                  width: 1120,
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, transparent, rgba(255,90,61,${ignite * 0.7}) 30%, rgba(255,255,255,${ignite}) 50%, rgba(255,90,61,${ignite * 0.7}) 70%, transparent)`,
                  boxShadow: `0 0 24px rgba(255,42,31,${ignite * 0.8})`,
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </div>
        )}
      </AbsoluteFill>

      {lineW > 1 && (
        <div
          style={{
            position: 'absolute',
            left: 540 - lineW / 2,
            top: cy - 1,
            width: lineW,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${C.red} 18%, ${C.redHot} 50%, ${C.red} 82%, transparent)`,
            boxShadow: glow(C.red, 14, 0.6),
          }}
        />
      )}

      <div style={{ position: 'absolute', left: 60, right: 60, bottom: 1920 - cy + 44 }}>
        <Words text="Most software *works.*" t={t} at={1.3} size={84} weight={500} color={C.text} out={5.55} />
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: cy + 44 }}>
        <Words text="Very little of it ~feels~ like anything." t={t} at={3.35} size={64} weight={400} color={C.dim} out={5.6} />
      </div>
      <div style={{ position: 'absolute', left: 40, right: 40, top: cy - 66 }}>
        <Words text="I build the *second kind.*" t={t} at={5.95} size={104} weight={600} out={7.05} outDur={0.35} />
      </div>

      {/* 天照大神 down the right rail */}
      <div
        style={{
          position: 'absolute',
          right: 74,
          top: 520,
          writingMode: 'vertical-rl',
          fontFamily: F.jp,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: '0.3em',
          color: C.red,
          opacity: kanji,
          textShadow: glow(C.red, 18, 0.5),
          clipPath: `inset(0 0 ${(1 - kanji) * 100}% 0)`,
        }}
      >
        天照大神
      </div>
      <div style={{ position: 'absolute', left: 80, top: 540, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: F.mono, fontSize: 20, letterSpacing: '0.4em', color: C.mute, opacity: kanji }}>
        AMATERASU — 2026
      </div>

      <AbsoluteFill style={{ background: '#fff', opacity: preFlash * 0.9 }} />

      <Sfx name="reverse-swell" at={5.65} volume={0.5} />
      <Sfx name="riser-short" at={end - 1.5} volume={0.55} />
      <Sfx name="zap" at={8.2} volume={0.6} />
      <Sfx name="impact-soft" at={7.15} volume={0.5} />
    </AbsoluteFill>
  );
};
