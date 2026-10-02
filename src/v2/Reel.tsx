import React from 'react';
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Grain } from '../components/core';
import { Exposure, StopMotion } from './components/stop';
import { Hud, type HudCue } from './components/Hud';
import { BARS, beatsBetween, DROP, END, LAST_BAR, SceneBeatsContext, SONG_START } from './grid';
import { K } from './theme';
import { buildCues, musicLevel, SfxTrack } from './sound';
import { FaceFrame, Intro, LineOne, LineThree, LineTwo, Name, Role } from './scenes/ActOne';
import { Build, Interfaces, Rag, TasteChapter } from './scenes/ActTwo';
import { End, Lockup, SignOff } from './scenes/ActThree';

type Scene = { id: string; from: number; to: number; C: React.FC; reveal?: [number, number] };

/** The incoming scene grows out of a point of the outgoing one (a match cut), on twos. */
function RevealIn({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = tween(frame / fps, [0, 0.45], [0, 1], ease.inOutCubic);
  return <AbsoluteFill style={{ clipPath: k >= 1 ? undefined : `circle(${Math.max(1, k * 2300)}px at ${x}px ${y}px)` }}>{children}</AbsoluteFill>;
}

const OVERLAP = 10;

/**
 * The song (from 0:30) moves in 2-bar phrases — crashes and arrangement changes
 * land on every second bar line — so every scene lasts one phrase and every cut
 * is a phrase downbeat. Only the two opening lines cut on single bars, where the
 * song itself crashes (0.67 s and 3.57 s). The name drops on the phrase at
 * 12.24 s, right after the edit's one-beat break (scripts/music-edit.mjs).
 */
const bar = (n: number) => BARS[n];

export const SCENES: Scene[] = [
  { id: 'intro', from: 0, to: bar(0), C: Intro },
  { id: 'line-1', from: bar(0), to: bar(1), C: LineOne },
  { id: 'line-2', from: bar(1), to: bar(2), C: LineTwo },
  { id: 'line-3', from: bar(2), to: DROP, C: LineThree },
  { id: 'name', from: DROP, to: bar(6), C: Name },
  { id: 'face', from: bar(6), to: bar(8), C: FaceFrame },
  { id: 'role', from: bar(8), to: bar(10), C: Role },
  { id: '01-gen-ai', from: bar(10), to: bar(12), C: Build },
  { id: '02-rag', from: bar(12), to: bar(14), C: Rag, reveal: [540, 990] },
  { id: '03-ui', from: bar(14), to: bar(16), C: Interfaces, reveal: [540, 1000] },
  { id: '04-taste', from: bar(16), to: bar(18), C: TasteChapter, reveal: [540, 1060] },
  { id: 'sign-off', from: bar(18), to: bar(20), C: SignOff },
  { id: 'lockup', from: bar(20), to: LAST_BAR, C: Lockup },
  { id: 'end', from: LAST_BAR, to: END, C: End },
];

const at = (id: string) => SCENES.find((x) => x.id === id)!.from;

/** HUD colour follows the field under it. */
const CUES: HudCue[] = [
  { at: 0, tone: 'dark' },
  { at: at('line-2'), tone: 'light' },
  { at: at('line-3'), tone: 'dark' },
  { at: DROP, tone: 'dark' },
  { at: at('face'), tone: 'light' },
  // Role flashes, one per beat: cobalt, red, paper, lime — then the ink lockup.
  // Role flashes, one per beat: blue, ink, paper, lime — then the ink lockup.
  ...(['dark', 'dark', 'light', 'light', 'dark'] as const).map((tone, i) => ({ at: at('role') + (beatsBetween(at('role'), at('01-gen-ai'))[i] ?? i * 0.7256), tone, section: 'Who' })),
  { at: at('01-gen-ai'), tone: 'dark', section: '01 / Gen-AI' },
  { at: at('02-rag'), tone: 'dark', section: '02 / RAG' },
  { at: at('03-ui'), tone: 'light', section: '03 / Interfaces' },
  { at: at('04-taste'), tone: 'dark', section: '04 / Taste' },
  { at: at('04-taste') + (beatsBetween(at('04-taste'), at('sign-off'))[4] ?? 2.9), tone: 'light', section: '04 / Taste' },
  { at: at('sign-off'), tone: 'dark' },
  { at: at('lockup'), tone: 'light' },
  { at: at('end'), tone: 'hidden' },
];

const hasEdit = () => getStaticFiles().some((f) => f.name === 'audio/music-edit.wav');

/** Effects follow the same per-scene beats as the visuals. */
const CUES_SFX = buildCues(SCENES.map(({ id, from, to }) => ({ id, from, to })));


export type ReelProps = { music: boolean };

export const Reel: React.FC<ReelProps> = ({ music }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      {SCENES.map(({ id, from, to, C, reveal }, i) => (
          <Sequence
            key={id}
            name={id}
            from={Math.round(from * fps)}
            durationInFrames={Math.round(to * fps) - Math.round(from * fps) + (i < SCENES.length - 1 ? OVERLAP : 0)}
          >
            {/* Stepping is per scene, so every cut lands on its exact first frame. */}
            <StopMotion>
              <SceneBeatsContext.Provider value={{ beats: beatsBetween(from, to), beat: 0.7256 }}>
                {reveal ? (
                  <RevealIn x={reveal[0]} y={reveal[1]}>
                    <C />
                  </RevealIn>
                ) : (
                  <C />
                )}
              </SceneBeatsContext.Provider>
            </StopMotion>
          </Sequence>
        ))}
      <StopMotion>
        <Hud cues={CUES} />
        <Exposure />
      </StopMotion>
      <Grain opacity={0.8} />

      {music && (
        <Html5Audio
          // The edit already starts at 0:30 and is mixed (scripts/music-edit.mjs);
          // without it, fall back to the raw track from 0:30.
          src={staticFile(hasEdit() ? 'audio/music-edit.wav' : 'audio/music.mp3')}
          trimBefore={hasEdit() ? undefined : Math.round(SONG_START * fps)}
          volume={(f) => musicLevel(f / fps) * Math.min(1, f / fps / 0.15)}
        />
      )}
      <SfxTrack cues={CUES_SFX} />
    </AbsoluteFill>
  );
};

