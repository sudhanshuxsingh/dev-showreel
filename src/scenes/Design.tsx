import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../Showreel';
import { Rails, Sfx } from '../components/core';
import { ChapterHeader } from '../components/Stage';
import { ease, pop, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M, glow, withAlpha } from '../lib/theme';
import { useScene } from '../lib/timeline';

const PX = 365;
const PY = 500;
const PW = 350;
const PH = 740;
const COL_W = 268;
const LEFT = M;
const RIGHT = 1080 - M - COL_W;

function Card({ x, y, h, label, k, children }: { x: number; y: number; h: number; label: string; k: number; children: React.ReactNode }) {
  if (k <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: COL_W,
        height: h,
        borderRadius: 22,
        background: C.panel,
        border: `1.5px solid ${C.lineStrong}`,
        padding: 22,
        boxSizing: 'border-box',
        opacity: Math.min(1, k * 1.4),
        transform: `translateY(${(1 - k) * 30}px) scale(${0.94 + k * 0.06})`,
        overflow: 'hidden',
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: '0.18em', color: C.mute }}>{label}</div>
      {children}
    </div>
  );
}

const ease16 = (x: number) => {
  // cubic-bezier(0.16, 1, 0.3, 1) sampled by Newton steps on x.
  let u = x;
  for (let i = 0; i < 6; i++) {
    const bx = 3 * (1 - u) * (1 - u) * u * 0.16 + 3 * (1 - u) * u * u * 0.3 + u * u * u;
    const dx = 3 * (1 - u) * (1 - u) * 0.16 + 6 * (1 - u) * u * (0.3 - 0.16) + 3 * u * u * (1 - 0.3);
    u -= (bx - x) / (dx || 1);
    u = Math.min(1, Math.max(0, u));
  }
  return 3 * (1 - u) * (1 - u) * u * 1 + 3 * (1 - u) * u * u * 1 + u * u * u;
};

function Wireframe() {
  const block = (style: React.CSSProperties) => <div style={{ position: 'absolute', background: '#24242B', borderRadius: 12, ...style }} />;
  return (
    <>
      {block({ left: 22, top: 20, width: 70, height: 14 })}
      {block({ left: 22, top: 58, width: 46, height: 46, borderRadius: 23 })}
      {block({ left: 82, top: 64, width: 140, height: 16 })}
      {block({ left: 82, top: 88, width: 90, height: 12 })}
      {block({ left: 120, top: 150, width: 186, height: 70, borderRadius: 18 })}
      {block({ left: 22, top: 240, width: 250, height: 200, borderRadius: 18 })}
      {[0, 1, 2].map((i) => block({ left: 44, top: 290 + i * 44, width: 180 - i * 30, height: 14, background: '#2E2E36' }))}
      {block({ left: 18, top: 612, width: 270, height: 58, borderRadius: 29 })}
      {block({ left: 248, top: 616, width: 50, height: 50, borderRadius: 25, background: '#2E2E36' })}
      <div style={{ position: 'absolute', left: 22, top: 240, width: 250, height: 200, borderRadius: 18, overflow: 'hidden' }}>
        <svg width={250} height={200} style={{ position: 'absolute', inset: 0 }}>
          <line x1={0} y1={0} x2={250} y2={200} stroke="#33333C" strokeWidth={2} />
          <line x1={250} y1={0} x2={0} y2={200} stroke="#33333C" strokeWidth={2} />
        </svg>
      </div>
    </>
  );
}

