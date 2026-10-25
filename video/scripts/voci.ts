/**
 * Le voci dei video (video/sorgenti/voci/):
 *
 *   npm run voci                 elenca le voci da fare, con il testo da leggere (JSON)
 *   npm run voci -- --registra   riscrive voci.json con i testi dei file che ci sono
 *
 * Le voci si fanno con ElevenLabs, voce «Holden» (vedi social/README.md), e
 * si salvano come sorgenti/voci/<id-post>/01.mp3, 02.mp3, … (una per scheda)
 * più le chiusure (chiusura.mp3, chiusura-lavoro.mp3, chiusura-fonti.mp3).
 * Poi `npm run voci -- --registra`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { POST_SOCIAL } from "../../src/data/post";
import { CHIUSURE, testiVoce } from "../../src/lib/voce";

const VOCI = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "sorgenti", "voci");
const FILE_ELENCO = join(VOCI, "voci.json");

const tutte: Record<string, string> = { ...CHIUSURE };
for (const post of POST_SOCIAL) {
  testiVoce(post).forEach((testo, i) => {
    tutte[`${post.id}/${String(i + 1).padStart(2, "0")}.mp3`] = testo;
  });
}

if (process.argv.includes("--registra")) {
  const presenti = Object.fromEntries(Object.entries(tutte).filter(([file]) => existsSync(join(VOCI, file))));
  writeFileSync(FILE_ELENCO, `${JSON.stringify(presenti, null, 2)}\n`);
  console.log(`voci.json: ${Object.keys(presenti).length} voci.`);
} else {
  const registrate = existsSync(FILE_ELENCO) ? (JSON.parse(readFileSync(FILE_ELENCO, "utf8")) as Record<string, string>) : {};
  const da = Object.entries(tutte)
    .filter(([file, testo]) => !existsSync(join(VOCI, file)) || registrate[file] !== testo)
    .map(([file, testo]) => ({ file, testo }));
  console.log(JSON.stringify(da, null, 2));
}
