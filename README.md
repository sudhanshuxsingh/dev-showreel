# Sudhanshu Singh — Showreel ’26

A 66-second vertical (1080 × 1920, 30 fps) showreel, written as code with
[Remotion](https://remotion.dev). Typography-first motion design with a
stop-motion feel, cut to the beat of Tame Impala's "Loser" — no voiceover.

| file                       | what                                                    |
| -------------------------- | ------------------------------------------------------- |
| `out/showreel.mp4`         | master: H.264 at CRF 16, audio mastered to −18 LUFS     |
| `out/showreel-social.mp4`  | lighter re-encode (CRF 23) for uploading                |
| `out/cover.png`            | poster frame for Reels / Shorts (fits the 4:5 grid crop) |

## Getting started

Requirements: **Node.js 20+** and **pnpm** (`npm i -g pnpm`). macOS, Linux or Windows.
Rendering downloads a headless Chrome the first time (Remotion does this automatically).

```sh
git clone git@github.com:sudhanshuxsingh/dev-showreel.git
cd dev-showreel
pnpm install
```

### Add the music (not included — it's copyrighted)

Put your own copy of Tame Impala's "Loser" at `public/audio/music.mp3`, then build the edit:

```sh
pnpm music:beats   # beat-track the song → src/data/beats.json
pnpm music:edit    # cut it from 0:30, echo-out ending → public/audio/music-edit.wav
```

Without a song, render with `--props='{"music":false}'` (sound effects still play).

### Preview

```sh
pnpm studio        # opens Remotion Studio in the browser — scrub, tweak, hot-reload
```

### Render

```sh
pnpm render        # → out/showreel-raw.mp4, then mastered out/showreel.mp4 + out/showreel-social.mp4
pnpm cover         # → out/cover.png (poster frame)
pnpm remix         # audio-only re-render + re-master after changing music/SFX levels
```

### Other scripts

| command | what it does |
| ------- | ------------ |
| `pnpm assets:images` | slice the sprite sheets in `assets-src/` into `public/sprites/` |
| `pnpm assets:sfx` | re-synthesise every sound effect into `public/sfx/` |
| `pnpm qa:stills 12s 30s` | render a contact sheet of frames to `out/stills/sheet.png` |
| `pnpm typecheck` | TypeScript check |

## Music & sound

The song lives at `public/audio/music.mp3` (copied from `assets-src/tempe-imphal`).
The reel uses it **from 0:30**, prepared by `pnpm music:edit` → `public/audio/music-edit.wav`:
it plays **continuously** (nothing cut or filtered mid-way) with a soft start, an even
gentle low-end lift, and an "echo out" on the final crash. Where the song itself goes
silent for ~0.75 s (1:22 of the track), its last moment rings on a reverb tail so there
is never a dead hole; its short stop-time stabs are left alone (the cuts land on them).

The song sits **low and steady** under everything (`MUSIC_LEVEL` in `src/v2/sound.tsx`);
a layer of sound effects (`SCENE_CUES` in the same file) follows the visuals beat for beat.
After changing levels, `pnpm remix` re-renders only the audio and re-masters (about 1.5 min).
The master targets −18 LUFS (`scripts/master.mjs`).

Both audio files are copyrighted material and git-ignored. Platforms may mute or claim
the song; to post safely, render without it (`pnpm render --props='{"music":false}'`)
and add the track from Instagram's / YouTube's licensed library in the app.

## How the edit is built

- **Beat tracking** — `pnpm music:beats` (`scripts/beat-track.mjs`) runs a dynamic-
  programming beat tracker over the song (82.7 BPM) and finds the bar lines from
  where the kick lands → `src/data/beats.json`. Every scene from the name on starts
  on a tracked bar line, and animations inside a scene are timed from that scene's
  own tracked beats (`useHits()` in `src/v2/grid.ts`), snapped to the nearest
  stop-motion exposure. The intro cuts on the song's strongest hits.
- **Stop motion** — `src/v2/components/stop.tsx`: the whole reel animates on twos
  (`<StopMotion>`), each element re-placed with a tiny "boil" every exposure, plus
  exposure flicker and film grain.
- **Type** — Archivo's variable width axis (62 → 125) set edge to edge with measured
  metrics (`src/v2/metrics.ts`, from the `Calibrate` still), Instrument Serif italic for
  the voice, Geist Mono for the HUD.
- **Scenes** — `src/v2/scenes/ActOne.tsx` (intro → name → role), `ActTwo.tsx` (six
  chapters + stack), `ActThree.tsx` (sign-off, lockup with the avatar cameo, end card).

Scenes last one 2-bar phrase of the song (~5.8 s) and cut on phrase downbeats;
moments inside a scene land on whole beats; everything animates on threes.

| time (s) | scene |
| -------- | ----- |
| 0.3 / 0.5 | "Show" · "reel" on the drum fill |
| 0.67 / 3.57 | Most software *works.* · Very little of it *feels* like anything. (the song crashes on both) |
| 6.43 | I build the *second* kind. — then a slow push-in |
| 12.24 | SUDHANSHU / SINGH on the phrase crash |
| 18.02 | the face — a steady sticker, "hi, that's *me.*" |
| 23.83 | GEN-AI · UI · UX · TASTE, one per beat → Full-stack Gen-AI developer, with taste for UI & UX |
| 29.58 / 35.36 / 41.15 / 46.93 | 01 requirement → product · 02 RAG · 03 Interfaces · 04 Taste (motion → details) |
| 52.72 | Let's build something people *remember.* (first word as the song returns, "remember." on the stab) |
| 58.51 | lockup — the avatar walks to the middle, turns to camera, releases its aura |
| 64.30 | SS monogram while the final crash echoes out |

The first, narrated version is kept in Studio under **archive → ShowreelV1**.

## Credits

Type: Archivo, Instrument Serif, Geist & Geist Mono (OFL). Rendering: Remotion (free for
individuals and small teams — see its license). Music: Tame Impala, "Loser" (not included).
