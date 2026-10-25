/**
 * Fa il video verticale (Reel) del post del giorno, da pubblicare insieme al
 * carosello (scripts/social/pubblica.ts nella cartella principale):
 *
 *   npm run reel                  il post di oggi (ora svizzera; SOCIAL_DATA=AAAA-MM-GG per un altro giorno)
 *   npm run reel -- <id-post>     un post preciso
 *
 * Scrive out/reel-<id>.mp4: H.264 1080×1920 a 30 fps con audio AAC 48 kHz,
 * come chiedono i Reel di Instagram e Facebook. La voce viene da
 * sorgenti/voci/ (social/README.md), musica ed effetti li fa
 * scripts/audio-reel.py, a tempo con le animazioni (suoniReel). Servono curl,
 * ffmpeg e python3 con NumPy. Il browser è quello che Remotion scarica da
 * solo; per usarne un altro: REMOTION_BROWSER=/percorso/di/chrome.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { POST_SOCIAL, postDelGiorno, type PostSocial } from "../../src/data/post";
import { oggiInSvizzera } from "../../src/lib/post";
import { chiusuraVoce, CHIUSURE, testiVoce } from "../../src/lib/voce";
import { elementi, FPS_REEL, numeroDaContare, suoniReel, tempiReel, type VoceReel } from "../src/tempi-reel";
import { scaricaCaratteri } from "./caratteri";
import { copiaSiti, durataSecondi, pauseVoce } from "./risorse";

const QUI = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(QUI, "..");
const VOCI = join(VIDEO, "sorgenti", "voci");

/**
 * Quando comincia ogni punto di un elenco (secondi). Prima una stima in
 * proporzione alla lunghezza delle frasi (titolo, punto, punto…), poi ogni
 * stima si aggancia alla fine della pausa più vicina, se ce n'è una entro un
 * secondo: così una pausa dentro una frase non sposta i punti.
 */
function iniziPunti(file: string, testo: string, durata: number): number[] {
  const frasi = testo.split("\n");
  const pause = pauseVoce(file)
    .filter(([a, b]) => a > 0.2 && b < durata - 0.2)
    .map(([, b]) => b);
  const caratteri = frasi.map((f) => f.length);
  const totale = caratteri.reduce((a, b) => a + b, 0);
  const inizi: number[] = [];
  let somma = 0;
  for (const c of caratteri.slice(0, -1)) {
    somma += c;
    const stima = (somma / totale) * durata;
    const dopo = inizi.at(-1) ?? 0;
    const vicina = pause
      .filter((t) => t > dopo && Math.abs(t - stima) <= 1)
      .sort((x, y) => Math.abs(x - stima) - Math.abs(y - stima))[0];
    inizi.push(vicina ?? Math.max(stima, dopo + 0.6));
  }
  return inizi;
}

/**
 * La voce del post (sorgenti/voci/<id>/01.mp3, … e la chiusura), copiata in
 * public/ e misurata. Solo se c'è una frase per ogni scheda e i testi sono
 * quelli di voci.json: se il post è cambiato, il video esce senza voce.
 */
function preparaVoce(post: PostSocial): (VoceReel & { cartella: string }) | null {
  const elenco = existsSync(join(VOCI, "voci.json")) ? (JSON.parse(readFileSync(join(VOCI, "voci.json"), "utf8")) as Record<string, string>) : {};
  const testi = testiVoce(post);
  const nomi = testi.map((_, i) => `${post.id}/${String(i + 1).padStart(2, "0")}.mp3`);
  const chiusura = chiusuraVoce(post);
  const mancanti = [...nomi, chiusura].filter((n) => !existsSync(join(VOCI, n)));
  const cambiati = nomi.filter((n, i) => existsSync(join(VOCI, n)) && elenco[n] !== testi[i]);
  if (elenco[chiusura] !== CHIUSURE[chiusura]) cambiati.push(chiusura);
  if (mancanti.length || cambiati.length) {
    console.warn(
      `Voce non usata per ${post.id}: ${mancanti.length ? `mancano ${mancanti.join(", ")}` : ""}${cambiati.length ? ` testo cambiato in ${cambiati.join(", ")}` : ""} (vedi social/README.md). Il video esce con la sola musica.`,
    );
    return null;
  }
  const cartella = `voce/${post.id}`;
  rmSync(join(VIDEO, "public", cartella), { recursive: true, force: true });
  mkdirSync(join(VIDEO, "public", cartella), { recursive: true });
  for (const n of nomi) copyFileSync(join(VOCI, n), join(VIDEO, "public", cartella, n.split("/")[1]));
  copyFileSync(join(VOCI, chiusura), join(VIDEO, "public", cartella, "chiusura.mp3"));
  const fotogrammi = (secondi: number) => Math.ceil(secondi * FPS_REEL);
  return {
    cartella,
    schede: post.schede.map((scheda, i) => {
      const file = join(VOCI, nomi[i]);
      const durata = durataSecondi(file);
      return {
        durata: fotogrammi(durata),
        punti: elementi(scheda) ? iniziPunti(file, testi[i], durata).map(fotogrammi) : null,
      };
    }),
    chiusura: fotogrammi(durataSecondi(join(VOCI, chiusura))),
  };
}

