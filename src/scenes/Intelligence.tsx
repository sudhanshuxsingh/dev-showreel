import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ChapterHeader, Window } from '../components/Stage';
import { ease, hash, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

const NODES = [
  { label: 'Query', sub: 'user prompt' },
  { label: 'Embed', sub: 'text → vector' },
  { label: 'Retrieve', sub: 'vector search · top-k' },
  { label: 'Reason', sub: 'OpenAI · Claude · Gemini' },
  { label: 'Stream', sub: 'tokens → UI' },
];
const NX = M;
const NW = 316;
const NH = 104;
const NY = (i: number) => 512 + i * 142;
const PXL = 412;
const PW = 1080 - M - PXL;
const PY = 500;
const PH = 760;

const ANSWER =
  'Q3 extends the refund window from 14 to 30 days, adds instant refunds under $50, and requires a reason code for B2B orders.';

/** RAG + agents + streaming, as a live pipeline. */
export const Intelligence: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end, at } = useScene(scene);
  const thinkAt = at(/^think/, 1.3);
  const ragAt = at(/^RAG/, 2.2);
  const agentsAt = at(/^agents/, 4.1);
  const answersAt = at(/^answers/, 5.8);
  const retrieveAt = ragAt + 0.75;
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);
  const panelIn = tween(t, [0.2, 0.8]);

  const phase = t < ragAt ? 0 : t < retrieveAt ? 1 : t < agentsAt ? 2 : t < answersAt ? 3 : 4;
  const thinkFlash = tween(t, [thinkAt, thinkAt + 0.08], [0, 1], ease.linear) * (1 - tween(t, [thinkAt + 0.08, thinkAt + 0.7]));
  const titles = ['prompt', 'embedding', 'vector search · top-k', 'agent · tool calls', 'response · streaming'];

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <ChapterHeader t={t} fps={fps} index={4} label="INTELLIGENCE" kanji="知能" line="RAG, agents, streaming." exit={end - 0.4} />

      <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${-out * 30}px)` }}>
        {/* Pipeline */}
        {NODES.map((n, i) => {
          const enter = pop(t, fps, 0.25 + i * 0.09, { damping: 18 });
          const active = phase === i;
          const done = phase > i;
          const pulse = active ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
          return (
            <React.Fragment key={n.label}>
              {i > 0 && (
                <div style={{ position: 'absolute', left: NX + 40, top: NY(i - 1) + NH, width: 2, height: 142 - NH, background: done || active ? C.red : C.lineStrong, opacity: enter }}>
                  {(active || done) &&
                    [0, 1, 2].map((k) => (
                      <span
                        key={k}
                        style={{
                          position: 'absolute',
                          left: -3,
                          top: (((t * 1.6 + k / 3) % 1) * (142 - NH)) - 4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: '#fff',
                          boxShadow: glow(C.red, 8, 0.9),
                        }}
                      />
                    ))}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  left: NX,
                  top: NY(i),
                  width: NW,
                  height: NH,
                  borderRadius: 22,
                  border: `2px solid ${active ? C.red : done ? withAlpha(C.red, 0.45) : C.lineStrong}`,
                  background: active ? withAlpha(C.red, 0.1 + pulse * 0.05) : C.panel,
                  boxShadow: active ? glow(C.red, 18 + pulse * 10, 0.35 + thinkFlash * 0.4) : thinkFlash > 0 ? glow(C.red, 20, thinkFlash * 0.5) : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '0 22px',
                  boxSizing: 'border-box',
                  transform: `translateX(${(1 - enter) * -60}px)`,
                  opacity: enter,
                }}
              >
                <span style={{ width: 38, height: 38, borderRadius: 19, border: `2px solid ${active || done ? C.red : C.mute}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 16, color: done ? '#fff' : active ? C.red : C.mute, background: done ? C.red : 'transparent' }}>
                  {done ? '✓' : i + 1}
                </span>
                <div>
                  <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: active || done ? C.text : C.dim, letterSpacing: '-0.02em' }}>{n.label}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 16, color: active ? C.dim : C.mute, marginTop: 2, whiteSpace: 'nowrap' }}>{n.sub}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Detail panel */}
        <div style={{ opacity: panelIn, transform: `translateY(${(1 - panelIn) * 40}px)` }}>
          <Window x={PXL} y={PY} w={PW} h={PH} title={titles[phase]} accent={C.red}>
            <div style={{ position: 'absolute', inset: 24 }}>
              {phase === 0 && <PromptView t={t} />}
              {phase === 1 && <EmbedView t={t} at={ragAt} />}
              {phase === 2 && <RetrieveView t={t} at={retrieveAt} fps={fps} />}
              {phase === 3 && <AgentView t={t} at={agentsAt} fps={fps} />}
              {phase === 4 && <AnswerView t={t} at={answersAt} />}
            </div>
          </Window>
        </div>
      </div>

      <Sfx name="whoosh-fast" at={0.15} volume={0.35} />
      <Sfx name="zap" at={thinkAt} volume={0.55} />
      <Sfx name="compute" at={ragAt} volume={0.5} />
      <Sfx name="scan" at={retrieveAt} volume={0.45} />
      {[0, 1, 2].map((k) => (
        <Sfx key={k} name="click" at={agentsAt + 0.25 + k * 0.42} volume={0.4} />
      ))}
      <Sfx name="success" at={agentsAt + 1.45} volume={0.3} />
      {Array.from({ length: 14 }, (_, k) => (
        <Sfx key={`b${k}`} name="blip" at={answersAt + 0.25 + k * 0.13} volume={0.12} rate={1 + (k % 3) * 0.08} />
      ))}
    </AbsoluteFill>
  );
};

