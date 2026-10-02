import React from 'react';
import { ease, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, glow, withAlpha } from '../lib/theme';
import type { SceneInfo } from '../lib/timeline';
import { faceAt, Portrait, type Face } from './Character';

/** Rectangle with two-step pixel corners, as an SVG path. */
export function pixelRect(w: number, h: number, s = 6) {
  return [
    [2 * s, 0], [w - 2 * s, 0], [w - 2 * s, s], [w - s, s], [w - s, 2 * s], [w, 2 * s],
    [w, h - 2 * s], [w - s, h - 2 * s], [w - s, h - s], [w - 2 * s, h - s], [w - 2 * s, h],
    [2 * s, h], [2 * s, h - s], [s, h - s], [s, h - 2 * s], [0, h - 2 * s], [0, 2 * s],
    [s, 2 * s], [s, s], [2 * s, s],
  ]
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
    .join('') + 'Z'; // prettier-ignore
}

export function PixelFrame({
  w,
  h,
  step = 6,
  fill = 'rgba(9,9,11,0.94)',
  stroke = C.text,
  inner = true,
  strokeWidth = 4,
}: {
  w: number;
  h: number;
  step?: number;
  fill?: string;
  stroke?: string;
  inner?: boolean;
  strokeWidth?: number;
}) {
  const inset = 12;
  return (
    <svg width={w} height={h} viewBox={`-4 -4 ${w + 8} ${h + 8}`} style={{ position: 'absolute', left: -4, top: -4, width: w + 8, height: h + 8, overflow: 'visible' }} shapeRendering="crispEdges">
      <path d={pixelRect(w, h, step)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {inner && (
        <path
          d={pixelRect(w - inset * 2, h - inset * 2, step - 2)}
          transform={`translate(${inset} ${inset})`}
          fill="none"
          stroke={withAlpha(C.text, 0.16)}
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

type Expr = Face | ((t: number) => Face);

export type DialogProps = {
  scene: SceneInfo;
  /** Scene-local time. */
  t: number;
  enter: number;
  exit?: number;
  expression?: Expr;
  highlight?: RegExp;
  top?: number;
  name?: string;
  /** Replace the voiceover text with typed text (no voice). */
  custom?: { text: string; at: number; cps?: number };
  fontSize?: number;
};

const W_BOX = 968;
const H_BOX = 292;

/**
 * RPG dialogue box: lip-synced pixel portrait, name tag, and the voiceover
 * typed out word by word in sync with the speech. Doubles as captions.
 */
export function DialogBox({
  scene,
  t,
  enter,
  exit,
  expression = 'neutral',
  highlight,
  top = 1296,
  name = 'SUDHANSHU',
  custom,
  fontSize = 40,
}: DialogProps) {
  if (t < enter - 0.01 || (exit !== undefined && t > exit + 0.3)) return null;
  const vo = scene.vo;
  const voAt = vo ? vo.start - scene.start : 0;
  const v = t - voAt;

  // Open: a stepped vertical unfold. Close: fold back down.
  const open = Math.floor(tween(t, [enter, enter + 0.22], [0, 1], ease.linear) * 5) / 5;
  const close = exit !== undefined ? Math.floor(tween(t, [exit, exit + 0.2], [0, 1], ease.linear) * 5) / 5 : 0;
  const sy = Math.max(0.02, open * (1 - close));
  const contentIn = tween(t, [enter + 0.18, enter + 0.4]) * (1 - close);

  const base = typeof expression === 'function' ? expression(t) : expression;
  const face = faceAt({ base, voId: custom ? undefined : vo?.id, v, t, seed: scene.from });

  // Build tokens: display text with timings for every word (dashes ride along).
  type Tok = { text: string; s: number; e: number };
  let tokens: Tok[] = [];
  if (custom) {
    const cps = custom.cps ?? 28;
    let cursor = custom.at;
    tokens = custom.text.split(' ').map((w) => {
      const tok = { text: w, s: cursor, e: cursor + w.length / cps };
      cursor = tok.e + 1 / cps;
      return tok;
    });
  } else if (vo) {
    let wi = 0;
    tokens = vo.text.split(/\s+/).map((raw) => {
      if (raw === '—') {
        const next = vo.words[Math.min(wi, vo.words.length - 1)];
        return { text: raw, s: voAt + next.s - 0.05, e: voAt + next.s };
      }
      const w = vo.words[Math.min(wi++, vo.words.length - 1)];
      return { text: raw, s: voAt + w.s, e: voAt + w.e };
    });
  }
  const last = tokens[tokens.length - 1];
  const complete = last ? t > last.e + 0.15 : false;

  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - W_BOX) / 2,
        top,
        width: W_BOX,
        height: H_BOX,
        transform: `scaleY(${sy})`,
        transformOrigin: '50% 100%',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.65))' }}>
        <PixelFrame w={W_BOX} h={H_BOX} />
      </div>

      {/* Portrait */}
      <div style={{ position: 'absolute', left: 26, top: 26, width: 240, height: 240, opacity: contentIn }}>
        <PixelFrame w={240} h={240} step={5} inner={false} strokeWidth={3} fill="#140707" stroke={withAlpha(C.text, 0.85)} />
        <div style={{ position: 'absolute', inset: 3, overflow: 'hidden', background: `radial-gradient(70% 60% at 50% 40%, ${withAlpha(C.red, 0.35)}, transparent 70%)` }}>
          <Portrait face={face} size={234} style={{ position: 'absolute', left: 0, bottom: -18 }} />
        </div>
      </div>

      {/* Name tag */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: -30,
          height: 46,
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          background: C.red,
          color: '#fff',
          fontFamily: F.pixel,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '0.12em',
          boxShadow: `4px 4px 0 ${C.ink}, ${glow(C.red, 16, 0.4)}`,
          opacity: contentIn,
          clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        }}
      >
        {name}
      </div>

      {/* Text */}
      <div
        style={{
          position: 'absolute',
          left: 300,
          right: 40,
          top: 34,
          fontFamily: F.pixel,
          fontSize,
          lineHeight: 1.32,
          color: C.text,
          opacity: contentIn,
          letterSpacing: '0.01em',
        }}
      >
        {tokens.map((tok, i) => {
          const revealEnd = tok.s + Math.min(0.3, Math.max(0.1, (tok.e - tok.s) * 0.85));
          const n = Math.round(tween(t, [tok.s, revealEnd], [0, tok.text.length], ease.linear));
          const hot = highlight?.test(tok.text.replace(/[.,:;!?]/g, ''));
          return (
            <React.Fragment key={i}>
              <span style={{ color: hot ? C.red : undefined, textShadow: hot ? glow(C.red, 12, 0.35) : undefined }}>
                {tok.text.slice(0, n)}
                <span style={{ opacity: 0 }}>{tok.text.slice(n)}</span>
              </span>{' '}
            </React.Fragment>
          );
        })}
      </div>

      {/* Advance arrow */}
      {complete && (
        <div
          style={{
            position: 'absolute',
            right: 34,
            bottom: 22,
            width: 0,
            height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: `16px solid ${C.red}`,
            transform: `translateY(${Math.floor(t * 3) % 2 ? 4 : 0}px)`,
            opacity: contentIn,
          }}
        />
      )}
    </div>
  );
}
