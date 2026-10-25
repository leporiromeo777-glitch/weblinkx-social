import { describe, expect, it } from "vitest";
import { POST_SOCIAL } from "../data/post";
import { analisi, mediana, numeri, valuta, type LetturaPost } from "./analisi";

const ADESSO = new Date("2026-11-05T17:00:00Z");

/** Una lettura di Instagram (carosello) con persone raggiunte e interazioni. */
function ig(post: string, reach: number, saved = 0, likes = 0, giorni = 5): LetturaPost {
  const data = POST_SOCIAL.find((p) => p.id === post)!.uscite.carosello!;
  return { data, post, piattaforma: "instagram", formato: "carosello", giorni, metriche: { reach, saved, likes } };
}

const [a, b, c, d] = POST_SOCIAL.map((p) => p.id);

describe("numeri", () => {
  it("pesa salvataggi e condivisioni più dei mi piace", () => {
    const n = numeri({ ...ig(a, 100, 2, 4), metriche: { reach: 100, saved: 2, likes: 4, shares: 1, comments: 1 } });
    expect(n.interazioni).toBe(2 * 3 + 1 * 3 + 1 * 2 + 4);
    expect(n.tasso).toBeCloseTo(0.15);
  });

  it("legge i nomi delle metriche di Facebook e dei Reel", () => {
    const fb = numeri({
      data: "2026-10-21",
      post: a,
      piattaforma: "facebook",
      formato: "carosello",
      giorni: 3,
      metriche: { post_total_media_view_unique: 80, post_reactions_by_type_total: 5, shares: 1 },
    });
    expect(fb).toMatchObject({ copertura: 80, miPiace: 5, condivisioni: 1 });
    const reel = numeri({
      data: "2026-10-21",
      post: a,
      piattaforma: "instagram",
      formato: "video",
      giorni: 3,
      metriche: { reach: 50, ig_reels_avg_watch_time: 6500, reels_skip_rate: 40 },
    });
    expect(reel).toMatchObject({ copertura: 50, visioneMedia: 6.5, saltati: 40 });
  });
});

describe("mediana", () => {
  it("con numero pari e dispari di valori", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBe(0);
  });
});

describe("valuta", () => {
  it("riconosce il post visto da pochi ma utile e quello visto da tanti ma ignorato", () => {
    const letture = [ig(a, 100, 2, 5), ig(b, 100, 2, 5), ig(c, 40, 4, 4), ig(d, 300, 0, 1)];
    const v = new Map(valuta(letture).map((x) => [x.lettura.post, x]));
    expect(v.get(a)!.indice).toBeCloseTo(1, 1);
    expect(v.get(c)!.perche[0]).toContain("l'hanno visto in pochi");
    expect(v.get(d)!.perche[0]).toContain("pochi l'hanno salvato");
    expect(v.get(c)!.perche.join(" ")).toContain("salvataggi");
  });

  it("non confronta i post troppo giovani e segnala i gruppi con pochi post", () => {
    const v = valuta([ig(a, 100, 1, 1), ig(b, 100, 1, 1, 1)]);
    expect(v).toHaveLength(1);
    expect(v[0].affidabile).toBe(false);
  });

  it("nei Reel segnala chi salta l'inizio", () => {
    const reel = (post: string, skip: number): LetturaPost => ({
      data: "2026-10-21",
      post,
      piattaforma: "instagram",
      formato: "video",
      giorni: 4,
      metriche: { reach: 100, likes: 3, reels_skip_rate: skip, ig_reels_avg_watch_time: 8000 },
    });
    const v = valuta([reel(a, 30), reel(b, 32), reel(c, 60)]);
    expect(v[2].perche.join(" ")).toContain("60% lo salta");
  });
});

describe("analisi", () => {
  it("senza statistiche lo dice e rimanda al README", () => {
    expect(analisi(POST_SOCIAL, [], ADESSO)).toContain("Nessuna statistica ancora");
  });

  it("scrive classifica, migliore e peggiore e il confronto fra formati", () => {
    const testo = analisi(POST_SOCIAL, [ig(a, 100, 2, 5), ig(b, 100, 2, 5), ig(c, 40, 4, 4), ig(d, 300, 0, 1)], ADESSO);
    expect(testo).toContain("Aggiornata il 05.11.2026");
    expect(testo).toContain("## Classifica");
    expect(testo).toContain("**Il migliore**");
    expect(testo).toContain("**Il peggiore**");
    expect(testo).toContain("| Instagram | carosello | 4 |");
    expect(testo).not.toMatch(/NaN|undefined|BLEO/);
  });
});
