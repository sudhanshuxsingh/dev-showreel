import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';
import { loadFont as loadInstrument } from '@remotion/google-fonts/InstrumentSerif';
import { getInfo as jpInfo, loadFont as loadNotoJP } from '@remotion/google-fonts/NotoSerifJP';
import { loadFont as loadPixelify } from '@remotion/google-fonts/PixelifySans';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';

/** Every kanji used on screen; only the font slices containing them load. */
export const KANJI = '天照大神思考設計構築知能出荷美意識覇気壱弐参肆伍章第終完職人一二三四五';

function jpSubsets(text: string) {
  const ranges = jpInfo().unicodeRanges as Record<string, string>;
  const needed = new Set<string>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    for (const [key, value] of Object.entries(ranges)) {
      for (const part of value.split(',')) {
        const [a, b] = part.trim().replace('U+', '').split('-');
        const lo = parseInt(a, 16);
        const hi = b ? parseInt(b, 16) : lo;
        if (cp >= lo && cp <= hi) needed.add(key);
      }
    }
  }
  return [...needed];
}

const sans = loadGeist('normal', { weights: ['300', '400', '500', '600', '700', '800'], subsets: ['latin'] });
const mono = loadGeistMono('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });
const serif = loadInstrument('italic', { weights: ['400'], subsets: ['latin'] });
const jp = loadNotoJP('normal', {
  weights: ['700', '900'],
  subsets: jpSubsets(KANJI) as never[],
});
const pixel = loadPixelify('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
const hand = loadCaveat('normal', { weights: ['500', '700'], subsets: ['latin'] });

export const F = {
  sans: sans.fontFamily,
  mono: mono.fontFamily,
  serif: serif.fontFamily,
  jp: jp.fontFamily,
  pixel: pixel.fontFamily,
  hand: hand.fontFamily,
};
