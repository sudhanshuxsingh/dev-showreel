import React, { useId, useMemo } from 'react';
import { C, withAlpha } from '../lib/theme';

/**
 * Sudhanshu's isometric SS monogram — ported from the portfolio's
 * SpotlightLogo (same 5 × 7 letter grid, `stand` orientation) — with the
 * signature spotlight sweeping its strokes.
 */
type Point = [number, number];
const S: Point[] = [
  [1, 0], [4, 0], [4, 1], [2, 1], [2, 3], [4, 3], [5, 4], [5, 6],
  [4, 7], [0, 7], [0, 6], [3, 6], [3, 4], [1, 4], [0, 3], [0, 1],
]; // prettier-ignore
const SS: Point[][] = [S, S.map(([x, y]) => [x + 6, y] as Point)];
const UNIT = 40;
const COS30 = Math.cos(Math.PI / 6);

const project = (x: number, y: number, z: number): Point => [(x + z) * COS30 * UNIT, ((x - z) * 0.5 + y) * UNIT];
const toPath = (pts: Point[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;

function build(depth = 1.4) {
  const sides: { d: string; key: number }[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of SS) {
    let area = 0;
    poly.forEach(([x1, y1], i) => {
      const [x2, y2] = poly[(i + 1) % poly.length];
      area += x1 * y2 - x2 * y1;
    });
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const ex = q[0] - p[0];
      const ey = q[1] - p[1];
      const nx = area > 0 ? -ey : ey;
      const ny = area > 0 ? ex : -ex;
      for (const [x, y] of [p, q])
        for (const z of [0, depth]) {
          const [sx, sy] = project(x, y, z);
          minX = Math.min(minX, sx);
          maxX = Math.max(maxX, sx);
          minY = Math.min(minY, sy);
          maxY = Math.max(maxY, sy);
        }
      if (!(nx - ny > 1e-9)) return;
      sides.push({
        d: toPath([project(p[0], p[1], 0), project(q[0], q[1], 0), project(q[0], q[1], depth), project(p[0], p[1], depth)]),
        key: (p[0] + q[0]) / 2 - (p[1] + q[1]) / 2 - depth / 2,
      });
    });
  }
  sides.sort((a, b) => a.key - b.key);
  const fronts = SS.map((poly) => toPath(poly.map(([x, y]) => project(x, y, 0))));
  return { sides: sides.map((s) => s.d), fronts, box: [minX, minY, maxX - minX, maxY - minY] as const };
}

export function SSMark({
  width,
  light,
  lit = 1,
  draw = 1,
  style,
  accent = C.red,
}: {
  width: number;
  /** Light centre as a fraction of the mark's box (0–1). */
  light: [number, number];
  lit?: number;
  /** 0–1: strokes draw on. */
  draw?: number;
  style?: React.CSSProperties;
  /** Colour of the glow on the front faces. */
  accent?: string;
}) {
  const id = useId().replace(/:/g, '');
  const { sides, fronts, box } = useMemo(() => build(), []);
  const [bx, by, bw, bh] = box;
  const pad = 8;
  const lx = bx + bw * light[0];
  const ly = by + bh * light[1];
  const all = [...sides.map((d) => ({ d, front: false })), ...fronts.map((d) => ({ d, front: true }))];
  const dash = 2400;
  return (
    <svg
      viewBox={`${bx - pad} ${by - pad} ${bw + pad * 2} ${bh + pad * 2}`}
      width={width}
      height={(width * (bh + pad * 2)) / (bw + pad * 2)}
      style={{ overflow: 'visible', ...style }}
    >
      <defs>
        <pattern id={`${id}h`} width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={10} stroke={withAlpha(C.text, 0.22)} strokeWidth={1.4} />
        </pattern>
        <radialGradient id={`${id}l`} cx={lx} cy={ly} r={240} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.text} stopOpacity={1} />
          <stop offset="0.45" stopColor={C.text} stopOpacity={0.55} />
          <stop offset="1" stopColor={C.text} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}r`} cx={lx} cy={ly} r={180} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={accent} stopOpacity={0.9} />
          <stop offset="1" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      {all.map(({ d, front }, i) => (
        <path
          key={`b${i}`}
          d={d}
          fill={front ? `url(#${id}h)` : C.ink}
          stroke={withAlpha(C.text, 0.32)}
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={dash}
          strokeDashoffset={dash * (1 - draw)}
          fillOpacity={draw}
        />
      ))}
      <g opacity={lit}>
        {all.map(({ d }, i) => (
          <path key={`l${i}`} d={d} fill="none" stroke={`url(#${id}l)`} strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
        ))}
        {fronts.map((d, i) => (
          <path key={`r${i}`} d={d} fill={`url(#${id}r)`} opacity={0.28} />
        ))}
      </g>
    </svg>
  );
}
