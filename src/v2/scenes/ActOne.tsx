import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Portrait, type Face } from '../../components/Character';
import { ease, pop, tween } from '../../lib/anim';
import { useHits } from '../grid';
import { fit } from '../metrics';
import { display, K, mono, serif } from '../theme';
import { Boil, held } from '../components/stop';
import { Rise } from '../components/type';

const COL = 952;
const X = 64;

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, fps, frame };
};

/** One word set to fill `target` px exactly on Archivo's width axis. */
export function FitWord({ word, wdth, color, target = COL, size, style }: { word: string; wdth: number; color: string; target?: number; size?: number; style?: React.CSSProperties }) {
  const fs = size ?? fit(word, wdth, target);
  return (
    <div style={{ ...display(wdth, 900), fontSize: fs, lineHeight: 0.8, letterSpacing: '-0.01em', color, whiteSpace: 'pre', ...style }}>
      {word}
    </div>
  );
}

const slot = (word: string, wdth: number, target = COL) => Math.ceil(fit(word, wdth, target) * 0.8) + 4;

// --- Intro: the song (from 0:30) opens on a drum fill --------------------------------------

/** The fill's two hits, then the crash at 0.67 s cuts to line one. */
const FILL = [0.3, 0.5];

export const Intro: React.FC = () => {
  const { t } = useT();
  return (
    <AbsoluteFill style={{ background: K.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Boil seed={11} amount={1.4}>
        <div style={{ ...serif, fontSize: 230, color: K.paper, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ opacity: t >= FILL[0] ? 1 : 0 }}>Show</span>
          <span style={{ opacity: t >= FILL[1] ? 1 : 0, color: K.blue }}>reel</span>
        </div>
      </Boil>
    </AbsoluteFill>
  );
};

// --- Three lines of conviction -----------------------------------------------------------


export const LineOne: React.FC = () => {
  const { t } = useT();
  const { b } = useHits();
  const L1 = { software: b(1), works: b(2) };
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <div style={{ position: 'absolute', left: X, top: 690 }}>
        <Boil seed={21}>
          <Rise t={t} at={0} height={slot('MOST', 125)} dur={0.3}>
            <FitWord word="MOST" wdth={125} color={K.paper} />
          </Rise>
        </Boil>
        <Boil seed={22}>
          <Rise t={t} at={L1.software} height={slot('SOFTWARE', 62)} dur={0.3}>
            <FitWord word="SOFTWARE" wdth={62} color={K.paper} />
          </Rise>
        </Boil>
        <Boil seed={23} style={{ textAlign: 'right' }}>
          <Rise t={t} at={L1.works} height={300} dur={0.3}>
            <div style={{ ...serif, fontSize: 290, lineHeight: 1, color: K.blue, letterSpacing: '-0.03em', paddingRight: 8 }}>works.</div>
          </Rise>
        </Boil>
      </div>
    </AbsoluteFill>
  );
};

export const LineTwo: React.FC = () => {
  const { t, fps } = useT();
  const { b } = useHits();
  const L2 = { ofIt: b(1), feels: b(2), like: b(3) };
  const feels = pop(t, fps, L2.feels, { damping: 9, stiffness: 200 });
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <div style={{ position: 'absolute', left: X, top: 560, width: COL }}>
        <Boil seed={31}>
          <Rise t={t} at={0} height={slot('VERY LITTLE', 72)} dur={0.3}>
            <FitWord word="VERY LITTLE" wdth={72} color={K.ink} />
          </Rise>
        </Boil>
        <Boil seed={32}>
          <Rise t={t} at={L2.ofIt} height={slot('VERY LITTLE', 72)} dur={0.3}>
            <FitWord word="OF IT" wdth={100} color={K.ink} size={fit('VERY LITTLE', 72, COL)} />
          </Rise>
        </Boil>
        <Boil seed={33} style={{ textAlign: 'center', height: 400 }}>
          <div style={{ ...serif, fontSize: 420, lineHeight: 0.95, color: K.blue, letterSpacing: '-0.03em', transform: `scale(${held(feels, 6)}) rotate(${(1 - held(feels, 6)) * -6}deg)`, opacity: feels > 0.02 ? 1 : 0 }}>feels</div>
        </Boil>
        <Boil seed={34}>
          <Rise t={t} at={L2.like} height={slot('LIKE ANYTHING.', 62)} dur={0.3}>
            <FitWord word="LIKE ANYTHING." wdth={62} color={K.ink} />
          </Rise>
        </Boil>
      </div>
    </AbsoluteFill>
  );
};

