import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ease, hash, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { beatAfter, useScene } from '../lib/timeline';

const COLS = 40;
const ROWS = 25;
const CELL = 20;
const GAP = 4;
const GRID_W = COLS * (CELL + GAP) - GAP;
const GX = (1080 - GRID_W) / 2;
const GY = 560;

function Kerning({ k }: { k: number }) {
  const spacing = 0.14 - k * 0.22;
  return (
    <div style={{ position: 'relative', fontFamily: F.sans, fontWeight: 600, fontSize: 300, letterSpacing: `${spacing}em`, color: C.text, lineHeight: 1 }}>
      AV
      <div style={{ position: 'absolute', left: '50%', bottom: -40, transform: 'translateX(-50%)', fontFamily: F.mono, fontSize: 28, color: C.red, letterSpacing: 0 }}>
        kern {Math.round(-80 * k)}
      </div>
    </div>
  );
}

function Rhythm({ k }: { k: number }) {
  const widths = [520, 380, 460, 300, 420];
  return (
    <div style={{ position: 'relative', width: 560, height: 420 }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: -20, right: -20, top: i * 32, height: 1, background: withAlpha(C.red, 0.35 * k) }} />
      ))}
      {widths.map((w, i) => {
        const messy = (hash(i, 4) - 0.5) * 40;
        const y = i * 80 + messy * (1 - k);
        return <div key={i} style={{ position: 'absolute', left: (hash(i, 5) - 0.5) * 30 * (1 - k), top: y, width: w, height: 48, borderRadius: 10, background: i === 0 ? C.text : withAlpha(C.text, 0.35) }} />;
      })}
    </div>
  );
}

function Contrast({ k }: { k: number }) {
  const box = (bg: string, fg: string, ok: boolean, ratio: string) => (
    <div style={{ width: 400, height: 300, borderRadius: 26, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, border: `1.5px solid ${C.lineStrong}` }}>
      <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: fg, letterSpacing: '-0.03em' }}>Readable</span>
      <span style={{ fontFamily: F.mono, fontSize: 26, color: ok ? C.green : C.red }}>
        {ok ? '✓' : '✕'} {ratio}
      </span>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
      <div style={{ opacity: 1 - k * 0.55, transform: `scale(${1 - k * 0.06})` }}>{box('#2A2A30', '#4A4A52', false, '1.6 : 1')}</div>
      <div style={{ transform: `scale(${0.94 + k * 0.06})` }}>{box(C.ink2, C.text, true, '17.9 : 1 · AAA')}</div>
    </div>
  );
}

