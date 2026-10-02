import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ChapterHeader, Window } from '../components/Stage';
import { ease, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

type Kind = 'kw' | 'str' | 'fn' | 'tag' | 'attr' | 'p';
type Line = [string, Kind][];
const CODE: Line[] = [
  [['import', 'kw'], [' { ', 'p'], ['AIPromptInput', 'fn'], [' } ', 'p'], ['from', 'kw'], [' ', 'p'], ["'@/components/ai-prompt-input'", 'str'], [';', 'p']],
  [['import', 'kw'], [' { ', 'p'], ['useStream', 'fn'], [' } ', 'p'], ['from', 'kw'], [' ', 'p'], ["'@/lib/use-stream'", 'str'], [';', 'p']],
  [],
  [['export', 'kw'], [' ', 'p'], ['function', 'kw'], [' ', 'p'], ['Chat', 'fn'], ['() {', 'p']],
  [['  ', 'p'], ['const', 'kw'], [' { messages, send, busy } = ', 'p'], ['useStream', 'fn'], ['(', 'p'], ["'/api/chat'", 'str'], [');', 'p']],
  [],
  [['  ', 'p'], ['return', 'kw'], [' (', 'p']],
  [['    <', 'p'], ['Thread', 'tag'], [' ', 'p'], ['messages', 'attr'], ['={messages}>', 'p']],
  [['      <', 'p'], ['AIPromptInput', 'tag'], [' ', 'p'], ['onSubmit', 'attr'], ['={send} ', 'p'], ['busy', 'attr'], ['={busy} />', 'p']],
  [['    </', 'p'], ['Thread', 'tag'], ['>', 'p']],
  [['  );', 'p']],
  [['}', 'p']],
]; // prettier-ignore
const COLOR: Record<Kind, string> = { kw: C.code.keyword, str: C.code.string, fn: C.code.fn, tag: C.code.tag, attr: C.code.attr, p: C.code.text };
const TYPED_LINES = 5; // the rest arrives as an AI suggestion
const lineLen = (l: Line) => l.reduce((n, [s]) => n + s.length, 0);

const EX = M;
const EY = 500;
const EW = 936;
const EH = 470;
const FS = 22;
const LH = 33;

/** Editor + terminal: hand-typed intent, AI-suggested completion, typed APIs, live preview. */
export const Build: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end, at } = useScene(scene);
  const typedAt = at(/^typed/, 4.7);
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);
  const winIn = tween(t, [0.15, 0.8]);

  // Hand-typed part.
  const typedChars = CODE.slice(0, TYPED_LINES).reduce((n, l) => n + lineLen(l) + 1, 0);
  const typed = Math.floor(tween(t, [0.5, 2.0], [0, typedChars], ease.linear));
  const ghostAt = 2.1;
  const acceptAt = 2.65;
  const accepted = t >= acceptAt;
  const acceptFlash = tween(t, [acceptAt, acceptAt + 0.5], [1, 0], ease.outQuart) * (accepted ? 1 : 0);

  // Caret position.
  let caretLine = 0;
  let caretCol = 0;
  {
    let left = typed;
    for (let i = 0; i < TYPED_LINES; i++) {
      const len = lineLen(CODE[i]);
      if (left <= len) {
        caretLine = i;
        caretCol = left;
        break;
      }
      left -= len + 1;
      caretLine = i + 1;
      caretCol = 0;
    }
    if (accepted) {
      caretLine = CODE.length - 1;
      caretCol = 1;
    }
  }

  const term = [
    { at: 2.95, prompt: true, text: 'pnpm dlx shadcn@latest add sudhanshuxsingh.in/r/ai-prompt-input', dur: 0.55 },
    { at: 3.65, text: '✔ Added components/ai-prompt-input.tsx', color: C.green },
    { at: 3.95, prompt: true, text: 'pnpm dev', dur: 0.2 },
    { at: 4.3, text: '▲ Next.js · Local: http://localhost:3000', color: C.text },
    { at: 4.55, text: '✓ Ready', color: C.green },
  ];

  const hover = pop(t, fps, typedAt, { damping: 16 });
  const hoverOut = tween(t, [typedAt + 0.95, typedAt + 1.2]);
  const preview = pop(t, fps, typedAt + 1.1, { damping: 14 });
  const placeholder = 'Summarize this thread';
  const typedPrompt = placeholder.slice(0, Math.floor(tween(t, [typedAt + 1.4, typedAt + 2.1], [0, placeholder.length], ease.linear)));

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <ChapterHeader t={t} fps={fps} index={3} label="BUILD" kanji="構築" line="End to end, fully typed." exit={end - 0.4} />

      <div style={{ position: 'absolute', inset: 0, opacity: winIn * (1 - out), transform: `translateY(${(1 - winIn) * 50 - out * 30}px)` }}>
        <Window x={EX} y={EY} w={EW} h={EH} title={<span><span style={{ color: C.text }}>chat.tsx</span> — app/(chat)</span>} accent={C.red}>
          <div style={{ position: 'absolute', left: 0, top: 18, width: 58, textAlign: 'right', fontFamily: F.mono, fontSize: FS - 2, lineHeight: `${LH}px`, color: '#3B3B44' }}>
            {CODE.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 82, top: 18, right: 20, fontFamily: F.mono, fontSize: FS, lineHeight: `${LH}px`, whiteSpace: 'pre' }}>
            {CODE.map((line, li) => {
              let budget = Infinity;
              let ghost = false;
              if (li < TYPED_LINES) {
                const before = CODE.slice(0, li).reduce((n, l) => n + lineLen(l) + 1, 0);
                budget = Math.max(0, typed - before);
              } else {
                ghost = !accepted;
                if (t < ghostAt) budget = 0;
              }
              let used = 0;
              return (
                <div key={li} style={{ height: LH, position: 'relative', background: ghost || li < TYPED_LINES ? undefined : `rgba(126,231,135,${acceptFlash * 0.12})` }}>
                  {line.map(([text, kind], ti) => {
                    const show = text.slice(0, Math.max(0, budget - used));
                    used += text.length;
                    return (
                      <span key={ti} style={{ color: ghost ? '#4A4A55' : COLOR[kind], fontStyle: ghost ? 'italic' : undefined }}>
                        {show}
                      </span>
                    );
                  })}
                  {li === caretLine && (
                    <span style={{ position: 'absolute', left: caretCol * FS * 0.6, top: 4, width: 3, height: LH - 8, background: C.red, opacity: Math.floor(t * 2.5) % 2 ? 1 : 0.2 }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Tab-to-accept hint */}
          {t > ghostAt && t < acceptAt + 0.25 && (
            <div
              style={{
                position: 'absolute',
                left: 82 + 26 * FS * 0.6,
                top: 18 + 6 * LH + 2,
                padding: '4px 12px',
                borderRadius: 8,
                background: withAlpha('#7C8CFF', 0.18),
                border: '1.5px solid #7C8CFF',
                color: '#C9CFFF',
                fontFamily: F.mono,
                fontSize: 18,
                transform: `scale(${pop(t, fps, ghostAt + 0.05)})`,
              }}
            >
              ⇥ Tab · AI suggestion
            </div>
          )}
          {/* Type hover card */}
          {hover > 0 && hoverOut < 1 && (
            <div
              style={{
                position: 'absolute',
                left: 82 + 17 * FS * 0.6,
                top: 18 + 5 * LH + 6,
                width: 470,
                padding: '16px 20px',
                borderRadius: 14,
                background: '#16161C',
                border: `1.5px solid ${C.lineStrong}`,
                boxShadow: '0 24px 50px rgba(0,0,0,0.6)',
                fontFamily: F.mono,
                fontSize: 19,
                lineHeight: '30px',
                color: C.code.text,
                transform: `scale(${0.92 + hover * 0.08})`,
                transformOrigin: '0 0',
                opacity: hover * (1 - hoverOut),
                whiteSpace: 'pre',
              }}
            >
              <span style={{ color: C.code.keyword }}>function</span> <span style={{ color: C.code.fn }}>useStream</span>(url: <span style={{ color: C.code.string }}>`/api/${'{'}string{'}'}`</span>): {'{\n'}
              {'  '}messages: <span style={{ color: C.code.type }}>Message</span>[];{'\n'}
              {'  '}send: (text: <span style={{ color: C.code.type }}>string</span>) {'=>'} <span style={{ color: C.code.type }}>void</span>;{'\n'}
              {'  '}busy: <span style={{ color: C.code.type }}>boolean</span>;{'\n'}
              {'}'}
            </div>
          )}
        </Window>

        <Window x={EX} y={EY + EH + 22} w={EW} h={268} title="zsh — ~/www" bar={48}>
          <div style={{ position: 'absolute', left: 24, top: 16, right: 24, fontFamily: F.mono, fontSize: 21, lineHeight: '36px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {term.map((l, i) => {
              if (t < l.at) return null;
              const text = l.prompt ? l.text.slice(0, Math.floor(tween(t, [l.at, l.at + (l.dur ?? 0.3)], [0, l.text.length], ease.linear))) : l.text;
              return (
                <div key={i} style={{ color: l.color ?? C.code.text }}>
                  {l.prompt && <span style={{ color: C.red }}>❯ </span>}
                  {text}
                </div>
              );
            })}
          </div>
        </Window>

        {/* Live preview of the real registry component */}
        {preview > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 300,
              top: EY + EH - 140,
              width: 690,
              padding: 22,
              borderRadius: 24,
              background: '#0C0C10',
              border: `1.5px solid ${C.lineStrong}`,
              boxShadow: `0 40px 80px rgba(0,0,0,0.7), ${glow(C.red, 30, 0.12)}`,
              transform: `translateY(${(1 - preview) * 40}px) scale(${0.95 + preview * 0.05})`,
              opacity: Math.min(1, preview * 1.3),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 17, color: C.mute, marginBottom: 16 }}>
              <span>localhost:3000</span>
              <span style={{ color: C.green }}>● live preview</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: 70, borderRadius: 18, border: `1.5px solid ${withAlpha(C.red, 0.6)}`, boxShadow: `0 0 0 4px ${withAlpha(C.red, 0.12)}`, padding: '0 10px 0 24px', background: '#121217' }}>
              <span style={{ flex: 1, fontFamily: F.sans, fontSize: 24, color: typedPrompt ? C.text : C.mute }}>
                {typedPrompt || 'Ask anything…'}
                <span style={{ display: 'inline-block', width: 2, height: 26, marginLeft: 2, background: C.text, verticalAlign: 'middle', opacity: Math.floor(t * 2.5) % 2 }} />
              </span>
              <span style={{ width: 50, height: 50, borderRadius: 14, background: C.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, boxShadow: glow(C.red, 14, 0.5) }}>↑</span>
            </div>
          </div>
        )}
      </div>

      <Sfx name="typing-3s" at={0.45} volume={0.5} dur={1.6} />
      <Sfx name="pop" at={ghostAt + 0.05} volume={0.4} />
      <Sfx name="click" at={acceptAt} volume={0.55} />
      <Sfx name="shimmer" at={acceptAt} volume={0.25} />
      <Sfx name="typing-3s" at={2.9} volume={0.3} rate={1.3} dur={0.65} />
      <Sfx name="typing-3s" at={3.95} volume={0.3} rate={1.3} dur={0.25} />
      <Sfx name="success" at={3.65} volume={0.35} />
      <Sfx name="notify" at={4.55} volume={0.4} />
      <Sfx name="pop-hi" at={typedAt} volume={0.45} />
      <Sfx name="whoosh-fast" at={typedAt + 0.95} volume={0.4} />
    </AbsoluteFill>
  );
};
