import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Character } from '../components/Character';
import { CornerMarks, Grain, Rails, Vignette } from '../components/core';
import { Sun } from '../components/Stage';
import { F } from '../lib/fonts';
import { C, M, glow } from '../lib/theme';

const HORIZON = 1130;

/** Poster frame for Reels/Shorts covers; key content sits inside the 4:5 grid crop. */
export const Cover: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: HORIZON, overflow: 'hidden' }}>
      <Sun cx={540} cy={HORIZON - 120} r={380} t={0.4} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: HORIZON, height: 2, background: `linear-gradient(90deg, transparent, ${C.redHot}, transparent)`, boxShadow: glow(C.red, 18, 0.6) }} />
    <Rails />
    <Character frame="haki-a" x={540} y={HORIZON + 6} scale={1.05} reflection={0.2} filter={`drop-shadow(0 0 30px rgba(255,42,31,0.55))`} />
    <div style={{ position: 'absolute', left: M, right: M, top: 330, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 26, letterSpacing: '0.24em', color: C.dim }}>
      <span>SHOWREEL</span>
      <span style={{ color: C.red }}>’26</span>
    </div>
    <div style={{ position: 'absolute', right: 70, top: 420, writingMode: 'vertical-rl', fontFamily: F.jp, fontWeight: 900, fontSize: 60, letterSpacing: '0.3em', color: C.red, textShadow: glow(C.red, 18, 0.5) }}>天照大神</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1190, textAlign: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 138, lineHeight: 0.98, letterSpacing: '-0.045em', color: C.text }}>
      SUDHANSHU
      <br />
      SINGH
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1490, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: '0.2em', color: C.text }}>
      FULL-STACK <span style={{ color: C.red }}>GEN-AI</span> DEVELOPER
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1548, textAlign: 'center', fontFamily: F.serif, fontStyle: 'italic', fontSize: 44, color: C.dim }}>interfaces × intelligence × taste</div>
    <CornerMarks />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);