function HiFi({ t, motionAt }: { t: number; motionAt: number }) {
  const send = 1 + 0.12 * Math.sin(Math.max(0, t - motionAt) * 9) * Math.exp(-Math.max(0, t - motionAt) * 2.4);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#111116, #0A0A0D)', fontFamily: F.sans, color: C.text }}>
      <div style={{ position: 'absolute', left: 22, right: 22, top: 16, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ letterSpacing: 3 }}>▴ ◼</span>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, top: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: 23, background: `radial-gradient(circle at 35% 30%, ${C.redHot}, ${C.redDeep})`, boxShadow: glow(C.red, 12, 0.5), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✦</span>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>Haki</div>
          <div style={{ fontSize: 13, color: C.dim }}>AI assistant · online</div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 22, top: 150, maxWidth: 210, padding: '14px 16px', borderRadius: '18px 18px 6px 18px', background: C.red, fontSize: 16, lineHeight: 1.35, fontWeight: 500 }}>
        Plan my week around deep work.
      </div>
      <div style={{ position: 'absolute', left: 22, top: 240, width: 262, padding: '16px 18px', borderRadius: '18px 18px 18px 6px', background: '#1A1A20', border: `1px solid ${C.line}`, fontSize: 15, lineHeight: 1.4 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>A calmer week</div>
        {['Mon–Wed · 9–12 focus', 'Thu · batch meetings', 'Fri · ship + review'].map((r, i) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, color: i === 0 ? C.text : C.dim }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${i === 0 ? C.red : C.mute}`, background: i === 0 ? C.red : 'transparent' }} />
            {r}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 18, right: 18, top: 612, height: 58, borderRadius: 29, background: '#17171C', border: `1px solid ${C.lineStrong}`, display: 'flex', alignItems: 'center', padding: '0 8px 0 22px', boxSizing: 'border-box' }}>
        <span style={{ flex: 1, fontSize: 16, color: C.mute }}>Ask anything…</span>
        <span style={{ width: 42, height: 42, borderRadius: 21, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, transform: `scale(${send})`, boxShadow: glow(C.red, 10 + (send - 1) * 120, 0.5) }}>↑</span>
      </div>
    </div>
  );
}

/** Wireframe → high fidelity, wrapped in the system that makes it: type, tokens, spacing, motion. */
export const Design: React.FC<SceneProps> = ({ scene }) => {
  const { t, fps, end, at } = useScene(scene);
  const systemAt = at(/^system/, 1.7);
  const screensAt = at(/^screens/, 2.8);
  const typeAt = at(/^Type/, 3.7);
  const spacingAt = at(/^spacing/, 4.1);
  const motionAt = at(/^motion/, 4.6);
  const pixelAt = at(/^pixel/, 5.9);

  const phoneIn = pop(t, fps, 0.25, { damping: 18, stiffness: 120 });
  const wipe = tween(t, [screensAt - 0.1, screensAt + 0.45], [0, 1], ease.inOutQuint);
  const out = tween(t, [end - 0.35, end], [0, 1], ease.inOutCubic);
  const grid = Math.min(tween(t, [pixelAt - 0.2, pixelAt + 0.2]), 1 - tween(t, [pixelAt + 1.0, pixelAt + 1.5]));
  const sel = tween(t, [typeAt, typeAt + 0.25]);
  const red = tween(t, [spacingAt, spacingAt + 0.3]);
  const loop = ((t - motionAt) % 1.4) / 1.1;
  const dotK = t > motionAt ? ease16(Math.min(1, Math.max(0, loop))) : 0;

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <Rails />
      <ChapterHeader t={t} fps={fps} index={2} label="DESIGN" kanji="設計" line="Systems, not screens." exit={end - 0.4} />

      <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${-out * 30}px)` }}>
        {/* Phone */}
        <div style={{ position: 'absolute', left: PX, top: PY, width: PW, height: PH, transform: `translateY(${(1 - phoneIn) * 120}px) scale(${0.9 + phoneIn * 0.1})`, opacity: phoneIn }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 54, background: '#1B1B21', boxShadow: '0 50px 90px rgba(0,0,0,0.6), inset 0 0 0 2px #2A2A31' }} />
          <div style={{ position: 'absolute', left: 10, top: 10, right: 10, bottom: 10, borderRadius: 44, overflow: 'hidden', background: '#0D0D10' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: PW - 20, height: PH - 20 }}>
              <Wireframe />
            </div>
            <div style={{ position: 'absolute', left: 0, top: 0, width: PW - 20, height: PH - 20, clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0)` }}>
              <HiFi t={t} motionAt={motionAt} />
            </div>
            {wipe > 0 && wipe < 1 && <div style={{ position: 'absolute', left: 0, right: 0, top: `${wipe * 100}%`, height: 3, background: C.red, boxShadow: glow(C.red, 14, 0.9) }} />}
            {/* 8pt grid */}
            {grid > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: grid,
                  backgroundImage: `linear-gradient(${withAlpha(C.red, 0.35)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(C.red, 0.35)} 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                }}
              />
            )}
          </div>
          <div style={{ position: 'absolute', left: PW / 2 - 50, top: 22, width: 100, height: 28, borderRadius: 14, background: '#000' }} />
        </div>

        {/* Annotations on the phone */}
        {sel > 0 && (
          <div style={{ position: 'absolute', left: PX + 10 + 22 - 6, top: PY + 10 + 240 - 6, width: 262 + 12, height: 160, border: `2px solid ${C.red}`, opacity: sel }}>
            {[[-6, -6], [262 + 6, -6], [-6, 154], [262 + 6, 154]].map(([x, y]) => (
              <span key={`${x}${y}`} style={{ position: 'absolute', left: x - 1, top: y - 1, width: 12, height: 12, background: '#fff', border: `2px solid ${C.red}` }} />
            ))}
            <span style={{ position: 'absolute', left: -2, top: -42, padding: '4px 10px', background: C.red, color: '#fff', fontFamily: F.mono, fontSize: 18, whiteSpace: 'nowrap' }}>Title · 17/600</span>
          </div>
        )}
        {red > 0 && (
          <>
            <div style={{ position: 'absolute', left: PX + PW - 50, top: PY + 10 + 150 + 70, width: 2, height: 20 * red, background: C.red }} />
            <span style={{ position: 'absolute', left: PX + PW - 40, top: PY + 10 + 150 + 66, fontFamily: F.mono, fontSize: 20, color: C.red, opacity: red }}>16</span>
            <div style={{ position: 'absolute', left: PX + 10 + 18, top: PY + 10 + 612 + 29, width: 22 * red, height: 2, background: C.red }} />
            <span style={{ position: 'absolute', left: PX + 10 + 22, top: PY + 10 + 612 - 26, fontFamily: F.mono, fontSize: 20, color: C.red, opacity: red }}>24</span>
          </>
        )}
        {grid > 0 && (
          <div style={{ position: 'absolute', left: PX + PW / 2, top: PY + PH / 2 - 120, transform: `translateX(-50%) scale(${0.9 + grid * 0.1})`, padding: '10px 20px', borderRadius: 999, background: C.red, color: '#fff', fontFamily: F.mono, fontSize: 22, opacity: grid, whiteSpace: 'nowrap', boxShadow: `0 20px 40px rgba(0,0,0,0.5), ${glow(C.red, 14, 0.5)}` }}>
            ✓ snapped to 8pt grid
          </div>
        )}

        {/* System cards */}
        <Card x={LEFT} y={520} h={350} label="TYPE" k={pop(t, fps, typeAt, { damping: 15 })}>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 104, letterSpacing: '-0.04em', lineHeight: 1.05, marginTop: 6 }}>Aa</div>
          {[
            ['Display', 34, '48'],
            ['Title', 26, '28'],
            ['Body', 20, '16'],
            ['Mono', 17, '13'],
          ].map(([name, size, label]) => (
            <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, fontFamily: name === 'Mono' ? F.mono : F.sans, fontSize: size as number, color: C.text }}>
              <span>{name}</span>
              <span style={{ fontFamily: F.mono, fontSize: 16, color: C.mute }}>{label}</span>
            </div>
          ))}
        </Card>
        <Card x={LEFT} y={890} h={350} label="TOKENS" k={pop(t, fps, systemAt, { damping: 15 })}>
          {[
            ['ink', C.ink],
            ['paper', C.text],
            ['haki', C.red],
            ['zinc', C.dim],
            ['signal', C.green],
          ].map(([name, hex]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, fontFamily: F.mono, fontSize: 19 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: hex, border: `1.5px solid ${C.lineStrong}` }} />
              <span style={{ color: C.text, flex: 1 }}>{name}</span>
              <span style={{ color: C.mute, fontSize: 15 }}>{hex.toUpperCase()}</span>
            </div>
          ))}
        </Card>
        <Card x={RIGHT} y={520} h={350} label="SPACING · 8PT" k={pop(t, fps, spacingAt, { damping: 15 })}>
          {[4, 8, 16, 24, 32, 48].map((v, i) => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: i ? 12 : 20 }}>
              <span style={{ width: 36, fontFamily: F.mono, fontSize: 18, color: C.mute }}>{v}</span>
              <span style={{ height: 18, width: v * 3.4 * tween(t, [spacingAt + i * 0.05, spacingAt + 0.4 + i * 0.05]), background: i === 2 ? C.red : withAlpha(C.text, 0.8), borderRadius: 3 }} />
            </div>
          ))}
        </Card>
        <Card x={RIGHT} y={890} h={350} label="MOTION" k={pop(t, fps, motionAt, { damping: 15 })}>
          <svg width={224} height={170} style={{ marginTop: 14, overflow: 'visible' }}>
            <rect x={0} y={0} width={224} height={170} fill="none" stroke={C.line} />
            <path
              d={`M0 170 ${Array.from({ length: 41 }, (_, i) => {
                const x = i / 40;
                return `L${(x * 224).toFixed(1)} ${(170 - ease16(x) * 170).toFixed(1)}`;
              }).join(' ')}`}
              fill="none"
              stroke={C.red}
              strokeWidth={3}
            />
            <circle cx={Math.min(1, Math.max(0, loop)) * 224} cy={170 - dotK * 170} r={9} fill="#fff" stroke={C.red} strokeWidth={3} />
          </svg>
          <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 17, color: C.dim }}>ease-out-expo · 320ms</div>
        </Card>
      </div>

      <Sfx name="whoosh-fast" at={0.2} volume={0.4} />
      <Sfx name="swish" at={screensAt - 0.05} volume={0.6} />
      <Sfx name="pop" at={systemAt} volume={0.5} />
      <Sfx name="pop-hi" at={typeAt} volume={0.5} />
      <Sfx name="click" at={typeAt + 0.05} volume={0.4} />
      <Sfx name="pop" at={spacingAt} volume={0.5} />
      <Sfx name="toggle" at={motionAt} volume={0.5} />
      <Sfx name="scan" at={pixelAt - 0.2} volume={0.35} />
    </AbsoluteFill>
  );
};
