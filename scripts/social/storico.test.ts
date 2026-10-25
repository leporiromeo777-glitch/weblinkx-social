import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST_SOCIAL, postDelGiorno } from "../../src/data/post";
import { PIATTAFORME } from "../../src/lib/post";
import { aggiungiAlloStorico, FILE_STORICO, FORMATI, giaPubblicato, togliDalloStorico, type VoceStorico } from "./storico";

const voce = (v: Partial<VoceStorico>): VoceStorico => ({
  data: "2026-10-21",
  post: "ciao-sono-weblinkx",
  piattaforma: "instagram",
  formato: "carosello",
  id: "1",
  pubblicatoIl: "2026-10-21T16:42:00Z",
  ...v,
});

describe("storico delle pubblicazioni", () => {
  it("toglie la voce di un post cancellato, così il ripubblicato la sostituisce", () => {
    const vecchia = voce({ formato: "video", id: "cancellato" });
    const altra = voce({ id: "2" });
    const storico = togliDalloStorico([vecchia, altra], vecchia);
    expect(storico).toEqual([altra]);
    expect(aggiungiAlloStorico(storico, [voce({ formato: "video", id: "nuovo" })]).map((v) => v.id)).toEqual(["2", "nuovo"]);
  });

  it("riconosce un post già pubblicato sullo stesso social e nello stesso formato", () => {
    const storico = [voce({})];
    expect(giaPubblicato(storico, { data: "2026-10-21", post: "ciao-sono-weblinkx", piattaforma: "instagram", formato: "carosello" })).toBe(
      storico[0],
    );
    expect(giaPubblicato(storico, { data: "2026-10-21", post: "ciao-sono-weblinkx", piattaforma: "facebook", formato: "carosello" })).toBeUndefined();
    expect(giaPubblicato(storico, { data: "2026-10-21", post: "ciao-sono-weblinkx", piattaforma: "instagram", formato: "video" })).toBeUndefined();
  });

  it("tiene le voci in ordine di data e di social", () => {
    const storico = aggiungiAlloStorico([voce({ data: "2026-10-22", id: "3" })], [voce({ piattaforma: "facebook", id: "2" }), voce({ id: "1" })]);
    expect(storico.map((v) => v.id)).toEqual(["2", "1", "3"]);
  });

  it("il file nel repository è valido", () => {
    if (!existsSync(FILE_STORICO)) return;
    const storico = JSON.parse(readFileSync(FILE_STORICO, "utf8")) as VoceStorico[];
    const post = new Set(POST_SOCIAL.map((p) => p.id));
    for (const v of storico) {
      expect(v.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.has(v.post), v.post).toBe(true);
      expect(PIATTAFORME).toContain(v.piattaforma);
      expect(FORMATI).toContain(v.formato);
      expect(v.id).not.toBe("");
      // I giorni già usciti non si spostano: il calendario deve dire lo stesso post.
      expect(postDelGiorno(v.data, v.formato)?.id, `${v.formato} del ${v.data}`).toBe(v.post);
    }
  });
});
