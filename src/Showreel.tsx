import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { Grain, MIX, MixContext, SceneOffset, Vignette } from './components/core';
import musicGain from './data/music-gain.json';
import { Hud, Narrator } from './components/Overlay';
import { C } from './lib/theme';
import { music, sceneById, timeline, type SceneInfo } from './lib/timeline';
import { ColdOpen } from './scenes/ColdOpen';
import { Title } from './scenes/Title';
import { Arrival } from './scenes/Arrival';
import { Workflow } from './scenes/Workflow';
import { Think } from './scenes/Think';
import { Design } from './scenes/Design';
import { Build } from './scenes/Build';
import { Intelligence } from './scenes/Intelligence';
import { Ship } from './scenes/Ship';
import { Taste } from './scenes/Taste';
import { Haki } from './scenes/Haki';
import { Outro } from './scenes/Outro';

export type ShowreelProps = {
  /** Use public/audio/music.* over the cold open when present. */
  withMusic: boolean;
  /** Seconds into the song to start from (pick its most cinematic moment). */
  musicStart: number;
  /** Render a single audio stem (for level checks). */
  solo?: 'vo' | 'sfx' | 'bed' | 'music' | null;
};

export type SceneProps = { scene: SceneInfo };

const SCENES: Record<string, React.FC<SceneProps>> = {
  'cold-open': ColdOpen,
  title: Title,
  arrival: Arrival,
  workflow: Workflow,
  think: Think,
  design: Design,
  build: Build,
  intelligence: Intelligence,
  ship: Ship,
  taste: Taste,
  haki: Haki,
  outro: Outro,
};

/** Frames a scene keeps rendering after its slot, so exits can overlap the next entrance. */
const OVERLAP = 12;

function findMusic() {
  return getStaticFiles().find((f) => /^audio\/music\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f.name));
}

export const Showreel: React.FC<ShowreelProps> = ({ withMusic, musicStart, solo = null }) => {
  const { fps } = useVideoConfig();
  // Speech windows drive two duck curves: the score drops ~7.5 dB, effects ~5 dB.
  const lines = timeline.scenes.filter((s) => s.vo).map((s) => [s.vo!.start, s.vo!.start + s.vo!.duration] as const);
  const speaking = (t: number) => {
    let k = 0;
    for (const [a, b] of lines) {
      k = Math.max(k, Math.min(Math.max((t - (a - 0.25)) / 0.25, 0), 1) * Math.min(Math.max((b + 0.4 - t) / 0.4, 0), 1));
    }
    return k;
  };
  const duck = (t: number) => 1 - 0.58 * speaking(t);
  const bus = {
    vo: !solo || solo === 'vo' ? 1 : 0,
    sfx: !solo || solo === 'sfx' ? 1 : 0,
    bed: !solo || solo === 'bed' ? 1 : 0,
    music: !solo || solo === 'music' ? 1 : 0,
    sfxDuck: (t: number) => 1 - 0.45 * speaking(t),
  };
  const track = withMusic ? findMusic() : undefined;
  const arrival = sceneById('arrival');
  const voStart = arrival.vo!.start;
  const musicEnd = voStart + 3.2;


  return (
    <MixContext.Provider value={bus}>
    <AbsoluteFill style={{ background: C.ink }}>
      {timeline.scenes.map((scene, i) => {
        const Comp = SCENES[scene.id];
        const isLast = i === timeline.scenes.length - 1;
        return (
          <Sequence key={scene.id} name={scene.id} from={scene.from} durationInFrames={scene.durationInFrames + (isLast ? 0 : OVERLAP)}>
            <SceneOffset.Provider value={scene.from}>
              <Comp scene={scene} />
            </SceneOffset.Provider>
          </Sequence>
        );
      })}

      <Narrator />
      <Hud />
      <Vignette />
      <Grain />

      {/* --- Audio ------------------------------------------------------------ */}
      {track && bus.music ? (
        <Sequence name="music" durationInFrames={Math.round(musicEnd * fps)}>
          <Html5Audio
            src={track.src}
            trimBefore={Math.round(musicStart * fps)}
            volume={(f) => {
              const t = f / fps;
              const fadeIn = Math.min(1, t / 0.8);
              const duckIn = 1 - 0.55 * Math.min(Math.max((t - (arrival.start + 0.4)) / 1.6, 0), 1);
              const out = 1 - Math.min(Math.max((t - (voStart + 0.2)) / 3, 0), 1);
              return MIX.music * musicGain.gain * fadeIn * duckIn * out ** 1.5;
            }}
          />
        </Sequence>
      ) : track || !bus.bed ? null : (
        <Sequence name="bed-intro" durationInFrames={Math.round((arrival.start + 3) * fps)}>
          <Html5Audio src={staticFile('audio/bed-intro.wav')} volume={MIX.bed * 1.25} />
        </Sequence>
      )}
      {bus.bed > 0 && (
      <Sequence name="bed" from={Math.round((music.bedStart - 0.2) * fps)}>
        <Html5Audio
          src={staticFile('audio/bed.wav')}
          trimBefore={Math.round((music.bedStart - 0.2) * fps)}
          volume={(f) => MIX.bed * duck(music.bedStart - 0.2 + f / fps)}
        />
      </Sequence>
      )}
      {bus.vo > 0 &&
        timeline.scenes
        .filter((s) => s.vo)
        .map((s) => (
          <Sequence key={`vo-${s.id}`} name={`vo · ${s.vo!.id}`} from={Math.round(s.vo!.start * fps)} durationInFrames={Math.ceil(s.vo!.duration * fps) + 6}>
            <Html5Audio src={staticFile(s.vo!.file)} volume={MIX.vo} />
          </Sequence>
        ))}
    </AbsoluteFill>
    </MixContext.Provider>
  );
};
