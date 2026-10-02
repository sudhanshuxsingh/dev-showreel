import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Character, walkFrame } from '../../components/Character';
import { SSMark } from '../../components/SSMark';
import { ease, hash, tween } from '../../lib/anim';
import { useHits } from '../grid';
import { fit } from '../metrics';
import { display, K, mono, serif } from '../theme';
import { Boil, held } from '../components/stop';
import { Rise } from '../components/type';
import { FitWord, useT } from './ActOne';

const COL = 952;
const X = 64;
const slot = (word: string, wdth: number) => Math.ceil(fit(word, wdth, COL) * 0.8) + 4;

export const SignOff: React.FC = () => {
  const { t } = useT();
  const { b, h } = useHits();
  const lines: { word: string; at: number }[] = [
    { word: 'LET’S BUILD', at: h(1) },
    { word: 'SOMETHING', at: b(1) },
    { word: 'PEOPLE', at: b(2) },
  ];
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <div style={{ position: 'absolute', left: X, top: 560, width: COL }}>
        {lines.map((l, i) => (
          <Boil key={l.word} seed={801 + i}>
            <Rise t={t} at={l.at} height={slot(l.word, 62)} dur={0.3}>
              <FitWord word={l.word} wdth={62} color={K.paper} />
            </Rise>
          </Boil>
        ))}
        <Boil seed={804} style={{ textAlign: 'right' }}>
          <Rise t={t} at={b(4)} height={300} dur={0.3}>
            <div style={{ ...serif, fontSize: 250, lineHeight: 1, color: K.blue, letterSpacing: '-0.03em', paddingRight: 6 }}>remember.</div>
          </Rise>
        </Boil>
      </div>
    </AbsoluteFill>
  );
};

const ROWS: [string, React.ReactNode][] = [
  ['Role', 'Tech Lead · Full-stack Gen-AI Developer'],
  ['Stack', 'TypeScript · React · Next.js · LLMs · RAG'],
  ['Base', 'Kolkata, India'],
  ['Web', 'sudhanshuxsingh.in'],
  ['Mail', 'contact@sudhanshuxsingh.in'],
  ['Status', <span key="s" style={{ color: '#13994A' }}>● Open to new roles</span>],
];

/** A jagged bolt by midpoint displacement; `seed` changes every exposure. */
function boltPath(x1: number, y1: number, x2: number, y2: number, seed: number) {
  let pts: [number, number][] = [
    [x1, y1],
    [x2, y2],
  ];
  let off = Math.hypot(x2 - x1, y2 - y1) * 0.28;
  for (let level = 0; level < 4; level++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const d = (hash(seed, level, i) - 0.5) * 2 * off;
      next.push([(ax + bx) / 2 + (-(by - ay) / len) * d, (ay + by) / 2 + ((bx - ax) / len) * d], pts[i]);
    }
    pts = next;
    off *= 0.55;
  }
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
}

const RULE = 1040;
const CENTER = 540;

/**
 * Two bars. Bar 1: name, details, and the avatar walks to the middle, stops
 * and turns to camera. Bar 2: it releases its aura — glow, crackling bolts,
 * embers — bursting on beat 3 with a shockwave.
 */
