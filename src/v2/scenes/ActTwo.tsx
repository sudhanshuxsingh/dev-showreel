import React, { useContext, useMemo } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { F } from '../../lib/fonts';
import { ease, tween } from '../../lib/anim';
import { SceneBeatsContext, useHits, type SceneBeats } from '../grid';
import { fit } from '../metrics';
import { display, K, mono, serif } from '../theme';
import { Boil, held } from '../components/stop';
import { Rise, Roll } from '../components/type';
import { FitWord, useT } from './ActOne';

const COL = 952;
const X = 64;
const slot = (word: string, wdth: number) => Math.ceil(fit(word, wdth, COL) * 0.8) + 4;

/** Huge outlined chapter numeral, bleeding off the bottom-right corner. */
function Numeral({ t, n, color }: { t: number; n: string; color: string }) {
  const k = held(tween(t, [0.1, 0.45], [0, 1], ease.outExpo), 4);
  return (
    <div
      style={{
        position: 'absolute',
        right: -40,
        bottom: 120 - (1 - k) * 80,
        ...display(125, 900),
        fontSize: 460,
        lineHeight: 0.8,
        color: 'transparent',
        WebkitTextStroke: `2px ${color}`,
        opacity: k,
      }}
    >
      {n}
    </div>
  );
}

function Kicker({ t, at, children, color }: { t: number; at: number; children: React.ReactNode; color: string }) {
  return (
    <div style={{ ...mono, fontSize: 22, color, opacity: held(tween(t, [at, at + 0.2]), 2) }}>{children}</div>
  );
}

// --- 01 Gen-AI: a requirement is written, the board flips REQUIREMENT → PRODUCT ---------------
// The engineer turns requirements into products — Gen-AI is the material, not the maker.

const REQUIREMENT = 'Support needs instant, cited answers from internal docs.';
const FROM = 'REQUIREMENT';
const TO = '  PRODUCT  ';

export const Build: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const typed = Math.floor(tween(t, [0.15, HIT.b(3)], [0, REQUIREMENT.length], ease.linear));
  const flipAt = HIT.b(4);
  const shipped = t >= flipAt + FROM.length * 0.1;
  const cells = FROM.length;
  const gap = 6;
  const cell = (COL - gap * (cells - 1)) / cells;
  const size = (cell - 8) / 0.6;
  const tileH = Math.round(size * 1.05);
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <Numeral t={t} n="01" color="rgba(239,239,234,0.16)" />
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        <Kicker t={t} at={0} color={K.paperSoft}>01 — Gen-AI products</Kicker>
        {/* The requirement, written as a ticket */}
        <Boil seed={101} style={{ marginTop: 26 }}>
          <div style={{ borderRadius: 26, border: `2px solid rgba(239,239,234,0.22)`, padding: '26px 34px', background: 'rgba(239,239,234,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 20 }}>
              <span style={{ color: K.sky }}>REQ-042 · P1</span>
              <span style={{ color: shipped ? K.green : K.paperSoft }}>{shipped ? '✓ Shipped' : '● Open'}</span>
            </div>
            <div style={{ marginTop: 16, fontFamily: F.sans, fontWeight: 500, fontSize: 40, lineHeight: 1.3, color: K.paper, minHeight: 104 }}>
              {REQUIREMENT.slice(0, typed)}
              <span style={{ display: 'inline-block', width: 3, height: 40, marginLeft: 3, verticalAlign: 'middle', background: K.paper, opacity: typed < REQUIREMENT.length && Math.floor(t * 5) % 2 ? 1 : 0 }} />
            </div>
          </div>
        </Boil>
      </div>
      {/* Split-flap board: REQUIREMENT → PRODUCT, one flap per exposure */}
      <Boil seed={102} amount={0.5} style={{ position: 'absolute', left: X, top: 900, width: COL }}>
        <div style={{ display: 'flex', gap }}>
          {[...TO].map((ch, i) => {
            const at = flipAt + i * 0.1;
            const done = t >= at + 0.3;
            return (
              <div key={i} style={{ position: 'relative', width: cell, height: tileH, borderRadius: 10, background: '#17171C', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: size, lineHeight: `${tileH}px`, color: done && ch.trim() ? K.blue : K.paper }}>
                  <Roll from={FROM[i]} to={ch} t={t} at={at} dur={0.3} height={tileH} />
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: tileH / 2 - 1, height: 2, background: K.ink }} />
              </div>
            );
          })}
        </div>
      </Boil>
      <Boil seed={103} style={{ position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center' }}>
        <Rise t={t} at={HIT.b(5)} height={100} dur={0.3}>
          <div style={{ ...serif, fontSize: 80, color: K.paper }}>
            from requirement to <span style={{ color: K.sky }}>product.</span>
          </div>
        </Rise>
      </Boil>
    </AbsoluteFill>
  );
};

