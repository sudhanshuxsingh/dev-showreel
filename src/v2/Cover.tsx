import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Grain } from '../components/core';
import { fit } from './metrics';
import { display, K, mono, serif } from './theme';

const COL = 952;

/** Poster frame (key content inside the 4:5 grid crop): the drop frame, set as a poster. */
export const CoverV2: React.FC = () => (
  <AbsoluteFill style={{ background: K.blue }}>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 330, display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 24, color: K.paper }}>
      <span>Showreel ’26</span>
      <span>Type · Motion · Code</span>
    </div>
    <div style={{ position: 'absolute', left: 64, top: 690, width: COL }}>
      <div style={{ ...display(62, 900), fontSize: fit('SUDHANSHU', 62, COL), lineHeight: 0.8, letterSpacing: '-0.01em', color: K.paper }}>SUDHANSHU</div>
      <div style={{ ...display(125, 900), fontSize: fit('SINGH', 125, COL), lineHeight: 0.8, letterSpacing: '-0.01em', color: K.paper, marginTop: 18 }}>SINGH</div>
      <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...mono, fontSize: 24, color: K.paper }}>Full-stack · Gen-AI · Developer</span>
        <span style={{ ...serif, fontSize: 46, color: K.paper }}>Kolkata, India</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 1420, ...serif, fontSize: 64, color: K.paper, lineHeight: 1.1 }}>
      with taste for <span style={{ color: K.lime }}>UI &amp; UX.</span>
    </div>
    <Grain opacity={0.8} />
  </AbsoluteFill>
);
