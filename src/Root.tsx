import React from 'react';
import { Composition, Folder, Still } from 'remotion';
import { Showreel, type ShowreelProps } from './Showreel';
import { Cover } from './scenes/Cover';
import { Calibrate } from './v2/Calibrate';
import { CoverV2 } from './v2/Cover';
import { Reel, type ReelProps } from './v2/Reel';
import { END, FPS } from './v2/grid';
import { timeline } from './lib/timeline';
import './lib/fonts';

export const RemotionRoot: React.FC = () => (
  <>
    {/* v2 — typography-first, stop-motion, cut to Tame Impala "Loser". */}
    <Composition
      id="Showreel"
      component={Reel}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.round(END * FPS)}
      defaultProps={{ music: true } satisfies ReelProps}
    />
    <Still id="Cover" component={CoverV2} width={1080} height={1920} />
    <Folder name="archive">
      <Still id="CoverV1" component={Cover} width={1080} height={1920} />
      <Composition
        id="ShowreelV1"
        component={Showreel}
        width={1080}
        height={1920}
        fps={timeline.fps}
        durationInFrames={timeline.durationInFrames}
        defaultProps={{ withMusic: false, musicStart: 0 } satisfies ShowreelProps}
      />
      <Still id="Calibrate" component={Calibrate} width={1080} height={1920} />
    </Folder>
  </>
);