export const LineThree: React.FC = () => {
  const { t } = useT();
  const { b } = useHits();
  const L3 = { the: b(1), second: b(2), kind: b(3) };
  // Bar two of the phrase: the line holds and slowly pushes in toward the drop.
  const tension = tween(t, [b(4), b(8)], [0, 1], ease.inOutCubic);
  const amt = 1;
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <div style={{ position: 'absolute', left: X, top: 600, width: COL, transform: `scale(${1 + tension * 0.06})`, transformOrigin: '50% 40%' }}>
        <Boil seed={41} amount={amt}>
          <Rise t={t} at={0} height={slot('I BUILD', 125)} dur={0.3}>
            <FitWord word="I BUILD" wdth={125} color={K.paper} />
          </Rise>
        </Boil>
        <Boil seed={42} amount={amt}>
          <Rise t={t} at={L3.the} height={slot('I BUILD', 125)} dur={0.3}>
            <FitWord word="THE" wdth={125} color={K.paper} size={fit('I BUILD', 125, COL)} />
          </Rise>
        </Boil>
        <Boil seed={43} amount={amt} style={{ textAlign: 'right' }}>
          <Rise t={t} at={L3.second} height={330} dur={0.3}>
            <div style={{ ...serif, fontSize: 330, lineHeight: 0.98, color: K.blue, letterSpacing: '-0.03em' }}>second</div>
          </Rise>
        </Boil>
        <Boil seed={44} amount={amt}>
          <Rise t={t} at={L3.kind} height={slot('I BUILD', 125)} dur={0.3}>
            <FitWord word="KIND." wdth={125} color={K.paper} size={fit('I BUILD', 125, COL)} />
          </Rise>
        </Boil>
      </div>
    </AbsoluteFill>
  );
};

// --- The name ------------------------------------------------------------------------------