export const Lockup: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const { b } = HIT;
  const scale = 0.5;
  // Walk in on twos, facing the way he moves; stop dead centre on beat 3.
  const walkStart = 0.08;
  const stopAt = b(2);
  const ax = tween(t, [walkStart, stopAt], [-110, CENTER], (k) => k);
  const auraAt = b(4);
  const burstAt = b(6);
  // Stops facing camera, then powers up: the red aura matches the red lightning
  // drawn into the power-up sprite frames.
  const frame = t < stopAt ? walkFrame(t - walkStart, 10) : t < auraAt ? 'idle-a' : t < burstAt ? 'haki-a' : 'haki-b';
  // Aura strength: builds through bar 2, peaks at the burst, keeps crackling.
  const aura = t < auraAt ? 0 : t < burstAt ? 0.45 + 0.35 * tween(t, [auraAt, burstAt], [0, 1], ease.inOutCubic) : 1;
  const burst = t >= burstAt ? Math.exp(-(t - burstAt) * 3.2) : 0;
  const exposure = Math.floor(t * 10);
  const shake = (hash(exposure, 7) - 0.5) * 2 * (1 + 8 * burst) * (aura > 0 ? 1 : 0);
  const cy = RULE - 120; // middle of the figure at this scale
  const ring = t >= burstAt ? tween(t, [burstAt, burstAt + 0.55], [0, 1], ease.outExpo) : 0;
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * -0.6}px)` }}>
        <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
          <Boil seed={901}>
            <Rise t={t} at={0} height={slot('SUDHANSHU', 62)} dur={0.3}>
              <FitWord word="SUDHANSHU" wdth={62} color={K.ink} />
            </Rise>
          </Boil>
          <Boil seed={902} style={{ marginTop: 14 }}>
            <Rise t={t} at={b(1) - 0.35} height={slot('SINGH', 125)} dur={0.3}>
              <FitWord word="SINGH" wdth={125} color={K.ink} />
            </Rise>
          </Boil>
        </div>

        {/* Aura: glow behind the figure */}
        {aura > 0 && (
          <div
            style={{
              position: 'absolute',
              left: CENTER - 330,
              top: cy - 330,
              width: 660,
              height: 660,
              borderRadius: '50%',
              background: `radial-gradient(closest-side, rgba(242,34,43,${0.45 * aura}), rgba(242,34,43,${0.14 * aura}) 55%, rgba(242,34,43,0) 100%)`,
              transform: `scale(${1 + 0.06 * Math.sin(exposure * 1.7)})`,
            }}
          />
        )}

        <div style={{ position: 'absolute', left: X, top: RULE, width: COL }}>
          <div style={{ height: 3, background: K.ink, transform: `scaleX(${held(tween(t, [0.3, 0.7], [0, 1], ease.inOutCubic), 4)})`, transformOrigin: 'left' }} />
          {ROWS.map(([k, v], i) => {
            const on = held(tween(t, [b(1) + i * 0.3, b(1) + i * 0.3 + 0.1]), 1);
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'baseline', padding: '20px 0', borderBottom: '1.5px solid rgba(14,14,16,0.14)', opacity: on }}>
                <span style={{ ...mono, fontSize: 22, color: K.inkSoft, width: 170 }}>{k}</span>
                <span style={{ ...display(100, 600), fontSize: 38, color: K.ink }}>{v}</span>
              </div>
            );
          })}
        </div>

        {/* Embers rising off the rule */}
        {aura > 0 &&
          Array.from({ length: 22 }, (_, i) => {
            const life = 0.7 + hash(i, 3) * 0.6;
            const ph = (((t - auraAt) + hash(i, 4) * life) % life) / life;
            const x = CENTER + (hash(i, 5) - 0.5) * 300 + Math.sin(i + t * 3) * 10;
            const y = RULE - 10 - ph * (180 + hash(i, 6) * 160) * (0.6 + aura);
            const sz = 5 + hash(i, 7) * 7;
            return <div key={i} style={{ position: 'absolute', left: x, top: y, width: sz, height: sz, background: hash(i, 8) > 0.75 ? K.ink : K.red, opacity: Math.sin(ph * Math.PI) * aura }} />;
          })}

        <Character frame={frame} x={ax} y={RULE} scale={scale} shadow={0.5} />

        {/* Crackling bolts, re-drawn every exposure */}
        {aura > 0 && (
          <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 8 }, (_, i) => {
              if (hash(exposure, i, 11) > 0.45 + aura * 0.5) return null;
              // Upper half only: the aura crackles in the space between the name
              // and the rule, never across the contact details.
              const a = Math.PI + 0.12 + (i / 7) * (Math.PI - 0.24) + (hash(exposure, i) - 0.5) * 0.3;
              const r0 = 70;
              const r1 = 130 + aura * 70 + burst * 90;
              const d = boltPath(CENTER + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9, CENTER + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9, exposure * 13 + i);
              return (
                <g key={i}>
                  <path d={d} stroke={K.red} strokeWidth={6} fill="none" strokeLinejoin="bevel" />
                  <path d={d} stroke={K.ink} strokeWidth={1.6} fill="none" strokeLinejoin="bevel" />
                </g>
              );
            })}
            {ring > 0 && ring < 1 && <circle cx={CENTER} cy={cy} r={40 + ring * 520} fill="none" stroke={K.red} strokeWidth={10 * (1 - ring) + 2} opacity={1 - ring} />}
          </svg>
        )}

        <div style={{ position: 'absolute', left: X, top: 1600, ...serif, fontSize: 58, color: K.ink, opacity: held(tween(t, [b(3), b(3) + 0.2]), 2) }}>
          Let’s talk.
        </div>
      </AbsoluteFill>
      {burst > 0.6 && <AbsoluteFill style={{ background: K.red, opacity: (burst - 0.6) * 0.45 }} />}
    </AbsoluteFill>
  );
};

export const End: React.FC = () => {
  const { t } = useT();
  const draw = held(tween(t, [0, 0.45], [0, 1], ease.inOutCubic), 6);
  const light = tween(t, [0.15, 1.5], [-0.1, 0.62], ease.inOutCubic);
  const url = held(tween(t, [0.35, 0.55]), 2);
  const fadeOut = tween(t, [1.25, 1.65], [0, 1], ease.inOutCubic);
  return (
    <AbsoluteFill style={{ background: K.ink, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: 1 - fadeOut, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Boil seed={951} amount={0.6}>
          <SSMark width={400} light={[light, 0.32]} lit={draw} draw={draw} accent={K.blue} />
        </Boil>
        <div style={{ marginTop: 44, ...mono, fontSize: 26, letterSpacing: '0.2em', color: K.paper, opacity: url }}>sudhanshuxsingh.in</div>
      </div>
    </AbsoluteFill>
  );
};
