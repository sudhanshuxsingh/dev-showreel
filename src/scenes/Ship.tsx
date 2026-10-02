import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ChapterHeader, Window } from '../components/Stage';
import { ease, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

const SPANS = [
  { name: 'retrieve', start: 0, dur: 0.13, depth: 0, ms: '180ms' },
  { name: 'rerank', start: 0.13, dur: 0.05, depth: 0, ms: '60ms' },
  { name: 'llm.generate', start: 0.18, dur: 0.66, depth: 0, ms: '940ms' },
  { name: 'tool.search_docs', start: 0.3, dur: 0.15, depth: 1, ms: '210ms' },
];
const EVALS = ['faithfulness', 'relevance', 'safety'];

/** Observability → evals → deploy → real product, live. */
export const Ship: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end, at } = useScene(scene);
  const tracedAt = at(/^traced/, 1.75);
  const evalAt = at(/^evaluated/, 2.4);
  const shipAt = at(/^ship/, 3.9);
  const polishAt = at(/^polish/, 4.95);
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);
  const traceIn = tween(t, [0.2, 0.8]);
  const deployIn = tween(t, [shipAt - 0.6, shipAt - 0.1]);
  const progress = tween(t, [shipAt, shipAt + 0.55], [0, 1], ease.inOutCubic);
  const live = t > shipAt + 0.6;
  const site = tween(t, [shipAt + 0.55, shipAt + 1.05], [0, 1], ease.inOutQuint);
  const scroll = tween(t, [shipAt + 0.9, end], [0, 110], ease.inOutCubic);
  const sweep = tween(t, [polishAt, polishAt + 0.8], [-0.3, 1.3], ease.inOutCubic);

  const vw = 936;
  const vh = 410 - 56;
  const s = vw / 552;

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <ChapterHeader t={t} fps={fps} index={5} label="SHIP" kanji="出荷" line="Traced. Evaluated. Shipped." exit={end - 0.4} />

      <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${-out * 30}px)` }}>
        {/* Trace waterfall */}
        <div style={{ opacity: traceIn, transform: `translateY(${(1 - traceIn) * 40}px)` }}>
          <Window x={M} y={500} w={936} h={330} title={<span>trace · <span style={{ color: C.text }}>answer()</span></span>} accent={C.red}>
            <div style={{ position: 'absolute', left: 26, right: 26, top: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 19, color: C.mute }}>
                <span>
                  4 spans · <span style={{ color: C.text }}>1.42s</span>
                </span>
                <span style={{ color: C.dim }}>traced with Langfuse</span>
              </div>
              {SPANS.map((sp, i) => {
                const grow = tween(t, [tracedAt + i * 0.1, tracedAt + 0.45 + i * 0.1], [0, 1], ease.outExpo);
                const isLLM = sp.name === 'llm.generate';
                return (
                  <div key={sp.name} style={{ display: 'flex', alignItems: 'center', marginTop: 14, height: 30, fontFamily: F.mono, fontSize: 19 }}>
                    <span style={{ width: 230, paddingLeft: sp.depth * 22, color: isLLM ? C.text : C.dim, whiteSpace: 'nowrap' }}>
                      {sp.depth ? '└ ' : ''}
                      {sp.name}
                    </span>
                    <div style={{ position: 'relative', flex: 1, height: 22 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${sp.start * 100}%`,
                          width: `${sp.dur * 100 * grow}%`,
                          height: '100%',
                          borderRadius: 6,
                          background: isLLM ? C.red : withAlpha(C.text, 0.55),
                          boxShadow: isLLM ? glow(C.red, 10, 0.4) : undefined,
                        }}
                      />
                    </div>
                    <span style={{ width: 90, textAlign: 'right', color: C.mute, opacity: grow }}>{sp.ms}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                {EVALS.map((e, i) => {
                  const p = pop(t, fps, evalAt + i * 0.12, { damping: 13 });
                  return (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999, border: `1.5px solid ${withAlpha(C.green, 0.5)}`, background: withAlpha(C.green, 0.08), fontFamily: F.mono, fontSize: 19, color: C.text, transform: `scale(${p})`, opacity: Math.min(1, p * 1.5) }}>
                      <span style={{ color: C.green }}>✓</span>
                      {e}
                    </div>
                  );
                })}
                <span style={{ marginLeft: 'auto', alignSelf: 'center', fontFamily: F.mono, fontSize: 18, color: C.green, opacity: tween(t, [evalAt + 0.5, evalAt + 0.8]) }}>eval run · passed</span>
              </div>
            </div>
          </Window>
        </div>

        {/* Deploy → live product */}
        <div style={{ opacity: deployIn, transform: `translateY(${(1 - deployIn) * 50}px)` }}>
          <Window
            x={M}
            y={850}
            w={936}
            h={410}
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span style={{ padding: '4px 14px', borderRadius: 8, background: C.panel2, color: C.text }}>whisper.sudhanshuxsingh.in</span>
              </span>
            }
          >
            {/* Deploy log under the page */}
            <div style={{ position: 'absolute', left: 30, right: 30, top: 40, fontFamily: F.mono, fontSize: 22, color: C.text }}>
              <div>▲ Deploying to production…</div>
              <div style={{ marginTop: 18, height: 10, borderRadius: 5, background: C.panel2, overflow: 'hidden' }}>
                <div style={{ width: `${progress * 100}%`, height: '100%', background: C.red, boxShadow: glow(C.red, 10, 0.6) }} />
              </div>
              <div style={{ marginTop: 18, color: live ? C.green : C.mute }}>{live ? '✓ Ready — promoted to production' : `building · ${Math.round(progress * 100)}%`}</div>
            </div>
            {/* The real site, revealed like a curtain */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, overflow: 'hidden', clipPath: `inset(${(1 - site) * 100}% 0 0 0)` }}>
              <Img
                src={staticFile('work/whisper-1.jpg')}
                style={{ position: 'absolute', width: 600 * s, left: -24 * s, top: -(78 + scroll) * s }}
              />
              {/* Polish: a light sweep */}
              <div
                style={{
                  position: 'absolute',
                  top: -100,
                  bottom: -100,
                  left: `${sweep * 100}%`,
                  width: 180,
                  transform: 'skewX(-18deg)',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                }}
              />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'linear-gradient(transparent, rgba(6,6,7,0.95))' }} />
              <div style={{ position: 'absolute', left: 24, right: 24, bottom: 20, display: 'flex', gap: 12 }}>
                {[
                  ['Whisper', 'live', C.green],
                  ['Flow', 'in progress', C.dim],
                  ['EmailWhiz', 'in progress', C.dim],
                ].map(([name, status, color], i) => {
                  const p = pop(t, fps, shipAt + 1.2 + i * 0.15, { damping: 14 });
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, background: 'rgba(15,15,19,0.92)', border: `1.5px solid ${C.lineStrong}`, fontFamily: F.sans, fontSize: 22, fontWeight: 600, color: C.text, transform: `translateY(${(1 - p) * 30}px)`, opacity: Math.min(1, p * 1.4) }}>
                      {name}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: F.mono, fontWeight: 400, fontSize: 16, color }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: color === C.green ? `0 0 10px ${C.green}` : undefined }} />
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Window>
          {live && (
            <div style={{ position: 'absolute', right: M + 24, top: 850 + 12, padding: '6px 14px', borderRadius: 999, background: withAlpha(C.green, 0.12), border: `1.5px solid ${withAlpha(C.green, 0.6)}`, color: C.green, fontFamily: F.mono, fontSize: 18, transform: `scale(${pop(t, fps, shipAt + 0.6)})` }}>
              ● Live
            </div>
          )}
        </div>
      </div>

      <Sfx name="whoosh-fast" at={0.15} volume={0.35} />
      {SPANS.map((sp, i) => (
        <Sfx key={sp.name} name="tick" at={tracedAt + i * 0.1} volume={0.35} rate={1 + i * 0.1} />
      ))}
      <Sfx name="success" at={evalAt + 0.1} volume={0.4} />
      <Sfx name="riser-short" at={shipAt - 0.9} volume={0.25} dur={1.4} />
      <Sfx name="chime" at={shipAt + 0.6} volume={0.45} />
      <Sfx name="whoosh" at={shipAt + 0.5} volume={0.35} />
      <Sfx name="sparkle" at={polishAt} volume={0.45} />
    </AbsoluteFill>
  );
};