export const Name: React.FC = () => {
  const { t } = useT();
  const { b } = useHits();
  const singhAt = b(2);
  const first = 'SUDHANSHU';
  const sizeA = fit(first, 62, COL);
  const sizeB = fit('SINGH', 125, COL);
  const smear = tween(t, [singhAt, singhAt + 0.2], [1, 0], ease.outQuart);
  const meta = tween(t, [b(4), b(4) + 0.3]);
  return (
    <AbsoluteFill style={{ background: K.blue }}>
      <div style={{ position: 'absolute', left: X, top: 720, width: COL }}>
        {/* One letter per exposure, like cutouts placed by hand */}
        <Boil seed={51}>
          <div style={{ ...display(62, 900), fontSize: sizeA, lineHeight: 0.8, letterSpacing: '-0.01em', color: K.paper, display: 'flex', height: sizeA * 0.8 + 4, overflow: 'visible' }}>
            {[...first].map((ch, i) => {
              const shown = t >= i * 0.1;
              return (
                <span key={i} style={{ opacity: shown ? 1 : 0, display: 'inline-block' }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </Boil>
        <Boil seed={52}>
          <div
            style={{
              ...display(125, 900),
              fontSize: sizeB,
              lineHeight: 0.8,
              letterSpacing: '-0.01em',
              color: K.paper,
              marginTop: 18,
              opacity: t >= singhAt ? 1 : 0,
              transform: `translateX(${held(smear, 3) * 160}px) scaleX(${1 + held(smear, 3) * 0.35})`,
              transformOrigin: '0 50%',
            }}
          >
            SINGH
          </div>
        </Boil>
        <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: held(meta, 2) }}>
          <span style={{ ...mono, fontSize: 24, color: K.paper }}>Full-stack · Gen-AI · Developer</span>
          <span style={{ ...serif, fontSize: 46, color: K.paper }}>Kolkata, India</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- The face: its own frame, a hand-moved sticker ------------------------------------------

/** Sparkles land on beats 3, 4, 6 and 7 of the phrase. */
const SPARKS: { x: number; y: number; size: number; at: number }[] = [
  { x: 170, y: 560, size: 70, at: 2 },
  { x: 900, y: 470, size: 54, at: 3 },
  { x: 930, y: 1010, size: 84, at: 5 },
  { x: 140, y: 1090, size: 58, at: 6 },
];

function Spark({ size, spin }: { size: number; spin: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" style={{ transform: `rotate(${spin}deg)` }}>
      <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill={K.blue} />
    </svg>
  );
}

export const FaceFrame: React.FC = () => {
  const { t } = useT();
  const { b } = useHits();
  const SIZE = 540;
  // Steady: a single pop on the downbeat, then it stays put.
  const popK = tween(t, [0, 0.3], [0, 1], ease.linear);
  const popScale = popK < 1 ? [0, 1.08, 1][Math.min(2, Math.floor(popK * 3))] : 1;
  const step = Math.floor(t * 10);
  const face: Face = t >= b(7) && t < b(7) + 0.4 ? 'wink' : t >= b(4) ? 'happy' : 'smile';
  const caption = held(tween(t, [b(1), b(1) + 0.2]), 2);
  const hi = tween(t, [b(4), b(4) + 0.2]);
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', ...mono, fontSize: 24, color: K.ink, opacity: caption }}>
        ↓ The human behind the pixels
      </div>
      <div
        style={{
          position: 'absolute',
          left: 540 - SIZE / 2,
          top: 420,
          transform: `scale(${popScale})`,
          transformOrigin: '50% 95%',
          filter: `drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 8px 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(0 22px 0 rgba(14,14,16,0.18))`,
        }}
      >
        <Portrait face={face} size={SIZE} />
      </div>
      {SPARKS.map((p, i) => {
        const on = t >= b(p.at);
        const k = tween(t, [b(p.at), b(p.at) + 0.2]);
        return on ? (
          <div key={i} style={{ position: 'absolute', left: p.x - p.size / 2, top: p.y - p.size / 2, transform: `scale(${held(k, 2) * 1.0})` }}>
            <Spark size={p.size} spin={(Math.floor(step / 3) * 15 + i * 40) % 360} />
          </div>
        ) : null;
      })}
      <Boil seed={81} style={{ position: 'absolute', left: 0, right: 0, top: 1150, textAlign: 'center' }}>
        <Rise t={t} at={b(1)} height={150} dur={0.3}>
          <div style={{ ...serif, fontSize: 132, color: K.ink, lineHeight: 1.05, opacity: hi > 0 ? 1 : 0 }}>
            hi, that’s <span style={{ color: K.blue }}>me.</span>
          </div>
        </Rise>
      </Boil>
    </AbsoluteFill>
  );
};

// --- What I am: four flashes, then the lockup ------------------------------------------------

/** Four flashes on consecutive eighth notes (h(0)…h(3)), the lockup on beat 3. */
const FLASHES: { word: string; wdth: number; bg: string; color: string }[] = [
  { word: 'GEN-AI', wdth: 62, bg: K.blue, color: K.paper },
  { word: 'UI', wdth: 125, bg: K.ink, color: K.blue },
  { word: 'UX', wdth: 125, bg: K.paper, color: K.ink },
  { word: 'TASTE', wdth: 100, bg: K.lime, color: K.ink },
];

export const Role: React.FC = () => {
  const { t } = useT();
  const { b } = useHits();
  const lock = b(4);
  const flashAt = (i: number) => b(i);
  if (t < lock) {
    const fi = Math.max(0, [0, 1, 2, 3].filter((i) => t >= flashAt(i)).pop() ?? 0);
    const f = FLASHES[fi];
    const k = tween(t, [flashAt(fi), flashAt(fi) + 0.12], [0, 1], ease.outQuart);
    return (
      <AbsoluteFill style={{ background: f.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Boil seed={60 + fi} amount={1.6}>
          <div style={{ transform: `scale(${1.08 - held(k, 2) * 0.08})` }}>
            <FitWord word={f.word} wdth={f.wdth} color={f.color} target={1000} style={{ textAlign: 'center' }} />
          </div>
        </Boil>
      </AbsoluteFill>
    );
  }
  const lines: { word: string; color: string }[] = [
    { word: 'FULL-STACK', color: K.paper },
    { word: 'GEN-AI', color: K.blue },
    { word: 'DEVELOPER', color: K.paper },
  ];
  const size = fit('FULL-STACK', 62, COL);
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <div style={{ position: 'absolute', left: X, top: 640, width: COL }}>
        {lines.map((l, i) => (
          <Boil key={l.word} seed={70 + i}>
            <Rise t={t} at={lock + i * 0.2} height={Math.ceil(size * 0.8) + 6} dur={0.3}>
              <FitWord word={l.word} wdth={62} color={l.color} size={l.word === 'GEN-AI' ? size : fit(l.word, 62, COL)} />
            </Rise>
          </Boil>
        ))}
        <Boil seed={74} style={{ marginTop: 30 }}>
          <Rise t={t} at={b(5)} height={90} dur={0.3}>
            <div style={{ ...serif, fontSize: 78, color: K.paper, lineHeight: 1.1 }}>
              with taste for <span style={{ color: K.blue }}>UI &amp; UX.</span>
            </div>
          </Rise>
        </Boil>
      </div>
    </AbsoluteFill>
  );
};
