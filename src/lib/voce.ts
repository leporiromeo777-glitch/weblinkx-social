/**
 * Il testo che la voce legge nel video del post (video/src/Reel.tsx): una
 * frase per scheda, ricavata dalle schede stesse, e una chiusura. Le voci si
 * fanno con ElevenLabs (voce «Holden», vedi social/README.md) e stanno in
 * video/sorgenti/voci/ con il testo usato in voci.json: se il testo cambia,
 * la voce va rifatta.
 *
 * Per la pronuncia: i nomi come si dicono («Weblinks», «Sladja»), le date
 * in parole, niente parentesi né virgolette né asterischi.
 */
// Relativo: lo usa anche video/.
import type { PostSocial, SchedaPost } from "../data/post";

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

/** Le parole che la voce sbaglia, con come si dicono. */
const PRONUNCIA: readonly [RegExp, string][] = [
  [/\bWeblinkx\b/g, "Weblinks"],
  [/\bEssenZa\b/g, "Essenza"],
  [/Slađa/g, "Sladja"],
  [/\bJF Limo\b/g, "Jei-Ef Limo"],
  [/\bNCC\b/g, "enne-ci-ci"],
  [/info@tuaattivita\.ch/g, "info chiocciola tua attività punto ci-acca"],
  [/\bGmail\b/g, "Gi-mail"],
  [/\bHTTPS\b/g, "acca-ti-ti-pi-esse"],
  [/\bwa\.me\//g, "wa punto me barra"],
  [/\.ch\b/g, " punto ci-acca"],
  [/ \+,/g, " il segno più,"],
  [/(\d),(\d)/g, "$1 virgola $2"],
];

/** «1.9.2023» → «primo settembre 2023». */
function dateInParole(testo: string): string {
  return testo.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, (_, g: string, m: string, a: string) => {
    const giorno = Number(g);
    return `${giorno === 1 ? "primo" : giorno} ${MESI[Number(m) - 1]} ${a}`;
  });
}

/** Una frase della voce: niente parentesi, virgolette o asterischi; date e nomi come si dicono. */
export function perLaVoce(testo: string): string {
  let t = dateInParole(testo.replace(/\s*\([^)]*\)/g, "").replace(/[«»"*]/g, ""));
  for (const [cerca, metti] of PRONUNCIA) t = t.replace(cerca, metti);
  return t.replace(/\s+/g, " ").trim();
}

const maiuscola = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;

/** Una frase finita: con la maiuscola e il punto, se non ha già la sua punteggiatura. */
function frase(testo: string): string {
  const t = maiuscola(perLaVoce(testo));
  return /[.!?:]$/.test(t) ? t : `${t}.`;
}

/** Un titolo seguito da un elenco: con i due punti, se non è una domanda. */
function titoloElenco(titolo: string): string {
  const t = maiuscola(perLaVoce(titolo)).replace(/[.:]$/, "");
  return /[?!]$/.test(t) ? t : `${t}:`;
}

/**
 * Il testo che la voce legge su una scheda. Negli elenchi ogni punto va a
 * capo: la pausa fa comparire il punto successivo (video/scripts/reel.ts).
 */
export function testoVoceScheda(scheda: SchedaPost): string {
  switch (scheda.tipo) {
    case "copertina":
      // L'occhiello si legge solo quando presenta Weblinkx.
      return [...(/Weblinkx/.test(scheda.occhiello) ? [`${perLaVoce(scheda.occhiello)}!`] : []), frase(scheda.titolo)].join(" ");
    case "punti":
      return [titoloElenco(scheda.titolo), ...scheda.punti.map(frase)].join("\n");
    case "sito":
      return `${frase(scheda.titolo)} ${frase(scheda.testo)}`;
    case "cifra":
      return `${frase(scheda.cifra)} ${frase(scheda.testo)}`;
    case "confronto":
      return [titoloElenco(scheda.titolo), frase(scheda.no), frase(scheda.si)].join("\n");
  }
}

/** Le frasi del video di un post, una per scheda, in ordine; la chiusura a parte (chiusuraVoce). */
export function testiVoce(post: PostSocial): string[] {
  return post.schede.map(testoVoceScheda);
}

/** Le chiusure dei video: per i lavori, per i consigli con fonti, per gli altri. */
export const CHIUSURE = {
  "chiusura-lavoro.mp3": "Vuoi un sito così per la tua attività? Scrivimi: il preventivo è senza impegno. Il link è nel profilo!",
  "chiusura-fonti.mp3":
    "Le fonti ufficiali sono nel post. Ti serve un sito, un logo o un video? Scrivimi: il preventivo è senza impegno. Il link è nel profilo!",
  "chiusura.mp3": "Ti serve un sito, un logo o un video? Scrivimi: il preventivo è senza impegno. Il link è nel profilo!",
} as const;
export type FileChiusura = keyof typeof CHIUSURE;

/** Il file della chiusura di un post. */
export function chiusuraVoce(post: PostSocial): FileChiusura {
  if (post.categoria === "lavoro") return "chiusura-lavoro.mp3";
  return post.fonti.length ? "chiusura-fonti.mp3" : "chiusura.mp3";
}