function Bubble({ children, user, style }: { children: React.ReactNode; user?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '18px 22px',
        borderRadius: user ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
        background: user ? C.red : '#18181E',
        border: user ? undefined : `1px solid ${C.lineStrong}`,
        fontFamily: F.sans,
        fontSize: 27,
        lineHeight: 1.4,
        color: C.text,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PromptView({ t }: { t: number }) {
  const q = 'What changed in our Q3 refund policy?';
  const n = Math.floor(tween(t, [0.5, 1.3], [0, q.length], ease.linear));
  return (
    <>
      <div style={{ fontFamily: F.mono, fontSize: 18, color: C.mute, letterSpacing: '0.14em' }}>USER</div>
      <Bubble user style={{ marginTop: 14, marginLeft: 80 }}>
        {q.slice(0, n)}
        <span style={{ opacity: n < q.length ? 1 : 0 }}>▍</span>
      </Bubble>
      <div style={{ marginTop: 28, fontFamily: F.mono, fontSize: 20, color: C.dim, opacity: tween(t, [1.5, 1.8]) }}>→ grounding in your docs…</div>
    </>
  );
}

function EmbedView({ t, at }: { t: number; at: number }) {
  const frame = Math.floor(t * 30);
  const settle = tween(t, [at + 0.2, at + 0.6]);
  return (
    <>
      <div style={{ fontFamily: F.mono, fontSize: 18, color: C.mute, letterSpacing: '0.14em' }}>EMBEDDING · 1 × 1536</div>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {Array.from({ length: 28 }, (_, i) => {
          const live = hash(i, settle < 1 ? frame : 0) * 2 - 1;
          const v = settle < 1 ? live : hash(i, 99) * 2 - 1;
          const shown = tween(t, [at + i * 0.012, at + 0.15 + i * 0.012]);
          return (
            <div key={i} style={{ height: 52, borderRadius: 10, background: withAlpha(v > 0 ? C.red : C.text, Math.abs(v) * 0.22), border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 19, color: C.text, opacity: shown }}>
              {v.toFixed(2)}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 18, fontFamily: F.mono, fontSize: 20, color: C.dim }}>… 1,508 more dimensions</div>
    </>
  );
}

function RetrieveView({ t, at, fps }: { t: number; at: number; fps: number }) {
  const W = 540;
  const H = 400;
  const pts = Array.from({ length: 90 }, (_, i) => ({ x: 20 + hash(i, 1) * (W - 40), y: 20 + hash(i, 2) * (H - 40) }));
  const q = { x: W * 0.58, y: H * 0.44 };
  const near = [...pts].sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 4);
  const qIn = pop(t, fps, at + 0.25, { damping: 10 });
  const lines = tween(t, [at + 0.45, at + 0.8]);
  const docs = [
    ['refund-policy-q3.md', '0.92'],
    ['changelog-sep.md', '0.87'],
    ['support-faq.md', '0.81'],
  ];
  return (
    <>
      <svg width={W} height={H} style={{ display: 'block', borderRadius: 16, background: '#0B0B0F', border: `1px solid ${C.line}` }}>
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill={near.includes(p) && lines > 0 ? C.text : '#3A3A44'} opacity={tween(t, [at + (i % 30) * 0.008, at + 0.2 + (i % 30) * 0.008])} />
        ))}
        {near.map((p, i) => (
          <line key={i} x1={q.x} y1={q.y} x2={q.x + (p.x - q.x) * lines} y2={q.y + (p.y - q.y) * lines} stroke={C.red} strokeWidth={2.5} />
        ))}
        <circle cx={q.x} cy={q.y} r={11 * qIn} fill={C.red} />
        <circle cx={q.x} cy={q.y} r={30 * qIn} fill="none" stroke={C.red} strokeWidth={2} opacity={0.5} />
      </svg>
      {docs.map(([name, score], i) => {
        const p = tween(t, [at + 0.7 + i * 0.12, at + 1.0 + i * 0.12]);
        return (
          <div key={name} style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderRadius: 12, border: `1px solid ${C.lineStrong}`, background: C.panel2, fontFamily: F.mono, fontSize: 20, opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
            <span style={{ color: C.text }}>▤ {name}</span>
            <span style={{ color: C.red }}>{score}</span>
          </div>
        );
      })}
    </>
  );
}