const [richiesto] = process.argv.slice(2);
const oggi = process.env.SOCIAL_DATA?.trim() || oggiInSvizzera();
const post = richiesto ? POST_SOCIAL.find((p) => p.id === richiesto) : postDelGiorno(oggi, "video");
if (!post) {
  if (richiesto) {
    console.error(`Post sconosciuto: ${richiesto}. Gli id sono in src/data/post.ts.`);
    process.exit(1);
  }
  console.log(`Nessun post per il ${oggi}: niente video.`);
  process.exit(0);
}

// Carattere e foto dei siti in public/ prima del bundle, che li copia.
scaricaCaratteri(VIDEO);
copiaSiti(VIDEO);

// La voce, poi musica ed effetti in public/ (prima del bundle). Se l'audio
// non riesce, il video esce muto invece di non uscire; sotto la voce la
// musica è più bassa.
const voce = preparaVoce(post);
const tempi = tempiReel(post, voce);
const suoni = {
  fps: FPS_REEL,
  fotogrammi: tempi.totale,
  seme: post.id,
  voce: voce !== null,
  suoni: suoniReel(tempi, (cifra) => numeroDaContare(cifra) !== null),
};
const fileSuoni = join(VIDEO, "out", `suoni-${post.id}.json`);
const audio = `audio/reel-${post.id}.wav`;
mkdirSync(join(VIDEO, "out"), { recursive: true });
mkdirSync(join(VIDEO, "public", "audio"), { recursive: true });
writeFileSync(fileSuoni, JSON.stringify(suoni));
const sintesi = spawnSync("python3", [join(VIDEO, "scripts", "audio-reel.py"), fileSuoni, join(VIDEO, "public", audio)], {
  stdio: "inherit",
});
if (sintesi.status !== 0) console.warn("Non sono riuscito a fare l'audio (serve python3 con NumPy): il video esce muto.");

const uscita = join(VIDEO, "out", `reel-${post.id}.mp4`);
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const serveUrl = await bundle({ entryPoint: join(VIDEO, "src", "index.ts") });
const inputProps = { postId: post.id, audio: sintesi.status === 0 ? audio : null, voce };
const composition = await selectComposition({ serveUrl, id: "reel", inputProps, browserExecutable });
await renderMedia({
  composition,
  serveUrl,
  inputProps,
  codec: "h264",
  crf: 20,
  pixelFormat: "yuv420p",
  imageFormat: "jpeg",
  jpegQuality: 92,
  enforceAudioTrack: true,
  audioBitrate: "128k",
  // Facebook vuole un fotogramma chiave almeno ogni 2-5 secondi.
  gopSize: composition.fps * 2,
  outputLocation: uscita,
  browserExecutable,
});
// Lo stesso volume ogni giorno: -14 LUFS, il livello dei social. Il video si copia, l'audio si rifà.
const normale = join(VIDEO, "out", `reel-${post.id}-norm.mp4`);
const volume = spawnSync(
  "ffmpeg",
  ["-v", "error", "-y", "-i", uscita, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "128k", normale],
  { stdio: "inherit" },
);
if (volume.status === 0) renameSync(normale, uscita);
else console.warn("Non sono riuscito a regolare il volume: il video resta com'è.");
console.log(
  `Fatto: video/out/reel-${post.id}.mp4 (${(composition.durationInFrames / composition.fps).toFixed(1)} s, ${voce ? "con la voce" : "senza voce"})`,
);
