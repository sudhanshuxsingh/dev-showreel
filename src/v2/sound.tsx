
import { Html5Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import sfxJson from '../data/sfx.json';
import { beatsBetween, BEAT } from './grid';

/**
 * The sound-design layer. Effects are cued from the same tracked beats as the
 * visuals (b(n) = n-th beat of a scene), so a pop lands with its pop. It sits
 * outside the stop-motion Freeze — audio inside a Freeze would stall.
 */
export type SfxName = keyof typeof sfxJson;
type Cue = { name: SfxName; at: number; volume?: number; dur?: number; rate?: number };
type SceneSpan = { id: string; from: number; to: number };

const meta = sfxJson as Record<SfxName, { duration: number; base: number }>;
const SFX_GAIN = 0.9;

/** Beat / eighth helpers for one scene, in scene-local seconds. */
function helpers(s: SceneSpan) {
  const local = beatsBetween(s.from, s.to);
  const b = (n: number) => local[n] ?? (local[local.length - 1] ?? 0) + (n - local.length + 1) * BEAT;
  const h = (n: number) => b(Math.floor(n / 2)) + (n % 2) * (BEAT / 2);
  return { b, h, len: s.to - s.from };
}

/** Per-scene cues (scene-local seconds). Mirrors what each scene animates and when. */
const SCENE_CUES: Record<string, (x: ReturnType<typeof helpers>) => Cue[]> = {
  intro: () => [
    { name: 'tick', at: 0.3, volume: 0.25 },
    { name: 'tick', at: 0.5, volume: 0.25, rate: 1.15 },
  ],
  'line-1': ({ b }) => [
    { name: 'tick', at: b(0), volume: 0.35 },
    { name: 'tick', at: b(1), volume: 0.35, rate: 1.1 },
    { name: 'pop', at: b(2), volume: 0.35 },
  ],
  'line-2': ({ b }) => [
    { name: 'tick', at: b(0), volume: 0.35 },
    { name: 'tick', at: b(1), volume: 0.35, rate: 1.1 },
    { name: 'pop-hi', at: b(2), volume: 0.4 },
    { name: 'tick', at: b(3), volume: 0.35, rate: 0.9 },
  ],
  'line-3': ({ b, len }) => [
    { name: 'tick', at: b(0), volume: 0.35 },
    { name: 'tick', at: b(1), volume: 0.35, rate: 1.1 },
    { name: 'pop', at: b(2), volume: 0.4 },
    { name: 'tick', at: b(3), volume: 0.35, rate: 0.9 },
    // A riser peaking exactly as the name lands (its body is 3 s long).
    { name: 'riser', at: len - 3.0, volume: 0.32 },
  ],
  name: ({ b }) => [
    { name: 'impact', at: 0, volume: 0.5 },
    { name: 'typing-3s', at: 0, volume: 0.22, dur: 0.95 },
    { name: 'whoosh-fast', at: b(2) - 0.12, volume: 0.4 },
    { name: 'kick', at: b(2), volume: 0.35 },
    { name: 'pop', at: b(4), volume: 0.3 },
  ],
  face: ({ b }) => [
    { name: 'pop-hi', at: 0, volume: 0.5 },
    { name: 'click', at: b(1), volume: 0.22 },
    { name: 'sparkle', at: b(2), volume: 0.28 },
    { name: 'sparkle', at: b(3), volume: 0.28, rate: 1.1 },
    { name: 'chime', at: b(4), volume: 0.32 },
    { name: 'sparkle', at: b(5), volume: 0.25, rate: 0.95 },
    { name: 'sparkle', at: b(6), volume: 0.25, rate: 1.15 },
    { name: 'sparkle', at: b(7), volume: 0.4, rate: 1.25 },
  ],
  role: ({ b }) => [
    ...[0, 1, 2, 3].flatMap((i): Cue[] => [
      { name: 'swish', at: b(i), volume: 0.38, rate: 1 + i * 0.06 },
      { name: 'kick', at: b(i), volume: 0.3 },
    ]),
    { name: 'impact-soft', at: b(4), volume: 0.4 },
    { name: 'swish', at: b(5), volume: 0.25 },
  ],
  '01-gen-ai': ({ b }) => [
    { name: 'typing-3s', at: 0.15, volume: 0.35, dur: b(3) - 0.15 },
    ...Array.from({ length: 11 }, (_, i): Cue => ({ name: 'tick', at: b(4) + i * 0.1, volume: 0.26, rate: 1 + i * 0.03 })),
    { name: 'notify', at: b(4) + 1.1, volume: 0.3 },
    { name: 'swish', at: b(5), volume: 0.3 },
  ],
  '02-rag': ({ b }) => [
    { name: 'whoosh', at: 0, volume: 0.4 },
    { name: 'compute', at: b(1), volume: 0.3 },
    { name: 'pop-hi', at: b(2), volume: 0.45 },
    { name: 'scan', at: b(3), volume: 0.35 },
    { name: 'click', at: b(4), volume: 0.3 },
    { name: 'click', at: b(5), volume: 0.3, rate: 1.1 },
    { name: 'click', at: b(6), volume: 0.3, rate: 1.2 },
  ],
  '03-ui': ({ b }) => [
    { name: 'whoosh-fast', at: 0, volume: 0.4 },
    { name: 'click', at: b(1), volume: 0.5 },
    { name: 'compute', at: b(1) + 0.6, volume: 0.18, dur: b(4) - b(1) - 0.7 },
    { name: 'success', at: b(4), volume: 0.45 },
    { name: 'swish', at: b(5), volume: 0.35 },
    { name: 'notify', at: b(6), volume: 0.25 },
  ],
  '04-taste': ({ b }) => [
    { name: 'whoosh-fast', at: 0, volume: 0.4 },
    { name: 'scan', at: b(1), volume: 0.4 },
    { name: 'toggle', at: b(1) + 1.25, volume: 0.3 },
    { name: 'glitch-2', at: b(4), volume: 0.28 },
    { name: 'typing-3s', at: b(4), volume: 0.22, dur: 0.95 },
    { name: 'slam', at: b(6), volume: 0.42 },
  ],
  'sign-off': ({ b }) => [
    { name: 'tick', at: b(0), volume: 0.35 },
    { name: 'tick', at: b(1), volume: 0.35, rate: 1.1 },
    { name: 'tick', at: b(2), volume: 0.35, rate: 0.9 },
    { name: 'impact-soft', at: b(4), volume: 0.45 },
    { name: 'shimmer', at: b(4), volume: 0.35 },
  ],
  lockup: ({ b }) => [
    // Footsteps: one per contact while he walks in (on threes, 10-fps cycle).
    ...Array.from({ length: Math.floor((b(3) - 0.08) / 0.2) }, (_, i): Cue => ({ name: 'step', at: 0.08 + i * 0.2, volume: 0.28 + (i % 2) * 0.04, rate: i % 2 ? 1.06 : 1 })),
    { name: 'swish', at: 0.3, volume: 0.25 },
    { name: 'pop', at: b(3), volume: 0.3 },
    { name: 'rumble', at: b(4), volume: 0.45 },
    { name: 'zap', at: b(4), volume: 0.4 },
    { name: 'powerup', at: b(6) - 2.35, volume: 0.32 },
    { name: 'zap', at: b(5), volume: 0.35, rate: 1.15 },
    { name: 'thunder', at: b(6), volume: 0.55 },
    { name: 'impact', at: b(6), volume: 0.45 },
    { name: 'zap', at: b(6) + 0.6, volume: 0.32 },
  ],
  end: () => [{ name: 'shimmer', at: 0.1, volume: 0.28 }],
};

export function buildCues(scenes: SceneSpan[]): Cue[] {
  return scenes.flatMap((s) => (SCENE_CUES[s.id]?.(helpers(s)) ?? []).map((c) => ({ ...c, at: s.from + c.at })));
}

export function SfxTrack({ cues }: { cues: Cue[] }) {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues
        .filter((c) => c.at >= 0)
        .map((c, i) => {
          const m = meta[c.name];
          const rate = c.rate ?? 1;
          const full = Math.ceil((m.duration / rate) * fps) + 2;
          const frames = c.dur ? Math.min(full, Math.max(2, Math.round(c.dur * fps))) : full;
          const gain = (c.volume ?? 1) * m.base * SFX_GAIN;
          return (
            <Sequence key={i} from={Math.round(c.at * fps)} durationInFrames={frames} layout="none" name={`sfx · ${c.name}`}>
              <Html5Audio
                src={staticFile(`sfx/${c.name}.wav`)}
                playbackRate={rate}
                volume={(f) => gain * (c.dur ? Math.min(1, Math.max(0, (frames - f) / 4)) : 1)}
              />
            </Sequence>
          );
        })}
    </>
  );
}

/**
 * Music level: the song sits low and steady the whole way through — a bed under
 * the type and the sound design, never ducking or dropping out.
 */
export const MUSIC_LEVEL = 0.42;
export function musicLevel(_t: number) {
  return MUSIC_LEVEL;
}
