import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST_SOCIAL, trovaPost } from "../data/post";
import { chiusuraVoce, CHIUSURE, perLaVoce, testiVoce } from "./voce";

describe("perLaVoce", () => {
  it("dice i nomi come si pronunciano e le date in parole", () => {
    expect(perLaVoce("Come nasce un sito *con Weblinkx*")).toBe("Come nasce un sito con Weblinks");
    expect(perLaVoce("1.9.2023")).toBe("primo settembre 2023");
    expect(perLaVoce("2,5 secondi")).toBe("2 virgola 5 secondi");
    expect(perLaVoce("Il sito di EssenZa (Vacallo)")).toBe("Il sito di Essenza");
    expect(perLaVoce("Slađa e Swiss NCC")).toBe("Sladja e Swiss enne-ci-ci");
  });
});

describe("testiVoce", () => {
  it("una frase per scheda; negli elenchi un punto per riga", () => {
    const post = trovaPost("google-maps");
    const testi = testiVoce(post);
    expect(testi).toHaveLength(post.schede.length);
    expect(testi[1].split("\n")).toHaveLength(4);
  });

  it("la chiusura giusta per ogni post", () => {
    expect(chiusuraVoce(trovaPost("lavoro-essenza"))).toBe("chiusura-lavoro.mp3");
    expect(chiusuraVoce(trovaPost("google-maps"))).toBe("chiusura-fonti.mp3");
    expect(chiusuraVoce(trovaPost("come-nasce-un-sito"))).toBe("chiusura.mp3");
  });

  it("le voci in video/sorgenti/voci corrispondono ai testi di oggi (se no vanno rifatte, social/README.md)", () => {
    const registrate = JSON.parse(readFileSync("video/sorgenti/voci/voci.json", "utf8")) as Record<string, string>;
    for (const [file, testo] of Object.entries(CHIUSURE)) expect(registrate[file]).toBe(testo);
    for (const post of POST_SOCIAL) {
      testiVoce(post).forEach((testo, i) => {
        expect(registrate[`${post.id}/${String(i + 1).padStart(2, "0")}.mp3`], `${post.id} scheda ${i + 1}`).toBe(testo);
      });
    }
  });
});
