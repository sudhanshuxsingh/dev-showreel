import { useCurrentFrame, useVideoConfig } from 'remotion';
import timelineJson from '../data/timeline.json';
import musicJson from '../data/music.json';

export type Word = { w: string; s: number; e: number };
export type VoInfo = {
  id: string;
  file: string;
  start: number;
  duration: number;
  text: string;
  words: Word[];
  segments: [number, number][];
};
export type SceneInfo = {
  id: string;
  from: number;
  durationInFrames: number;
  start: number;
  duration: number;
  vo: VoInfo | null;
};

export const timeline = timelineJson as {
  fps: number;
  durationInFrames: number;
  duration: number;
  scenes: SceneInfo[];
};
export const music = musicJson as {
  bpm: number;
  origin: number;
  bedStart: number;
  drop: number;
};

export const sceneById = (id: string) => {
  const s = timeline.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

/** Absolute time (s) of the n-th beat at or after `t` on the bed's grid. */
export const beatAfter = (t: number, n = 0) => {
  const beat = 60 / music.bpm;
  return music.origin + (Math.ceil((t - music.origin) / beat - 1e-6) + n) * beat;
};

/**
 * Scene-local clock. `t` is seconds since the scene started, `v` seconds
 * since its voiceover started (negative before), `end` the scene length.
 */
export function useScene(scene: SceneInfo) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const voAt = scene.vo ? scene.vo.start - scene.start : 0;
  const word = (index: number) => (scene.vo ? voAt + scene.vo.words[Math.min(index, scene.vo.words.length - 1)].s : 0);
  /** Scene-local time at which the first word matching `re` is spoken. */
  const at = (re: RegExp, fallback = 0) => {
    const i = scene.vo?.words.findIndex((w) => re.test(w.w)) ?? -1;
    return i >= 0 ? word(i) : fallback;
  };
  return { frame, fps, t, v: t - voAt, voAt, end: scene.duration, word, at };
}