function AgentView({ t, at, fps }: { t: number; at: number; fps: number }) {
  const calls = ['search_docs("refund window")', 'sql.query(orders, last_90d)', 'diff(policy_q2, policy_q3)'];
  const ring = ['plan', 'act', 'observe'];
  const activeStep = Math.floor(((t - at) * 2.2) % 3);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 }}>
        {ring.map((r, i) => (
          <React.Fragment key={r}>
            <span style={{ padding: '10px 20px', borderRadius: 999, border: `2px solid ${i === activeStep ? C.red : C.lineStrong}`, background: i === activeStep ? withAlpha(C.red, 0.15) : 'transparent', fontFamily: F.mono, fontSize: 22, color: i === activeStep ? C.text : C.dim }}>{r}</span>
            {i < 2 && <span style={{ color: C.mute, fontFamily: F.mono, fontSize: 22 }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontFamily: F.mono, fontSize: 18, color: C.mute, marginTop: 10 }}>↺ loop until grounded</div>
      <div style={{ marginTop: 26 }}>
        {calls.map((c, i) => {
          const start = at + 0.25 + i * 0.42;
          const p = pop(t, fps, start, { damping: 16 });
          const done = t > start + 0.38;
          const spin = ['◐', '◓', '◑', '◒'][Math.floor(t * 12) % 4];
          return (
            <div key={c} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 14, background: C.panel2, border: `1px solid ${done ? withAlpha(C.green, 0.4) : C.lineStrong}`, fontFamily: F.mono, fontSize: 21, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 20}px)` }}>
              <span style={{ color: done ? C.green : C.red, width: 22 }}>{done ? '✓' : spin}</span>
              <span style={{ color: C.code.fn }}>tool</span>
              <span style={{ color: C.text, whiteSpace: 'nowrap' }}>{c}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AnswerView({ t, at }: { t: number; at: number }) {
  const words = ANSWER.split(' ');
  const n = Math.floor(tween(t, [at + 0.25, at + 2.1], [0, words.length], ease.linear));
  const done = n >= words.length;
  const tokens = Math.round(tween(t, [at + 0.25, at + 2.1], [0, 41], ease.linear));
  return (
    <>
      <Bubble user style={{ marginLeft: 120, fontSize: 22, padding: '12px 18px' }}>
        What changed in our Q3 refund policy?
      </Bubble>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, fontFamily: F.mono, fontSize: 18, color: C.mute }}>
        <span style={{ width: 26, height: 26, borderRadius: 13, background: `radial-gradient(circle at 35% 30%, ${C.redHot}, ${C.redDeep})` }} />
        assistant
      </div>
      <Bubble style={{ marginTop: 10 }}>
        {words.slice(0, n).join(' ')}
        {!done && <span style={{ color: C.red }}> ▍</span>}
        {done && (
          <span style={{ marginLeft: 10, fontFamily: F.mono, fontSize: 18 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: withAlpha(C.red, 0.2), color: C.red }}>1</span>{' '}
            <span style={{ padding: '2px 8px', borderRadius: 6, background: withAlpha(C.red, 0.2), color: C.red }}>2</span>
          </span>
        )}
      </Bubble>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 18, color: C.mute }}>
        <span>{tokens} tokens · streamed</span>
        <span style={{ color: done ? C.green : C.dim }}>{done ? '● grounded · 2 sources' : '● streaming'}</span>
      </div>
    </>
  );
}
