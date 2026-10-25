import { describe, expect, it } from "vitest";
import { trovaPost } from "../data/post";
import { dataSvizzera, didascalia, linkSito, testiAlternativi, testoLinkedIn } from "./post";

describe("didascalie", () => {
  const consiglio = trovaPost("google-maps");
  const lavoro = trovaPost("lavoro-essenza");

  it("su Instagram rimanda alla bio, altrove mette il link con la provenienza", () => {
    expect(didascalia(consiglio, "instagram")).toContain("link nella bio.");
    expect(didascalia(consiglio, "instagram")).not.toContain("utm_source");
    expect(didascalia(consiglio, "facebook")).toContain("https://weblinkx.ch/?utm_source=facebook");
  });

  it("i consigli citano le fonti, i lavori invitano a «un sito così»", () => {
    expect(didascalia(consiglio, "facebook")).toContain("Fonte:\n• Suggerimenti per migliorare il posizionamento");
    expect(didascalia(lavoro, "facebook")).toContain("Vuoi un sito così per la tua attività?");
    expect(didascalia(lavoro, "facebook")).not.toContain("Fonte");
  });

  it("gli hashtag in fondo: i tre comuni e quelli del post", () => {
    expect(didascalia(lavoro, "instagram").endsWith("#Ticino #WebDesign #Weblinkx #Vacallo #CentroEstetico")).toBe(true);
  });

  it("un testo alternativo per ogni immagine, senza asterischi", () => {
    const testi = testiAlternativi(lavoro);
    expect(testi).toHaveLength(lavoro.schede.length + 1);
    expect(testi.join(" ")).not.toContain("*");
    expect(testi[1]).toContain("Il sito di EssenZa su un computer");
  });

  it("link, date e caratteri riservati di LinkedIn", () => {
    expect(linkSito("https://weblinkx.ch", "linkedin")).toBe("https://weblinkx.ch/?utm_source=linkedin");
    expect(dataSvizzera("2026-11-05")).toBe("05.11.2026");
    expect(testoLinkedIn("Ciao (prova) #tag")).toBe("Ciao \\(prova\\) \\#tag");
  });
});
