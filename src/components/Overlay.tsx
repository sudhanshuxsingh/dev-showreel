
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, tween } from '../lib/anim';
import { F } from '../lib/fonts';
import { C, M } from '../lib/theme';
import { sceneById, timeline, type SceneInfo } from '../lib/timeline';
import type { Face } from './Character';
import { DialogBox } from './DialogBox';

const CHAPTERS = ['think', 'design', 'build', 'intelligence', 'ship'];

/** Top HUD: identity, story-style chapter progress, timecode. */
export function Hud() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const showFrom = sceneById('arrival').start + 0.6;
  const hideAt = sceneById('haki').start;
  const back = sceneById('outro').start + 0.8;
  const end = timeline.duration - 1.2;
  const o = Math.max(
    Math.min(tween(t, [showFrom, showFrom + 0.8]), 1 - tween(t, [hideAt - 0.3, hideAt + 0.1])),
    Math.min(tween(t, [back, back + 0.8]), 1 - tween(t, [end - 0.6, end])),
  );
  if (o <= 0) return null;

  const think = sceneById('think');
  const ship = sceneById('ship');
  const chapterO = Math.min(tween(t, [think.start - 0.4, think.start + 0.3]), 1 - tween(t, [ship.start + ship.duration - 0.4, ship.start + ship.duration]));
  const ff = String(frame % fps).padStart(2, '0');
  const ss = String(Math.floor(t) % 60).padStart(2, '0');
  const mm = String(Math.floor(t / 60)).padStart(2, '0');

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: o }}>
      <div style={{ position: 'absolute', left: M, right: M, top: 64, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 21, letterSpacing: '0.16em', color: C.mute }}>
        <span>
          <span style={{ color: C.dim }}>SUDHANSHU SINGH</span> — REEL ’26
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: 6, background: C.red, opacity: Math.floor(t * 1.6) % 2 ? 0.25 : 1, boxShadow: `0 0 12px ${C.red}` }} />
          00:{mm}:{ss}:{ff}
        </span>
      </div>
      <div style={{ position: 'absolute', left: M, right: M, top: 1672, display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 21, letterSpacing: '0.14em', color: C.mute }}>
        <span>sudhanshuxsingh.in</span>
        <span style={{ fontFamily: F.jp, fontWeight: 700, letterSpacing: '0.2em', color: C.red, opacity: 0.8 }}>天照</span>
      </div>
      <div style={{ position: 'absolute', left: M, right: M, top: 112, display: 'flex', gap: 8, opacity: chapterO }}>
        {CHAPTERS.map((id) => {
          const s: SceneInfo = sceneById(id);
          const p = tween(t, [s.start, s.start + s.duration], [0, 1], ease.linear);
          return (
            <div key={id} style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(244,241,234,0.14)', overflow: 'hidden' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', background: p >= 1 ? C.text : C.red }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

const FACES: Record<string, (t: number, s: SceneInfo) => Face> = {
  arrival: (t, s) => (t > (s.vo ? s.vo.start - s.start + 4.6 : 99) ? 'smile' : 'neutral'),
  workflow: () => 'happy',
  think: (t) => (t < 1.2 ? 'focused' : 'neutral'),
  design: (t) => (t < 4.5 ? 'neutral' : 'smile'),
  build: (t) => (t < 1.5 ? 'serious' : 'neutral'),
  intelligence: (t) => (t < 2.2 ? 'haki-eye-glow' : 'neutral'),
  ship: (t) => (t > 5 ? 'happy' : 'neutral'),
  taste: (t) => (t > 4.6 ? 'smile' : 'serious'),
  haki: (t) => (t < 1 ? 'haki-idle' : t < 2.3 ? 'haki-intense' : t < 5.2 ? 'haki-eye-glow' : 'haki-rage'),
  outro: (t) => (t > 4.1 && t < 5.2 ? 'wink' : t > 3.4 ? 'smile' : 'happy'),
};

const HIGHLIGHT = /^(Sudhanshu|Gen-AI|feel|problem|prompt|AI|system|pixel|React|Next\.js|APIs|think|RAG|agents|stream|traced|evaluated|ship|taste|thousand|Interfaces|Taste|haki|remember|work)$/i;

/** Persistent narrator: one dialogue box from the arrival to the outro. */
export function Narrator() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scene = [...timeline.scenes].reverse().find((s) => t >= s.start);
  if (!scene || !scene.vo) return null;
  const local = t - scene.start;
  const first = scene.id === 'arrival';
  const last = scene.id === 'outro';
  const face = FACES[scene.id] ?? (() => 'neutral');
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <DialogBox
        scene={scene}
        t={local}
        enter={first ? 2.2 : -1}
        exit={last ? scene.duration - 2.2 : undefined}
        expression={(lt) => face(lt, scene)}
        highlight={HIGHLIGHT}
      />
    </AbsoluteFill>
  );
}

