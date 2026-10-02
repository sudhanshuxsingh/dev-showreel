import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { DotGrid, Rails, Sfx } from '../components/core';
import { ChapterHeader, Cursor, Window } from '../components/Stage';
import { ease, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

const WX = M;
const WY = 500;
const WW = 936;
const WH = 760;
const BAR = 56;

type Sticky = { x: number; y: number; rot: number; text: string; at: number; red?: boolean };
const STICKIES: Sticky[] = [
  { x: 32, y: 26, rot: -3, text: 'Who is this for?', at: 1.0 },
  { x: 328, y: 18, rot: 2, text: "What's the real job to be done?", at: 1.2 },
  { x: 628, y: 32, rot: -1.5, text: 'Where does AI actually help?', at: 1.4, red: true },
  { x: 110, y: 222, rot: 2.5, text: 'What should feel like magic?', at: 1.6 },
];
const STICKY_H = 172;
const FLOW = ['Intent', 'Context', 'Answer', 'Action'];
const NODE_W = 182;
const NODE_H = 74;
const FLOW_Y = 462;
const nodeX = (i: number) => 38 + i * 222;

/** Discovery board: stickies, a user flow, and where AI earns its place. */
export const Think: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end } = useScene(scene);
  const winIn = tween(t, [0.15, 0.9]);
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);

  // The red sticky is grabbed and dropped above the "Answer" node.
  const grab = 4.15;
  const drop = 5.0;
  const red = STICKIES[2];
  const target = { x: nodeX(2) - 30, y: 226 };
  const dragK = tween(t, [grab + 0.1, drop], [0, 1], ease.inOutCubic);
  const answerLit = tween(t, [drop + 0.1, drop + 0.4]);

  // Cursor path in absolute coordinates.
  const abs = (x: number, y: number) => ({ x: WX + x, y: WY + BAR + y });
  const redCenter = abs(red.x + 150, red.y + 90);
  const dropCenter = abs(target.x + 150, target.y + 90);
  const path = [
    { t: 0, ...abs(980, 760) },
    { t: 2.9, ...abs(760, 640) },
    { t: 3.3, ...abs(170, 120) },
    { t: 3.9, ...abs(170, 140) },
    { t: grab, ...redCenter },
    { t: drop, ...dropCenter },
    { t: drop + 0.6, ...abs(nodeX(2) + 120, FLOW_Y + 40) },
    { t: end, ...abs(820, 330) },
  ];
  const aiPath = [
    { t: 5.2, ...abs(-80, 700) },
    { t: 5.75, ...abs(310, FLOW_Y + NODE_H + 40) },
    { t: end, ...abs(280, FLOW_Y + NODE_H + 76) },
  ];

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <ChapterHeader t={t} fps={fps} index={1} label="THINK" kanji="思考" line="Problem first. Prompt second." exit={end - 0.4} />

      <div style={{ opacity: winIn * (1 - out), transform: `translateY(${(1 - winIn) * 60 + out * -30}px)` }}>
        <Window x={WX} y={WY} w={WW} h={WH} title="discovery-board" accent={C.red}>
          <DotGrid gap={30} />
          {/* User flow */}
          {FLOW.map((label, i) => {
            const p = pop(t, fps, 2.0 + i * 0.28, { damping: 16 });
            const isAnswer = i === 2;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: nodeX(i - 1) + NODE_W,
                      top: FLOW_Y + NODE_H / 2 - 1,
                      width: (222 - NODE_W) * tween(t, [1.9 + i * 0.28, 2.2 + i * 0.28]),
                      height: 2,
                      background: C.dim,
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    left: nodeX(i),
                    top: FLOW_Y,
                    width: NODE_W,
                    height: NODE_H,
                    borderRadius: 18,
                    border: `2px solid ${isAnswer && answerLit > 0 ? C.red : C.lineStrong}`,
                    background: isAnswer ? `rgba(255,42,31,${0.12 * answerLit})` : C.panel2,
                    boxShadow: isAnswer && answerLit > 0 ? glow(C.red, 18, 0.4 * answerLit) : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: F.sans,
                    fontWeight: 600,
                    fontSize: 30,
                    color: C.text,
                    transform: `scale(${p})`,
                  }}
                >
                  {label}
                  {isAnswer && answerLit > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -18,
                        right: -12,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: C.red,
                        fontSize: 20,
                        fontFamily: F.mono,
                        transform: `scale(${answerLit})`,
                      }}
                    >
                      ✦ AI
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div style={{ position: 'absolute', left: 38, top: FLOW_Y - 46, fontFamily: F.mono, fontSize: 20, letterSpacing: '0.16em', color: C.mute, opacity: tween(t, [1.9, 2.4]) }}>
            USER FLOW
          </div>

          {/* Stickies */}
          {STICKIES.map((s, i) => {
            const p = pop(t, fps, s.at, { damping: 11, stiffness: 180 });
            const isRed = !!s.red;
            const x = isRed ? s.x + (target.x - s.x) * dragK : s.x;
            const y = isRed ? s.y + (target.y - s.y) * dragK : s.y;
            const lifted = isRed && t > grab && t < drop + 0.15;
            const ring = i === 0 && t > 3.3 && t < 4.1;
            return (
              <div
                key={s.text}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: 270,
                  height: STICKY_H,
                  padding: '20px 24px',
                  boxSizing: 'border-box',
                  background: isRed ? C.red : C.paper,
                  color: isRed ? '#fff' : '#1B1A17',
                  fontFamily: F.hand,
                  fontWeight: 700,
                  fontSize: 38,
                  lineHeight: 1.05,
                  transform: `rotate(${s.rot + (lifted ? 3 : 0)}deg) scale(${p * (lifted ? 1.06 : 1)})`,
                  boxShadow: lifted ? '0 30px 50px rgba(0,0,0,0.55)' : '0 10px 24px rgba(0,0,0,0.35)',
                  outline: ring ? `3px solid ${C.red}` : undefined,
                  outlineOffset: 8,
                  zIndex: isRed ? 2 : 1,
                }}
              >
                {s.text}
              </div>
            );
          })}

          {/* AI suggestion */}
          {(() => {
            const p = pop(t, fps, 5.8, { damping: 12 });
            if (p <= 0) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: 300,
                  top: FLOW_Y + NODE_H + 30,
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: withAlpha('#7C8CFF', 0.16),
                  border: '2px solid #7C8CFF',
                  color: '#C9CFFF',
                  fontFamily: F.mono,
                  fontSize: 22,
                  transform: `scale(${p})`,
                  transformOrigin: '0 0',
                  zIndex: 3,
                  whiteSpace: 'nowrap',
                }}
              >
                + edge case: empty state
              </div>
            );
          })()}

          {/* Toolbar */}
          <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', display: 'flex', gap: 10, padding: 10, borderRadius: 16, background: C.panel2, border: `1px solid ${C.lineStrong}` }}>
            {['↖', '▢', '◯', '⟶', 'T'].map((g, i) => (
              <span key={g} style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 1 ? C.red : 'transparent', color: C.text, fontFamily: F.sans, fontSize: 22 }}>
                {g}
              </span>
            ))}
          </div>
        </Window>
      </div>

      <Cursor t={t} path={path} name="Sudhanshu" clicks={[3.35, grab, drop, drop + 0.65]} opacity={tween(t, [2.6, 2.9]) * (1 - out)} />
      <Cursor t={t} path={aiPath} name="AI" color="#7C8CFF" clicks={[5.78]} opacity={tween(t, [5.2, 5.4]) * (1 - out)} />

      {STICKIES.map((s, i) => (
        <Sfx key={s.text} name={i % 2 ? 'pop-hi' : 'pop'} at={s.at} volume={0.55} />
      ))}
      {FLOW.map((f, i) => (
        <Sfx key={f} name="tick" at={2.0 + i * 0.28} volume={0.35} />
      ))}
      <Sfx name="click" at={3.35} volume={0.5} />
      <Sfx name="click" at={grab} volume={0.5} />
      <Sfx name="swish" at={grab + 0.15} volume={0.45} />
      <Sfx name="click" at={drop} volume={0.5} />
      <Sfx name="notify" at={drop + 0.12} volume={0.45} />
      <Sfx name="pop-hi" at={5.8} volume={0.5} />
      <Sfx name="whoosh-fast" at={0} volume={0.35} />
    </AbsoluteFill>
  );
};
