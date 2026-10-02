import { phonemize } from 'phonemizer';
for (const t of ['Sudhanshu', 'Sudhaanshu', 'Soodhaanshoo', 'Sudhaan-shu', 'Gen-AI', 'Gen A.I.', 'gen-A-I', 'A.P.I.s', 'APIs', 'RAG', 'Next.js', 'Next J S', 'haki', 'hah-kee', 'UI', 'U.I.']) {
  console.log(t.padEnd(14), (await phonemize(t, 'en-us')).join(' '));
}
