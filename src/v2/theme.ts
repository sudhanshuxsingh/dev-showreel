import type React from 'react';
import { loadVariableFont } from '@remotion/google-fonts/Archivo';
import { F } from '../lib/fonts';

/**
 * Flat colour fields, cut on the beat: ink & a cool paper, one electric blue
 * accent (deliberately not orange — that reads as someone else's brand), a deep
 * navy field, and acid lime for one punch.
 */
export const K = {
  ink: '#0E0E10',
  black: '#050506',
  paper: '#EFEFEA',
  blue: '#3460FF',
  sky: '#7B9BFF',
  navy: '#0A1238',
  lime: '#DDFF55',
  green: '#3DDC84',
  /** Only for the closing lightning — a true red, not the old orange-red. */
  red: '#F2222B',
  inkSoft: 'rgba(14,14,16,0.55)',
  paperSoft: 'rgba(239,239,234,0.55)',
} as const;

export type Tone = 'dark' | 'light';
export const fg = (tone: Tone) => (tone === 'dark' ? K.paper : K.ink);
export const fgSoft = (tone: Tone) => (tone === 'dark' ? K.paperSoft : K.inkSoft);

const archivo = loadVariableFont('normal', { subsets: ['latin'] });

/** Archivo variable: width 62 (condensed) → 125 (expanded), weight 100 → 900. */
export const display = (wdth: number, wght: number): React.CSSProperties => ({
  fontFamily: archivo.fontFamily,
  fontWeight: Math.round(wght),
  fontStretch: `${wdth}%`,
  fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`,
});

export const serif: React.CSSProperties = { fontFamily: F.serif, fontStyle: 'italic', fontWeight: 400 };
export const mono: React.CSSProperties = { fontFamily: F.mono, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' };
export const sans = F.sans;
