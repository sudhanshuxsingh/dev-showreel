/** Archivo widths in px at 100px, weight 900, measured in Remotion (src/v2/Calibrate.tsx). */
export const ARCHIVO_900: Record<string, Record<number, number>> = {"MOST": {"62": 220,"72": 248,"100": 325,"125": 395},"SOFTWARE": {"62": 410,"72": 465,"100": 617,"125": 749},"VERY LITTLE": {"62": 459,"72": 523,"100": 704,"125": 844},"OF IT": {"62": 178,"72": 204,"100": 275,"125": 336},"LIKE ANYTHING.": {"62": 583,"72": 668,"100": 906,"125": 1091},"I BUILD": {"62": 258,"72": 295,"100": 397,"125": 472},"THE": {"62": 145,"72": 167,"100": 228,"125": 275},"KIND.": {"62": 200,"72": 230,"100": 313,"125": 368},"SUDHANSHU": {"62": 453,"72": 522,"100": 717,"125": 865},"SINGH": {"62": 231,"72": 264,"100": 359,"125": 431},"GEN-AI": {"62": 256,"72": 290,"100": 387,"125": 464},"UI": {"62": 77,"72": 88,"100": 120,"125": 138},"UX": {"62": 100,"72": 116,"100": 161,"125": 195},"TASTE": {"62": 235,"72": 268,"100": 359,"125": 431},"FULL-STACK": {"62": 440,"72": 505,"100": 687,"125": 824},"DEVELOPER": {"62": 434,"72": 496,"100": 669,"125": 800},"PROMPT": {"62": 320,"72": 361,"100": 474,"125": 573},"PRODUCT": {"62": 353,"72": 403,"100": 542,"125": 652},"SHIP": {"62": 173,"72": 197,"100": 265,"125": 315},"DETAILS": {"62": 308,"72": 350,"100": 468,"125": 555},"INTERFACES": {"62": 456,"72": 521,"100": 702,"125": 841},"MOTION": {"62": 303,"72": 342,"100": 453,"125": 544},"LET’S BUILD": {"62": 436,"72": 498,"100": 672,"125": 805},"SOMETHING": {"62": 450,"72": 512,"100": 684,"125": 823},"PEOPLE": {"62": 288,"72": 328,"100": 439,"125": 524},"RAG": {"62": 158,"72": 179,"100": 237,"125": 287}};

const AXES = [62, 72, 100, 125];

/** Width of `word` at 100px for any width axis (linear between measured axes). */
export function widthAt100(word: string, wdth: number) {
  const row = ARCHIVO_900[word];
  if (!row) return word.length * (0.36 + (wdth - 62) * 0.0043) * 100;
  const hi = AXES.find((a) => a >= wdth) ?? 125;
  const lo = [...AXES].reverse().find((a) => a <= wdth) ?? 62;
  if (hi === lo) return row[lo];
  return row[lo] + ((row[hi] - row[lo]) * (wdth - lo)) / (hi - lo);
}

/** Font size that sets `word` exactly `target` px wide (tracking in em, per gap). */
export function fit(word: string, wdth: number, target: number, tracking = -0.01) {
  const w = widthAt100(word, wdth) / 100;
  return target / (w + tracking * (word.length - 1));
}
