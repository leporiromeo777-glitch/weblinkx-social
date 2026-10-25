import { describe, expect, it } from "vitest";
import { leggiConfigurazione, statoPiattaforma, VERSIONE_LINKEDIN, VERSIONE_META } from "./configurazione";

const ADESSO = new Date("2026-10-21T08:00:00Z");

describe("leggiConfigurazione", () => {
  it("senza variabili: oggi in Svizzera, tutti i social richiesti, nessuno collegato", () => {
    const conf = leggiConfigurazione({}, ADESSO);
    expect(conf).toMatchObject({
      data: "2026-10-21",
      prova: false,
      ripubblica: false,
      formato: "carosello",
      video: null,
      piattaforme: ["instagram", "facebook", "linkedin"],
      errori: [],
    });
    expect(conf.meta).toBeNull();
    expect(conf.linkedin).toBeNull();
    for (const p of conf.piattaforme) expect(statoPiattaforma(conf, p)?.stato).toBe("non collegato");
  });

  it("su GitHub le immagini si prendono dal commit in corso", () => {
    const conf = leggiConfigurazione({ GITHUB_REPOSITORY: "io/bussola", GITHUB_SHA: "abc123" }, ADESSO);
    expect(conf.immaginiUrl).toBe("https://raw.githubusercontent.com/io/bussola/abc123/social");
    expect(leggiConfigurazione({ SOCIAL_IMMAGINI_URL: "https://cdn.example/social/" }).immaginiUrl).toBe(
      "https://cdn.example/social",
    );
  });

  it("legge credenziali, versioni e scelte", () => {
    const conf = leggiConfigurazione(
      {
        SOCIAL_DATA: "2026-11-01",
        SOCIAL_PIATTAFORME: " LinkedIn, instagram ",
        SOCIAL_PROVA: "true",
        SOCIAL_RIPUBBLICA: "true",
        SOCIAL_FORMATO: "Video",
        SOCIAL_VIDEO: "video/out/reel.mp4",
        SITO_URL: "https://bleo.example.ch/",
        META_PAGE_TOKEN: "t",
        INSTAGRAM_USER_ID: "17",
        LINKEDIN_TOKEN: "l",
      },
      ADESSO,
    );
    expect(conf).toMatchObject({
      data: "2026-11-01",
      prova: true,
      ripubblica: true,
      formato: "video",
      video: "video/out/reel.mp4",
      piattaforme: ["instagram", "linkedin"],
      sitoUrl: "https://bleo.example.ch",
      meta: { token: "t", versione: VERSIONE_META, instagramId: "17", paginaId: null },
      linkedin: { token: "l", versione: VERSIONE_LINKEDIN },
      errori: [],
    });
  });

  it("segnala valori sbagliati", () => {
    const conf = leggiConfigurazione({
      SOCIAL_DATA: "1.11.2026",
      SOCIAL_PIATTAFORME: "tiktok",
      SITO_URL: "http://localhost:3000",
      SOCIAL_FORMATO: "storia",
    });
    expect(conf.errori).toHaveLength(4);
    expect(conf.errori.join(" ")).toContain("tiktok");
    expect(conf.errori.join(" ")).toContain("storia");
  });
});

describe("statoPiattaforma", () => {
  it("con le credenziali ma senza indirizzi la configurazione è incompleta", () => {
    const conf = leggiConfigurazione({ META_PAGE_TOKEN: "t", INSTAGRAM_USER_ID: "17", FACEBOOK_PAGE_ID: "99", LINKEDIN_TOKEN: "l" });
    expect(statoPiattaforma(conf, "instagram")).toEqual({ stato: "incompleto", motivo: "manca SOCIAL_IMMAGINI_URL" });
    expect(statoPiattaforma(conf, "facebook")).toEqual({ stato: "incompleto", motivo: "manca SOCIAL_IMMAGINI_URL e SITO_URL" });
    expect(statoPiattaforma(conf, "linkedin")).toEqual({ stato: "incompleto", motivo: "manca SITO_URL" });
  });

  it("per il video l'indirizzo delle immagini non serve: si carica il file", () => {
    const conf = leggiConfigurazione({
      SOCIAL_FORMATO: "video",
      META_PAGE_TOKEN: "t",
      INSTAGRAM_USER_ID: "17",
      FACEBOOK_PAGE_ID: "99",
      SITO_URL: "https://bleo.example.ch",
    });
    expect(statoPiattaforma(conf, "instagram")).toBeNull();
    expect(statoPiattaforma(conf, "facebook")).toBeNull();
  });

  it("con tutto è pronta", () => {
    const conf = leggiConfigurazione({
      META_PAGE_TOKEN: "t",
      INSTAGRAM_USER_ID: "17",
      FACEBOOK_PAGE_ID: "99",
      LINKEDIN_TOKEN: "l",
      SITO_URL: "https://bleo.example.ch",
      SOCIAL_IMMAGINI_URL: "https://cdn.example/social",
    });
    for (const p of conf.piattaforme) expect(statoPiattaforma(conf, p)).toBeNull();
  });
});
