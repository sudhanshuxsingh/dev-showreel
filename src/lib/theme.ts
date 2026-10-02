/**
 * Design tokens. One accent (haki red) on warm ink; the portfolio's signal
 * green appears only for live / available states, exactly as on the site.
 */
export const C = {
  ink: '#060607',
  ink2: '#0B0B0E',
  panel: '#0F0F13',
  panel2: '#15151A',
  line: 'rgba(244, 241, 234, 0.08)',
  lineStrong: 'rgba(244, 241, 234, 0.16)',
  text: '#F4F1EA',
  dim: '#A1A1AA',
  mute: '#6B6B74',
  red: '#FF2A1F',
  redHot: '#FF5A3D',
  redDeep: '#A50F08',
  green: '#4ADE80',
  paper: '#EFE9DC',
  // GitHub-dark code palette (the portfolio uses GitHub's code colours).
  code: {
    text: '#E6EDF3',
    keyword: '#FF7B72',
    string: '#A5D6FF',
    fn: '#D2A8FF',
    type: '#79C0FF',
    tag: '#7EE787',
    comment: '#7D8590',
    punct: '#8B949E',
    attr: '#79C0FF',
  },
} as const;

export const W = 1080;
export const H = 1920;
/** Horizontal margin: content and hairline rails sit this far in. */
export const M = 72;

export const glow = (color: string, r = 24, a = 0.55) =>
  `0 0 ${r}px ${withAlpha(color, a)}, 0 0 ${r * 2.5}px ${withAlpha(color, a * 0.45)}`;

export function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
