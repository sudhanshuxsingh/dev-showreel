import { createContext, useContext } from 'react';
import beats from '../data/beats.json';
import edit from '../data/edit.json';

/**
 * The edit follows the song's tracked beats (scripts/beat-track.mjs, Ellis-style
 * dynamic programming on Tame Impala "Loser", 82.7 BPM). The reel uses the song
 * from 0:30 (scripts/music-edit.mjs), so all times here are VIDEO seconds:
 * song time − SONG_START. Scenes start on real bar lines; animations inside a
 * scene are timed from that scene's own tracked beats.
 */
export const SONG_START = edit.songStart;
export const BEAT = beats.beat;
export const BEATS = beats.beats.map((b) => b - SONG_START).filter((b) => b > -0.5);
export const BARS = beats.bars.map((b) => b - SONG_START).filter((b) => b > 0);

/** Bar line nearest to `sec` (video time). */
export const barNear = (sec: number) => BARS.reduce((a, b) => (Math.abs(b - sec) < Math.abs(a - sec) ? b : a));

/** The phrase that opens on a crash at 12.24 s — the name lands here. */
export const DROP = edit.drop;
/** The dry song stops on this bar; its reverb tail rings to END. */
export const LAST_BAR = edit.lastBar;

export const FPS = 30;
export const END = edit.end;
export const sec = (s: number) => Math.round(s * FPS);

/**
 * Per-scene timing: local times (s from the scene start) of the beats that
 * fall inside it. Provided by Reel for each Sequence.
 */
export type SceneBeats = { beats: number[]; beat: number };
export const SceneBeatsContext = createContext<SceneBeats>({ beats: [0, BEAT, 2 * BEAT, 3 * BEAT], beat: BEAT });

/**
 * `snap` = beat 2, `back` = beat 4 of the scene's first bar, `pulse` = a
 * sixteenth. `b(n)` = n-th beat (0-based), `h(n)` = n-th eighth note. All are
 * snapped to the nearest exposure (we animate on threes: 10 per second) so a hit
 * shows on the exposure closest to the beat.
 */
export function useHits() {
  const { beats: local, beat } = useContext(SceneBeatsContext);
  const snapTo = (s: number) => Math.round(s * 10) / 10; // 10 exposures a second (on threes)
  const raw = (n: number) => local[n] ?? (local[local.length - 1] ?? 0) + (n - local.length + 1) * beat;
  const b = (n: number) => snapTo(raw(n));
  return { one: 0, snap: b(1), back: b(3), pulse: beat / 4, beat, b, h: (n: number) => snapTo(raw(Math.floor(n / 2)) + (n % 2) * (beat / 2)) };
}

/** Beats inside [from, to), relative to `from`. */
export const beatsBetween = (from: number, to: number) => BEATS.filter((x) => x >= from - 0.02 && x < to - 0.05).map((x) => Math.max(0, x - from));
