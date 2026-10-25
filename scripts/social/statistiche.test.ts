import { describe, expect, it } from "vitest";
import { aggiornaStatistiche, daLeggere, lettura, type VoceStatistiche } from "./statistiche";
import type { VoceStorico } from "./storico";

const ADESSO = new Date("2026-11-01T17:00:00Z");

const voce = (piattaforma: VoceStorico["piattaforma"], pubblicatoIl: string, id = `${piattaforma}-1`): VoceStorico => ({
  data: pubblicatoIl.slice(0, 10),
  post: "registro-di-commercio",
  piattaforma,
  formato: "carosello",
  id,
  pubblicatoIl,
});

describe("daLeggere", () => {
  it("legge Instagram e Facebook degli ultimi 28 giorni, non LinkedIn", () => {
    const storico = [
      voce("instagram", "2026-10-23T16:45:00Z"),
      voce("facebook", "2026-10-23T16:46:00Z"),
      voce("linkedin", "2026-10-23T16:47:00Z"),
      voce("instagram", "2026-09-01T16:45:00Z", "vecchio"),
    ];
    expect(daLeggere(storico, [], ADESSO).map((v) => v.id)).toEqual(["instagram-1", "facebook-1"]);
  });

  it("salta i post letti da poco", () => {
    const storico = [voce("instagram", "2026-10-23T16:45:00Z"), voce("facebook", "2026-10-23T16:46:00Z")];
    const lette: VoceStatistiche[] = [
      { ...lettura(storico[0], { reach: 10 }, new Date("2026-11-01T11:00:00Z")) },
      { ...lettura(storico[1], { reach: 10 }, new Date("2026-10-31T11:00:00Z")) },
    ];
    expect(daLeggere(storico, lette, ADESSO).map((v) => v.id)).toEqual(["facebook-1"]);
  });
});

describe("aggiornaStatistiche", () => {
  it("sostituisce la lettura vecchia dello stesso post e tiene l'ordine", () => {
    const ig = voce("instagram", "2026-10-23T16:45:00Z");
    const fb = voce("facebook", "2026-10-22T16:45:00Z");
    const vecchie = [lettura(ig, { reach: 10 }, new Date("2026-10-30T17:00:00Z"))];
    const nuove = [lettura(ig, { reach: 25 }, ADESSO), lettura(fb, { post_media_view: 3 }, ADESSO)];
    const tutte = aggiornaStatistiche(vecchie, nuove);
    expect(tutte.map((s) => s.id)).toEqual(["facebook-1", "instagram-1"]);
    expect(tutte[1].metriche.reach).toBe(25);
    expect(tutte[1].giorni).toBe(9);
  });
});
