import React from 'react';
import { ease, tween } from '../lib/anim';
import { C, glow } from '../lib/theme';
import { F } from '../lib/fonts';

type Kind = 'plain' | 'em' | 'red' | 'redSans';
type Token = { word: string; kind: Kind };

/**
 * Tiny markup: *serif italic*, ~red serif italic~, ^red sans^.
 * Markers may span several words.
 */
export function parseMarkup(markup: string): Token[] {
  const tokens: Token[] = [];
  let kind: Kind = 'plain';
  for (const raw of markup.split(/\s+/).filter(Boolean)) {
    let word = raw;
    let open: Kind | null = null;
    if (word.startsWith('*')) open = 'em';
    else if (word.startsWith('~')) open = 'red';
    else if (word.startsWith('^')) open = 'redSans';
    if (open) {
      kind = open;
      word = word.slice(1);
    }
    let close = false;
    if (/[*~^]([.,!?:;]*)$/.test(word)) {
      close = true;
      word = word.replace(/[*~^]([.,!?:;]*)$/, '$1');
    }
    tokens.push({ word, kind });
    if (close) kind = 'plain';
  }
  return tokens;
}

export type WordsProps = {
  text: string;
  /** Current time and the time the first word starts (same clock). */
  t: number;
  at: number;
  stagger?: number;
  dur?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  tracking?: string;
  /** Time at which the whole line leaves (blur + fade + drift up). */
  out?: number;
  outDur?: number;
  style?: React.CSSProperties;
  /** Scale of serif words relative to sans (Instrument Serif runs small). */
  serifScale?: number;
  blur?: number;
  /** Per-word start times (overrides `at` + `stagger`), e.g. from voiceover timings. */
  times?: number[];
};

/** Kinetic type: each word rises out of a blur, staggered. */
export function Words({
  text,
  t,
  at,
  stagger = 0.07,
  dur = 0.9,
  size = 64,
  color = C.text,
  weight = 500,
  align = 'center',
  lineHeight = 1.12,
  tracking = '-0.035em',
  out,
  outDur = 0.45,
  style,
  serifScale = 1.16,
  blur = 14,
  times,
}: WordsProps) {
  const tokens = parseMarkup(text);
  const leaving = out !== undefined ? tween(t, [out, out + outDur], [0, 1], ease.inOutCubic) : 0;
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontSize: size,
        fontWeight: weight,
        color,
        textAlign: align,
        lineHeight,
        letterSpacing: tracking,
        opacity: 1 - leaving,
        filter: leaving > 0 ? `blur(${leaving * 10}px)` : undefined,
        transform: `translateY(${-leaving * 30}px)`,
        ...style,
      }}
    >
      {tokens.map(({ word, kind }, i) => {
        const start = times?.[i] ?? at + i * stagger;
        const p = tween(t, [start, start + dur], [0, 1], ease.outExpo);
        const serif = kind === 'em' || kind === 'red';
        const red = kind === 'red' || kind === 'redSans';
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block',
                opacity: p,
                transform: `translateY(${(1 - p) * 0.45}em)`,
                filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
                fontFamily: serif ? F.serif : undefined,
                fontStyle: serif ? 'italic' : undefined,
                fontWeight: serif ? 400 : undefined,
                fontSize: serif ? `${serifScale}em` : undefined,
                letterSpacing: serif ? '-0.01em' : undefined,
                color: red ? C.red : undefined,
                textShadow: red ? glow(C.red, 18, 0.45 * p) : undefined,
                lineHeight: serif ? 0.9 : undefined,
              }}
            >
              {word}
            </span>
            {i < tokens.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
