/**
 * Didascalie e testi alternativi dei post (src/data/post.ts), uguali per
 * tutti i social tranne l'invito: su Instagram i link nel testo non si
 * aprono, quindi si rimanda al link nella bio.
 */
import { MARCHIO } from "../data/marchio";
import { LAVORI } from "../data/lavori";
import { HASHTAG_COMUNI, INVITO, senzaEvidenza, type PostSocial, type SchedaPost } from "../data/post";

export const PIATTAFORME = ["instagram", "facebook", "linkedin"] as const;
export type Piattaforma = (typeof PIATTAFORME)[number];

/** Lunghezza massima della didascalia di ogni social. */
export const LIMITI_DIDASCALIA: Record<Piattaforma, number> = {
  instagram: 2_200,
  facebook: 63_206,
  linkedin: 3_000,
};

/** Giorno di oggi in Svizzera (ISO), quello che decide quale post esce. */
export function oggiInSvizzera(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(adesso);
}

/** «2026-11-05» → «05.11.2026». */
export function dataSvizzera(iso: string): string {
  const [anno, mese, giorno] = iso.slice(0, 10).split("-");
  return `${giorno}.${mese}.${anno}`;
}

/** Link al sito con la provenienza (utm_source), per sapere da quale social arriva chi scrive. */
export function linkSito(sitoUrl: string, piattaforma: Piattaforma): string {
  const url = new URL("/", sitoUrl);
  url.searchParams.set("utm_source", piattaforma);
  return url.toString();
}

/**
 * Caratteri riservati del formato «little» di LinkedIn: vanno preceduti da
 * una barra rovesciata, altrimenti il post può uscire tagliato.
 */
export function testoLinkedIn(testo: string): string {
  return testo.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
}

/** La domanda dell'invito: per i lavori «un sito così», per gli altri post sito, logo o video. */
export function domandaInvito(post: PostSocial): string {
  return post.categoria === "lavoro" ? INVITO.lavoro : INVITO.altro;
}

export function didascalia(post: PostSocial, piattaforma: Piattaforma, sitoUrl: string = MARCHIO.sito): string {
  const invito = `${domandaInvito(post)} ${INVITO.sotto}${piattaforma === "instagram" ? ": link nella bio." : `: ${linkSito(sitoUrl, piattaforma)}`}`;
  const fonti = post.fonti.length
    ? ["", `${post.fonti.length === 1 ? "Fonte" : "Fonti"}:`, ...post.fonti.map((f) => `• ${f.titolo}, ${f.ente}: ${f.url}`)]
    : [];
  const corpo = [post.testo, ...fonti, "", invito].join("\n");
  const hashtag = [...HASHTAG_COMUNI, ...post.hashtag].join(" ");
  // Gli hashtag restano senza barre: su LinkedIn «#parola» è già un hashtag.
  return `${piattaforma === "linkedin" ? testoLinkedIn(corpo) : corpo}\n\n${hashtag}`;
}

/** Descrizione di una scheda, per chi usa un lettore di schermo. */
export function testoAlternativo(scheda: SchedaPost): string {
  switch (scheda.tipo) {
    case "copertina":
      return `${scheda.occhiello}: ${senzaEvidenza(scheda.titolo)}`;
    case "punti":
      return `${scheda.titolo}: ${scheda.punti.join("; ")}`;
    case "sito": {
      const l = LAVORI[scheda.lavoro];
      return `Il sito di ${l.nome} su ${scheda.vista === "mobile" ? "un telefono" : "un computer"}. ${scheda.titolo}: ${scheda.testo}`;
    }
    case "cifra":
      return `${scheda.cifra}: ${scheda.testo}`;
    case "confronto":
      return `${scheda.titolo}. No: ${scheda.no}. Sì: ${scheda.si}`;
  }
}

/** Descrizione di ogni immagine del post, l'invito finale compreso. */
export function testiAlternativi(post: PostSocial): string[] {
  const fonte = post.fonti[0];
  return [
    ...post.schede.map(testoAlternativo),
    `${domandaInvito(post)} ${INVITO.sotto}. ${MARCHIO.sito.replace("https://", "")}${fonte ? `. Fonte: ${fonte.titolo}, ${fonte.ente}` : ""}`,
  ];
}
