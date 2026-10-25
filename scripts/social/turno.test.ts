import { describe, expect, it } from "vitest";
import { giornoDelPiano, postDelGiorno } from "../../src/data/post";
import type { VoceStorico } from "./storico";
import { cosaPubblicare, momentoDiControllare, oraInSvizzera } from "./turno";

const SOCIAL = { video: 2, carosello: 2 };
const giorno = giornoDelPiano(1);
const uscito = (piattaforma: VoceStorico["piattaforma"], formato: VoceStorico["formato"]): VoceStorico => ({
  data: giorno,
  post: postDelGiorno(giorno, formato)!.id,
  piattaforma,
  formato,
  id: "1",
  pubblicatoIl: `${giorno}T12:00:00Z`,
});
// Dal 25 ottobre al 28 marzo la Svizzera è a UTC+1.
const alle = (ora: number) => new Date(`${giorno}T${String(ora - 1).padStart(2, "0")}:20:00Z`);

describe("cosaPubblicare", () => {
  it("prima delle 12 niente, poi il video, dalle 19 il carosello", () => {
    expect(oraInSvizzera(alle(11))).toBe(11);
    expect(cosaPubblicare([], alle(11), SOCIAL)).toBeNull();
    expect(cosaPubblicare([], alle(12), SOCIAL)).toBe("video");
    const video = [uscito("instagram", "video"), uscito("facebook", "video")];
    expect(cosaPubblicare(video, alle(15), SOCIAL)).toBeNull();
    expect(cosaPubblicare(video, alle(19), SOCIAL)).toBe("carosello");
    expect(cosaPubblicare([...video, uscito("instagram", "carosello"), uscito("facebook", "carosello")], alle(21), SOCIAL)).toBeNull();
  });

  it("riprova finché un formato non è uscito su tutti i social", () => {
    expect(cosaPubblicare([uscito("instagram", "video")], alle(14), SOCIAL)).toBe("video");
    expect(cosaPubblicare([uscito("instagram", "carosello")], alle(20), { video: 0, carosello: 3 })).toBe("carosello");
  });

  it("la sera il carosello passa prima di un video che non riesce a uscire", () => {
    expect(cosaPubblicare([], alle(19), SOCIAL)).toBe("carosello");
  });

  it("senza un post per oggi non fa nulla", () => {
    expect(cosaPubblicare([], new Date("2030-01-01T15:00:00Z"), SOCIAL)).toBeNull();
  });

  it("senza social collegati non fa nulla", () => {
    expect(cosaPubblicare([], alle(20), { video: 0, carosello: 0 })).toBeNull();
  });
});

describe("momentoDiControllare", () => {
  it("dalle 12 a mezzanotte, ora svizzera", () => {
    expect(momentoDiControllare(alle(11))).toBe(false);
    expect(momentoDiControllare(alle(12))).toBe(true);
    expect(momentoDiControllare(alle(23))).toBe(true);
    expect(momentoDiControllare(new Date(`${giorno}T23:30:00Z`))).toBe(false);
  });
});