// --- 02 RAG: an embedding space you can see --------------------------------------------------

const POINTS = (() => {
  const n = 320;
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
})();

const TILT = 0.32;
const SPIN = 0.22;
/** Query = the point facing the camera when it appears; neighbours fixed in 3D. */
function queryAt(appear: number) {
  const th = SPIN * appear;
  const query: [number, number, number] = [Math.cos(TILT) * Math.sin(th), -Math.sin(TILT), -Math.cos(TILT) * Math.cos(th)];
  const near = POINTS.map((p, i) => ({ i, d: (p[0] - query[0]) ** 2 + (p[1] - query[1]) ** 2 + (p[2] - query[2]) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(1, 8)
    .map((r) => r.i);
  return { query, near };
}

export const Rag: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const R = 360;
  const cx = 540;
  const cy = 1010;
  const theta = t * SPIN;
  const project = ([x, y, z]: [number, number, number]) => {
    const x1 = x * Math.cos(theta) + z * Math.sin(theta);
    const z1 = -x * Math.sin(theta) + z * Math.cos(theta);
    const y2 = y * Math.cos(TILT) - z1 * Math.sin(TILT);
    const z2 = y * Math.sin(TILT) + z1 * Math.cos(TILT);
    const p = 2.6 / (2.6 + z2);
    return { x: cx + x1 * R * p, y: cy + y2 * R * p, z: z2, p };
  };
  const { query: QUERY, near: NEAR } = useMemo(() => queryAt(HIT.b(2)), [HIT.b(2)]);
  const near = new Set(NEAR);
  const qOn = t >= HIT.b(2);
  const linesK = held(tween(t, [HIT.b(3), HIT.b(3) + 0.4]), 4);
  const q = project(QUERY);
  const proj = POINTS.map(project);
  const labels = ['policy-q3.md', 'faq.md', 'changelog.md'];
  return (
    <AbsoluteFill style={{ background: K.navy }}>
      <Numeral t={t} n="02" color="rgba(239,239,234,0.2)" />
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        <Kicker t={t} at={0} color={K.paperSoft}>02 — Retrieval &amp; search</Kicker>
        <Boil seed={201} style={{ marginTop: 22 }}>
          <Rise t={t} at={0.05} height={slot('RAG', 125) * 0.62} dur={0.25}>
            <FitWord word="RAG" wdth={125} color={K.paper} size={fit('RAG', 125, COL) * 0.62} />
          </Rise>
        </Boil>
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        {proj
          .map((p, i) => ({ ...p, i }))
          .sort((a, b) => b.z - a.z)
          .map((p) => {
            const hot = qOn && near.has(p.i);
            return <circle key={p.i} cx={p.x} cy={p.y} r={(hot ? 7 : 3.4) * p.p} fill={hot ? K.sky : K.paper} opacity={hot ? 1 : 0.22 + (1 - (p.z + 1) / 2) * 0.78} />;
          })}
        {qOn &&
          NEAR.map((i) => {
            const p = proj[i];
            return <line key={i} x1={q.x} y1={q.y} x2={q.x + (p.x - q.x) * linesK} y2={q.y + (p.y - q.y) * linesK} stroke={K.sky} strokeWidth={3} />;
          })}
        {qOn && <circle cx={q.x} cy={q.y} r={16} fill={K.paper} stroke={K.sky} strokeWidth={6} />}
      </svg>
      {t >= HIT.b(4) &&
        NEAR.slice(0, 3).map((i, k) => {
          const p = proj[i];
          return (
            <div key={i} style={{ position: 'absolute', left: k === 1 ? p.x - 200 : p.x + 18, top: p.y - 46 + (k === 2 ? 64 : 0), ...mono, fontSize: 20, color: K.paper, padding: '4px 10px', background: K.blue, whiteSpace: 'nowrap', opacity: held(tween(t, [HIT.b(4 + k), HIT.b(4 + k) + 0.1]), 1) }}>
              {labels[k]}
            </div>
          );
        })}
      <Boil seed={202} style={{ position: 'absolute', left: 0, right: 0, top: 1450, textAlign: 'center' }}>
        <Rise t={t} at={HIT.b(6)} height={100} dur={0.3}>
          <div style={{ ...serif, fontSize: 84, color: K.paper }}>answers, grounded in your data.</div>
        </Rise>
      </Boil>
    </AbsoluteFill>
  );
};

// --- 03 Interfaces: one micro-interaction, done properly -----------------------------------

export const Interfaces: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const press = tween(t, [HIT.b(1), HIT.b(1) + 0.1]) * (1 - tween(t, [HIT.b(1) + 0.1, HIT.b(1) + 0.3]));
  const morph = held(tween(t, [HIT.b(1) + 0.2, HIT.b(1) + 0.7], [0, 1], ease.inOutCubic), 5);
  const spin = t * 5;
  const done = t >= HIT.b(4);
  const check = held(tween(t, [HIT.b(4), HIT.b(4) + 0.3]), 3);
  const expand = held(tween(t, [HIT.b(5), HIT.b(5) + 0.5], [0, 1], ease.inOutCubic), 5);
  const w = 560 - morph * 410 + expand * (900 - 150);
  const h = 150 + expand * (520 - 150);
  const r = 75 - expand * 45;
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <Numeral t={t} n="03" color="rgba(14,14,16,0.14)" />
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        <Kicker t={t} at={0} color={K.inkSoft}>03 — Interfaces</Kicker>
        <Boil seed={301} style={{ marginTop: 22 }}>
          <Rise t={t} at={0.05} height={slot('INTERFACES', 62)} dur={0.25}>
            <FitWord word="INTERFACES" wdth={62} color={K.ink} />
          </Rise>
        </Boil>
      </div>
      <Boil seed={302} amount={0.6} style={{ position: 'absolute', left: 540 - w / 2, top: 1060 - h / 2 }}>
        <div
          style={{
            width: w,
            height: h,
            borderRadius: r,
            background: done && expand === 0 ? K.blue : K.ink,
            transform: `scale(${1 - press * 0.06})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 0 rgba(14,14,16,0.15)',
            overflow: 'hidden',
          }}
        >
          {morph === 0 && <span style={{ ...display(100, 700), fontSize: 54, color: K.paper }}>Publish</span>}
          {morph > 0.9 && !done && (
            <svg width={90} height={90} style={{ transform: `rotate(${Math.round(spin * 4) * 45}deg)` }}>
              <circle cx={45} cy={45} r={34} fill="none" stroke="rgba(239,239,234,0.25)" strokeWidth={9} />
              <path d="M45 11 A34 34 0 0 1 79 45" fill="none" stroke={K.blue} strokeWidth={9} strokeLinecap="round" />
            </svg>
          )}
          {done && expand === 0 && (
            <svg width={80} height={80}>
              <path d="M18 42 L34 58 L64 24" fill="none" stroke={K.paper} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - check)} />
            </svg>
          )}
          {expand > 0 && (
            <div style={{ width: '100%', height: '100%', padding: 44, boxSizing: 'border-box', opacity: expand >= 1 ? 1 : 0 }}>
              <div style={{ ...mono, fontSize: 20, color: K.paperSoft }}>Published · just now</div>
              <div style={{ ...display(100, 800), fontSize: 64, color: K.paper, marginTop: 18, lineHeight: 1 }}>A calmer week.</div>
              {[0.92, 0.7, 0.8].map((k, i) => (
                <div key={i} style={{ height: 22, width: `${k * 100}%`, borderRadius: 11, background: i === 0 ? K.blue : 'rgba(239,239,234,0.22)', marginTop: 26 }} />
              ))}
            </div>
          )}
        </div>
      </Boil>
      <Boil seed={303} style={{ position: 'absolute', left: 0, right: 0, top: 1450, textAlign: 'center' }}>
        <Rise t={t} at={HIT.b(6)} height={100} dur={0.3}>
          <div style={{ ...serif, fontSize: 88, color: K.ink }}>that feel inevitable.</div>
        </Rise>
      </Boil>
    </AbsoluteFill>
  );
};

// --- 04 Motion: an animator's spacing chart, on twos ---------------------------------------

const LANES: { label: string; f: (k: number) => number }[] = [
  { label: 'linear', f: (k) => k },
  { label: 'ease-in-out', f: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2) },
  { label: 'expo-out', f: (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)) },
  { label: 'spring', f: (k) => 1 - Math.exp(-6 * k) * Math.cos(11 * k) },
];

export const MotionScene: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const start = HIT.snap;
  const dur = 1.25;
  const x0 = 330;
  const x1 = 960;
  const steps = Math.max(0, Math.floor((t - start) / 0.1));
  return (
    <AbsoluteFill style={{ background: K.blue }}>
      <Numeral t={t} n="04" color="rgba(239,239,234,0.2)" />
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        <Kicker t={t} at={0} color={K.paperSoft}>04 — Taste · motion</Kicker>
        <Boil seed={401} style={{ marginTop: 22 }}>
          <Rise t={t} at={0.05} height={slot('MOTION', 125)} dur={0.25}>
            <FitWord word="MOTION" wdth={125} color={K.paper} />
          </Rise>
        </Boil>
        <Boil seed={402} style={{ marginTop: 6 }}>
          <Rise t={t} at={0.2} height={96} dur={0.25}>
            <div style={{ ...serif, fontSize: 86, color: K.paper }}>with intent.</div>
          </Rise>
        </Boil>
      </div>
      {LANES.map((lane, li) => {
        const y = 940 + li * 150;
        // Onion skin: every exposure so far, fading — the spacing shows the easing.
        const ghosts = [];
        for (let s = 0; s <= Math.min(steps, Math.ceil(dur / 0.1)); s++) {
          const k = Math.min(1, (s * 0.1) / dur);
          ghosts.push({ x: x0 + (x1 - x0) * lane.f(k), last: s === Math.min(steps, Math.ceil(dur / 0.1)) });
        }
        return (
          <div key={lane.label}>
            <div style={{ position: 'absolute', left: X, top: y - 14, ...mono, fontSize: 22, color: K.paper }}>{lane.label}</div>
            <div style={{ position: 'absolute', left: x0, top: y, width: x1 - x0, height: 2, background: 'rgba(239,239,234,0.35)' }} />
            {t >= start &&
              ghosts.map((g, gi) => (
                <div
                  key={gi}
                  style={{
                    position: 'absolute',
                    left: g.x - (g.last ? 28 : 10),
                    top: y - (g.last ? 28 : 10),
                    width: g.last ? 56 : 20,
                    height: g.last ? 56 : 20,
                    borderRadius: '50%',
                    background: g.last ? K.paper : 'transparent',
                    border: g.last ? undefined : '2px solid rgba(239,239,234,0.5)',
                  }}
                />
              ))}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: X, top: 1560, ...mono, fontSize: 20, color: K.paperSoft, opacity: held(tween(t, [HIT.back, HIT.back + 0.2]), 2) }}>
        ○ = one exposure · animated on threes
      </div>
    </AbsoluteFill>
  );
};

// --- 05 Taste: details, details, details ---------------------------------------------------

export const Taste: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const rows = 9;
  const size = 170;
  const rowH = size * 0.86;
  const step = Math.floor(t * 10);
  return (
    <AbsoluteFill style={{ background: K.lime, overflow: 'hidden' }}>
      {Array.from({ length: rows }, (_, i) => {
        const center = i === Math.floor(rows / 2);
        const dir = i % 2 ? 1 : -1;
        const offset = ((step * 9 * dir) % 600) - 300 - i * 70;
        const appear = t >= i * 0.1 ? 1 : 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: offset,
              top: 300 + i * rowH,
              whiteSpace: 'nowrap',
              ...display(62, 900),
              fontSize: size,
              lineHeight: 0.86,
              color: center ? K.ink : 'transparent',
              WebkitTextStroke: center ? undefined : `3px ${K.ink}`,
              opacity: appear,
            }}
          >
            {center && t >= HIT.b(2) ? 'TASTE · TASTE · TASTE · TASTE · TASTE' : 'DETAILS DETAILS DETAILS DETAILS DETAILS'}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: X, top: 230, ...mono, fontSize: 22, color: K.ink }}>05 — Taste</div>
    </AbsoluteFill>
  );
};

// --- 04 Taste: bar one is motion, bar two is details --------------------------------------------

export const TasteChapter: React.FC = () => {
  const { fps } = useVideoConfig();
  const HIT = useHits();
  const ctx = useContext(SceneBeatsContext);
  const split = HIT.b(4);
  const barTwo: SceneBeats = { beats: ctx.beats.filter((x) => x >= split - 0.05).map((x) => Math.max(0, x - split)), beat: ctx.beat };
  return (
    <>
      <Sequence durationInFrames={Math.round(split * fps)} layout="none">
        <MotionScene />
      </Sequence>
      <Sequence from={Math.round(split * fps)} layout="none">
        <SceneBeatsContext.Provider value={barTwo}>
          <Taste />
        </SceneBeatsContext.Provider>
      </Sequence>
    </>
  );
};

// --- 06 Shipped: SHIP stretches on the width axis; the real work ---------------------------

/** Evergreen: how things ship, not which things (projects change; the habit doesn't). */
const PIPELINE = ['commit', 'build', 'test', 'preview', 'production'];
const SPINNER = ['◐', '◓', '◑', '◒'];

export const Ship: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const size = fit('SHIP', 125, COL);
  const wdth = 62 + (125 - 62) * held(tween(t, [HIT.snap, HIT.snap + 0.4], [0, 1], ease.inOutCubic), 6);
  const step = Math.floor(t * 15);
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <Numeral t={t} n="06" color="rgba(239,239,234,0.14)" />
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        <Kicker t={t} at={0} color={K.paperSoft}>06 — Shipped</Kicker>
        <Boil seed={601} style={{ marginTop: 22 }}>
          <div style={{ ...display(wdth, 900), fontSize: size, lineHeight: 0.8, letterSpacing: '-0.01em', color: K.paper, height: size * 0.8 + 4 }}>SHIP</div>
        </Boil>
      </div>
      <div style={{ position: 'absolute', left: X, top: 1010, width: COL }}>
        {PIPELINE.map((name, i) => {
          // One step per eighth note after beat 2; production goes live on beat 4.
          const at = i < PIPELINE.length - 1 ? HIT.h(2 + i) : HIT.b(3);
          const on = t >= at;
          const done = t >= at + 0.2;
          const live = i === PIPELINE.length - 1;
          return (
            <Boil key={name} seed={610 + i} amount={0.6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, height: 96, borderTop: '2px solid rgba(239,239,234,0.14)', opacity: on ? 1 : 0.22 }}>
                <span style={{ ...mono, fontSize: 22, color: K.paperSoft, width: 44 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ ...display(100, 800), fontSize: 62, lineHeight: 1, flex: 1, color: on ? K.paper : K.paperSoft }}>{name}</span>
                <span style={{ ...mono, fontSize: 24, color: live && done ? K.green : K.paper, whiteSpace: 'nowrap' }}>
                  {!on ? '' : !done ? SPINNER[step % 4] : live ? '● Live' : '✓'}
                </span>
              </div>
            </Boil>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- Stack: one word per pulse --------------------------------------------------------------

const ROWS_STACK: { w: string; ai?: boolean }[][] = [
  [{ w: 'TypeScript' }, { w: 'React' }, { w: 'Next.js' }],
  [{ w: 'RAG', ai: true }, { w: 'Tailwind' }, { w: 'OpenAI', ai: true }],
  [{ w: 'Embeddings', ai: true }, { w: 'Claude', ai: true }],
  [{ w: 'shadcn/ui' }, { w: 'Agents', ai: true }, { w: 'Radix' }],
  [{ w: 'Gemini', ai: true }, { w: 'Motion' }, { w: 'Langfuse', ai: true }],
  [{ w: 'LangChain', ai: true }, { w: 'LLM evals', ai: true }],
  [{ w: 'Tool calling', ai: true }, { w: 'Azure OpenAI', ai: true }],
];
const STACK = ROWS_STACK.flat();

export const Stack: React.FC = () => {
  const { t } = useT();
  const HIT = useHits();
  const PULSE = HIT.pulse;
  const n = Math.min(STACK.length, Math.floor(t / (PULSE * 0.9)) + 1);
  let i = -1;
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <div style={{ position: 'absolute', left: X, top: 250, ...mono, fontSize: 22, color: K.ink }}>The stack · {String(n).padStart(2, '0')} / {STACK.length}</div>
      <div style={{ position: 'absolute', left: X, top: 330, width: COL }}>
        {ROWS_STACK.map((row, ri) => {
          const long = row.reduce((a, s) => a + s.w.length, 0) > 18;
          return (
            <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid rgba(14,14,16,0.12)', padding: '12px 0' }}>
              {row.map((s) => {
                i += 1;
                return (
                  <Boil key={s.w} seed={700 + i} amount={0.7}>
                    <span style={{ ...display(long ? 66 : 82, 900), fontSize: 96, lineHeight: 1.08, letterSpacing: '-0.01em', color: s.ai ? K.blue : K.ink, opacity: i < n ? 1 : 0, whiteSpace: 'nowrap' }}>{s.w}</span>
                  </Boil>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: X, top: 1500, display: 'flex', gap: 34, ...mono, fontSize: 22, color: K.ink }}>
        <span><span style={{ color: K.blue }}>■</span> Gen-AI</span>
        <span>■ UI engineering</span>
      </div>
    </AbsoluteFill>
  );
};
