import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { display } from './theme';

const WORDS = ['MOST', 'SOFTWARE', 'VERY LITTLE', 'OF IT', 'LIKE ANYTHING.', 'I BUILD', 'THE', 'KIND.', 'SUDHANSHU', 'SINGH', 'GEN-AI', 'UI', 'UX', 'TASTE', 'FULL-STACK', 'DEVELOPER', 'PROMPT', 'PRODUCT', 'SHIP', 'DETAILS', 'INTERFACES', 'MOTION', 'LET’S BUILD', 'SOMETHING', 'PEOPLE', 'RAG'];
const AXES: [number, number][] = [[62, 900], [72, 900], [100, 900], [125, 900], [100, 800]];

/** Dev-only: measures Archivo widths at 100px for layout tuning. */
export const Calibrate: React.FC = () => {
  const [rows, setRows] = useState<string[]>([]);
  const [handle] = useState(() => delayRender('measure'));
  useEffect(() => {
    document.fonts.ready.then(() => {
      const c = document.createElement('canvas').getContext('2d')!;
      const out: string[] = [];
      for (const [wdth, wght] of AXES) {
        const span = document.createElement('span');
        Object.assign(span.style, { position: 'absolute', visibility: 'hidden', fontSize: '100px', whiteSpace: 'pre', letterSpacing: '0' }, display(wdth, wght));
        document.body.appendChild(span);
        const line = WORDS.map((w) => {
          span.textContent = w;
          return `${w}=${Math.round(span.getBoundingClientRect().width)}`;
        });
        out.push(`w${wdth}/${wght}: ${line.join(' ')}`);
        span.remove();
      }
      void c;
      setRows(out);
      continueRender(handle);
    });
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: '#fff', color: '#000', fontFamily: 'monospace', fontSize: 15, padding: 20, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
      {rows.join('\n\n')}
    </AbsoluteFill>
  );
};
