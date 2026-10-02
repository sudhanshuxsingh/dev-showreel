import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ease, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow } from '../lib/theme';
import { useScene } from '../lib/timeline';

export const STEPS = [
  { label: 'THINK', kanji: '思考', line: 'Problem → people → plan' },
  { label: 'DESIGN', kanji: '設計', line: 'Systems, type, motion' },
  { label: 'BUILD', kanji: '構築', line: 'React, Next.js, typed APIs' },
  { label: 'INTELLIGENCE', kanji: '知能', line: 'RAG, agents, streaming' },
  { label: 'SHIP', kanji: '出荷', line: 'Traces, evals, polish' },
];

/** "Here's how I work." — the five chapters, scanned one by one. */
export const Workflow: React.FC<SceneProps> = ({ scene }) => {
  const { t, end } = useScene(scene);
  const top = 360;
  const rowH = 168;
  const scanStart = 1.05;
  const scanStep = 0.32;
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);
  const head = tween(t, [0.05, 0.7]);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <div style={{ position: 'absolute', left: M, right: M, top: 210, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: head * (1 - out) }}>
        <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 68, letterSpacing: '-0.04em', color: C.text }}>
          How I <span style={{ fontFamily: F.serif, fontStyle: 'italic', fontWeight: 400, fontSize: 80, color: C.red, textShadow: glow(C.red, 16, 0.4) }}>work</span>
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.18em', color: C.mute }}>5 STEPS · 1 LOOP</span>
      </div>

      {STEPS.map((step, i) => {
        const y = top + i * rowH;
        const enter = tween(t, [0.1 + i * 0.07, 0.8 + i * 0.07]);
        const lit = tween(t, [scanStart + i * scanStep, scanStart + i * scanStep + 0.12], [0, 1], ease.linear);
        const settle = tween(t, [scanStart + i * scanStep + 0.12, scanStart + i * scanStep + 0.5], [1, 0.45]);
        const glowK = lit * settle;
        const isFirst = i === 0;
        const rowOut = isFirst ? 0 : out;
        return (
          <div
            key={step.label}
            style={{
              position: 'absolute',
              left: M,
              right: M,
              top: y,
              height: rowH,
              borderTop: `1px solid ${C.lineStrong}`,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              opacity: enter * (1 - rowOut),
              transform: `translateX(${(1 - enter) * 80}px)`,
              background: `linear-gradient(90deg, rgba(255,42,31,${glowK * 0.16}), transparent 70%)`,
            }}
          >
            <span style={{ width: 70, fontFamily: F.mono, fontSize: 26, color: lit > 0.5 ? C.red : C.mute }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: step.label.length > 8 ? 62 : 74, letterSpacing: '-0.04em', color: lit > 0.5 ? C.text : C.dim, lineHeight: 1 }}>
                {step.label}
              </div>
              <div style={{ marginTop: 10, fontFamily: F.serif, fontStyle: 'italic', fontSize: 34, color: C.mute }}>{step.line}</div>
            </div>
            <span
              style={{
                fontFamily: F.jp,
                fontWeight: 900,
                fontSize: 60,
                color: C.red,
                opacity: 0.25 + lit * 0.75,
                textShadow: glowK > 0 ? glow(C.red, 18, glowK * 0.7) : undefined,
              }}
            >
              {step.kanji}
            </span>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: M, right: M, top: top + 5 * rowH, height: 1, background: C.lineStrong, opacity: head * (1 - out) }} />

      {/* Scan bar */}
      {t > scanStart - 0.1 && t < scanStart + 5 * scanStep + 0.2 && (
        <div
          style={{
            position: 'absolute',
            left: M - 20,
            right: M - 20,
            top: top + tween(t, [scanStart, scanStart + 5 * scanStep], [0, 5 * rowH], ease.linear) - 2,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${C.redHot}, transparent)`,
            boxShadow: glow(C.red, 18, 0.8),
          }}
        />
      )}

      {STEPS.map((_, i) => (
        <Sfx key={i} name="tick" at={scanStart + i * scanStep} volume={0.55} rate={1 + i * 0.06} />
      ))}
      <Sfx name="whoosh-fast" at={0.02} volume={0.4} />
      <Sfx name="swish" at={end - 0.3} volume={0.5} />
    </AbsoluteFill>
  );
};