function Easing({ k }: { k: number }) {
  const expo = k >= 1 ? 1 : 1 - 2 ** (-10 * k);
  const row = (label: string, p: number, color: string) => (
    <div style={{ position: 'relative', width: 760, height: 130 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 64, height: 2, background: C.line }} />
      <div style={{ position: 'absolute', left: p * 680, top: 30, width: 70, height: 70, borderRadius: 35, background: color, boxShadow: color === C.red ? glow(C.red, 16, 0.5) : undefined }} />
      <div style={{ position: 'absolute', left: 0, top: -6, fontFamily: F.mono, fontSize: 24, color: C.mute }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {row('linear', k, withAlpha(C.text, 0.5))}
      {row('ease-out-expo', expo, C.red)}
    </div>
  );
}

const CARDS = [
  { word: 'Kerning.', label: 'TYPE', Demo: Kerning },
  { word: 'Rhythm.', label: 'SPACING', Demo: Rhythm },
  { word: 'Contrast.', label: 'ACCESSIBILITY', Demo: Contrast },
  { word: 'Easing.', label: 'MOTION', Demo: Easing },
];

/** Taste as a pile of decisions: four quick cuts on the beat, then a thousand. */
export const Taste: React.FC<SceneProps> = ({ scene }) => {
  const { t, end, at } = useScene(scene);
  const beat = 60 / 100;
  const first = beatAfter(scene.start) - scene.start;
  const cuts = CARDS.map((_, i) => first + i * beat);
  const gridAt = first + CARDS.length * beat;
  const thousandAt = at(/^thousand/, 2.9);
  const decisionsAt = at(/^decisions/, 3.8);
  const collapseAt = decisionsAt + 0.75;
  const card = cuts.findIndex((c, i) => t >= c && t < (cuts[i + 1] ?? gridAt));
  const fill = tween(t, [gridAt - 0.05, decisionsAt], [0, 1], ease.inOutCubic);
  const collapse = tween(t, [collapseAt, collapseAt + 0.7], [0, 1], ease.inExpo);
  const count = card >= 0 ? card + 1 : t < first ? 0 : Math.max(CARDS.length, Math.round(4 + fill * 996));
  const wave = (i: number, j: number) => Math.hypot(i - COLS / 2, (j - ROWS / 2) * 1.6) / 26;
  const redWave = tween(t, [decisionsAt - 0.05, decisionsAt + 0.5], [0, 1.6], ease.linear);
  const pulseAt = [collapseAt + 0.85, collapseAt + 1.35, collapseAt + 1.7];
  const dot = tween(t, [collapseAt + 0.55, collapseAt + 0.7]) * (1 - tween(t, [end - 0.15, end]));
  const beatPulse = pulseAt.reduce((m, p) => Math.max(m, t >= p ? Math.exp(-(t - p) * 6) : 0), 0);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails opacity={0.6} />

      {/* Counter */}
      <div style={{ position: 'absolute', left: M, right: M, top: 210, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: F.mono, color: C.mute, opacity: tween(t, [0, 0.3]) * (1 - collapse) }}>
        <span style={{ fontSize: 24, letterSpacing: '0.18em' }}>{card >= 0 ? CARDS[card].label : 'DECISIONS'}</span>
        <span style={{ fontSize: 24, letterSpacing: '0.1em' }}>
          <span style={{ color: count >= 1000 ? C.red : C.text, fontSize: 30 }}>{String(count).padStart(4, '0')}</span> / 1000
        </span>
      </div>

      {/* Cut-on-beat cards */}
      {card >= 0 &&
        (() => {
          const c = CARDS[card];
          const local = tween(t, [cuts[card], cuts[card] + beat * 0.85], [0, 1], ease.outExpo);
          const k = tween(t, [cuts[card] + 0.08, cuts[card] + beat * 0.9], [0, 1], ease.inOutCubic);
          const { Demo } = c;
          return (
            <>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: F.serif, fontStyle: 'italic', fontSize: 190, color: C.text, letterSpacing: '-0.02em', transform: `scale(${1.08 - local * 0.08})`, opacity: Math.min(1, local * 3) }}>
                {c.word}
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 600, height: 620, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, local * 2.5) }}>
                <Demo k={k} />
              </div>
            </>
          );
        })()}

      {/* A thousand small decisions */}
      {t >= gridAt - 0.05 && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 200, letterSpacing: '-0.05em', color: count >= 1000 ? C.red : C.text, textShadow: count >= 1000 ? glow(C.red, 24, 0.5) : undefined, opacity: tween(t, [gridAt, gridAt + 0.2]) * (1 - collapse), lineHeight: 1 }}>
            {count.toLocaleString('en-US')}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: F.serif, fontStyle: 'italic', fontSize: 52, color: C.dim, opacity: tween(t, [thousandAt, thousandAt + 0.3]) * (1 - collapse) }}>
            small decisions
          </div>
          {Array.from({ length: ROWS }, (_, j) =>
            Array.from({ length: COLS }, (_, i) => {
              const idx = j * COLS + i;
              const order = hash(idx, 17);
              const on = order < fill;
              const red = redWave > wave(i, j);
              const x0 = GX + i * (CELL + GAP);
              const y0 = GY + j * (CELL + GAP);
              const x = x0 + (540 - CELL / 2 - x0) * collapse;
              const y = y0 + (960 - CELL / 2 - y0) * collapse;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    background: red ? C.red : on ? withAlpha(C.text, 0.85) : withAlpha(C.text, 0.07),
                    opacity: 1 - collapse * 0.6,
                    transform: `scale(${1 - collapse * 0.7})`,
                  }}
                />
              );
            }),
          )}
        </>
      )}

      {/* The seed of the next scene: one red point, beating */}
      {dot > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 540 - 14,
            top: 960 - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: C.red,
            boxShadow: glow(C.red, 30 + beatPulse * 60, 0.8),
            transform: `scale(${dot * (1 + beatPulse * 0.8)})`,
          }}
        />
      )}

      {cuts.map((c, i) => (
        <Sfx key={c} name={i % 2 ? 'pop-hi' : 'tick'} at={c} volume={0.55} />
      ))}
      <Sfx name="compute" at={gridAt} volume={0.4} />
      <Sfx name="scan" at={thousandAt} volume={0.35} />
      <Sfx name="impact-soft" at={decisionsAt} volume={0.45} />
      <Sfx name="whoosh-deep" at={collapseAt - 0.2} volume={0.45} />
      {pulseAt.map((p) => (
        <Sfx key={p} name="kick" at={p} volume={0.6} />
      ))}
      <Sfx name="riser" at={end - 3.0} volume={0.5} />
    </AbsoluteFill>
  );
};
