import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { didascalia, LIMITI_DIDASCALIA, PIATTAFORME } from "../lib/post";
import { ID_LAVORI, type IdLavoro } from "./lavori";
import {
  FINE_PIANO,
  giornoDelPiano,
  HASHTAG_COMUNI,
  immaginiPost,
  INIZIO_PIANO,
  POST_FUORI_PIANO,
  POST_SOCIAL,
  postDelGiorno,
  senzaEvidenza,
} from "./post";

const dimensioni = JSON.parse(readFileSync("risorse/siti/dimensioni.json", "utf8")) as Record<string, Record<string, unknown>>;

/** I lavori mostrati in un post, dalla copertina e dalle schede dei siti. */
function lavoriDelPost(post: (typeof POST_SOCIAL)[number]): IdLavoro[] {
  return [
    ...(post.lavoro ? [post.lavoro] : []),
    ...post.schede.flatMap((s) => (s.tipo === "sito" || (s.tipo === "copertina" && s.lavoro) ? [s.lavoro!] : [])),
  ];
}

describe("piano dei post", () => {
  it("ogni giorno un video e un carosello su due post diversi", () => {
    expect(POST_FUORI_PIANO).toEqual([]);
    expect(new Set(POST_SOCIAL.map((p) => p.id)).size).toBe(POST_SOCIAL.length);
    for (let i = 0; i < POST_SOCIAL.length; i++) {
      const giorno = giornoDelPiano(i);
      const video = postDelGiorno(giorno, "video");
      const carosello = postDelGiorno(giorno, "carosello");
      expect(video, `video del ${giorno}`).toBeDefined();
      expect(carosello, `carosello del ${giorno}`).toBeDefined();
      expect(video!.id).not.toBe(carosello!.id);
    }
    expect(postDelGiorno(INIZIO_PIANO, "video")!.id).toBe("ciao-sono-weblinkx");
    expect(giornoDelPiano(POST_SOCIAL.length - 1)).toBe(FINE_PIANO);
  });

  it("lo stesso argomento torna nell'altro formato dopo almeno 10 giorni", () => {
    for (const p of POST_SOCIAL) {
      const giorni = Math.abs(Date.parse(p.uscite.video) - Date.parse(p.uscite.carosello)) / 86_400_000;
      expect(giorni, p.id).toBeGreaterThanOrEqual(10);
    }
  });

  it.each(POST_SOCIAL.map((p) => [p.id, p] as const))("%s: schede che stanno nelle grafiche", (_, post) => {
    expect(post.schede[0].tipo).toBe("copertina");
    // Un carosello di Instagram ha da 2 a 10 immagini, l'invito finale compreso.
    expect(immaginiPost(post).length).toBeGreaterThanOrEqual(2);
    expect(immaginiPost(post).length).toBeLessThanOrEqual(10);
    for (const s of post.schede) {
      if (s.tipo === "copertina") {
        expect(senzaEvidenza(s.titolo).length).toBeLessThanOrEqual(70);
        expect(s.occhiello.length).toBeLessThanOrEqual(42);
        // Gli asterischi vanno a coppie: ogni parola blu si chiude.
        expect(s.titolo.split("*").length % 2).toBe(1);
      }
      if (s.tipo === "punti") {
        expect(s.punti.length).toBeGreaterThan(0);
        expect(s.punti.length).toBeLessThanOrEqual(4);
        expect(s.titolo.length).toBeLessThanOrEqual(36);
        for (const p of s.punti) expect(p.length, p).toBeLessThanOrEqual(80);
      }
      if (s.tipo === "sito") {
        expect(s.titolo.length).toBeLessThanOrEqual(34);
        expect(s.testo.length).toBeLessThanOrEqual(70);
      }
      if (s.tipo === "cifra") expect(s.cifra.length).toBeLessThanOrEqual(12);
      if (s.tipo === "confronto") for (const t of [s.no, s.si]) expect(t.length).toBeLessThanOrEqual(80);
    }
  });

  it.each(POST_SOCIAL.map((p) => [p.id, p] as const))("%s: le cifre hanno una fonte, i lavori le loro foto", (_, post) => {
    if (post.schede.some((s) => s.tipo === "cifra")) expect(post.fonti.length).toBeGreaterThan(0);
    for (const id of lavoriDelPost(post)) {
      expect(ID_LAVORI).toContain(id);
      for (const vista of ["desktop", "mobile"]) {
        expect(existsSync(`risorse/siti/${id}/${vista}.jpg`), `${id}/${vista}.jpg`).toBe(true);
        expect(dimensioni[id]?.[vista], `dimensioni di ${id}/${vista}`).toBeDefined();
      }
    }
    if (post.categoria === "lavoro") expect(lavoriDelPost(post).length).toBeGreaterThan(0);
    // Leggi e privacy: informazioni generali, non consulenza.
    if (post.fonti.some((f) => f.url.includes("fedlex"))) expect(post.testo).toMatch(/informazioni generali/i);
  });

  it.each(POST_SOCIAL.map((p) => [p.id, p] as const))("%s: hashtag e didascalie nei limiti dei social", (_, post) => {
    expect(post.hashtag.length).toBeLessThanOrEqual(2);
    for (const h of post.hashtag) {
      expect(h).toMatch(/^#[\p{L}\d]+$/u);
      expect(HASHTAG_COMUNI as readonly string[]).not.toContain(h);
    }
    for (const piattaforma of PIATTAFORME) {
      expect(didascalia(post, piattaforma).length).toBeLessThanOrEqual(LIMITI_DIDASCALIA[piattaforma]);
    }
  });

  it.each(POST_SOCIAL.map((p) => [p.id, p] as const))("%s: le immagini sono pronte in social/", (_, post) => {
    for (const nome of immaginiPost(post)) expect(existsSync(`social/${post.id}/${nome}`), `social/${post.id}/${nome}`).toBe(true);
  });
});
