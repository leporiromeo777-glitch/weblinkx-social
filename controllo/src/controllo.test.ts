import { describe, expect, it } from "vitest";
import { FONTI as FONTI_REPO, VERIFICATO_IL as VERIFICATO_REPO } from "../../src/data/fonti";
import { analizzaHtml, controlla, ErroreControllo, esiti, indirizzoPrivato, nomeSito, normalizzaUrl, type Pagina } from "./controllo";
import { dataSvizzera, emailAvviso, emailRapporto } from "./email";
import { FONTI, VERIFICATO_IL } from "./fonti";

const PAGINA_BUONA: Pagina = { titolo: "EssenZa, centro estetico a Vacallo", descrizione: "Trattamenti viso e corpo", viewport: true, telefono: true, whatsapp: false, email: true };

describe("le fonti", () => {
  it("sono le stesse di src/data/fonti.ts", () => {
    expect(VERIFICATO_IL).toBe(VERIFICATO_REPO);
    for (const [chiave, fonte] of Object.entries(FONTI)) expect(fonte, chiave).toEqual(FONTI_REPO[chiave as keyof typeof FONTI_REPO]);
  });
});

describe("normalizzaUrl", () => {
  it("aggiunge https:// e toglie il resto", () => {
    expect(normalizzaUrl("  essenzacentroestetico.ch ")?.toString()).toBe("https://essenzacentroestetico.ch/");
    expect(normalizzaUrl("http://www.esempio.ch/chi-siamo#team")?.toString()).toBe("http://www.esempio.ch/chi-siamo");
  });

  it("apre solo siti pubblici", () => {
    for (const no of ["", "localhost", "http://localhost:3000", "127.0.0.1", "http://10.0.0.1/", "http://[::1]/", "ftp://esempio.ch", "file:///etc/passwd", "https://utente:pw@esempio.ch", "https://esempio.ch:8080", "server.local", "due parole.ch"]) {
      expect(normalizzaUrl(no), no).toBeNull();
    }
  });
});

describe("indirizzoPrivato", () => {
  it("riconosce le reti interne", () => {
    for (const ip of ["10.1.2.3", "127.0.0.1", "192.168.1.1", "172.20.0.5", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd12::1", "fe80::1", "::ffff:10.0.0.1"]) expect(indirizzoPrivato(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "185.199.108.153", "172.32.0.1", "2a00:1450:4002::1"]) expect(indirizzoPrivato(ip), ip).toBe(false);
  });
});

describe("analizzaHtml", () => {
  it("legge titolo, descrizione, viewport e contatti", () => {
    const html = `<html><head><title> Pizzeria &amp; Grotto   Da Mario </title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <META NAME="Description" CONTENT='Pizza al forno a legna a Lugano'></head>
      <body><a href="tel:+41911234567">Chiama</a> <a class="x" href='https://wa.me/41791234567'>WhatsApp</a></body></html>`;
    expect(analizzaHtml(html)).toEqual({
      titolo: "Pizzeria & Grotto Da Mario",
      descrizione: "Pizza al forno a legna a Lugano",
      viewport: true,
      telefono: true,
      whatsapp: true,
      email: false,
    });
  });

  it("una pagina vuota non ha nulla", () => {
    expect(analizzaHtml("<html><title></title><meta name='viewport' content='width=1024'></html>")).toEqual({
      titolo: undefined,
      descrizione: undefined,
      viewport: false,
      telefono: false,
      whatsapp: false,
      email: false,
    });
  });
});

describe("esiti", () => {
  it("un buon sito ha tutto a posto, con la sua fonte", () => {
    const tutti = esiti(new URL("https://essenzacentroestetico.ch/"), PAGINA_BUONA, 1_900);
    expect(tutti.map((e) => e.id)).toEqual(["https", "telefono", "titolo", "descrizione", "contatto", "velocita"]);
    expect(tutti.every((e) => e.stato === "ok")).toBe(true);
    expect(tutti.find((e) => e.id === "velocita")!.testo).toContain("1,9 secondi");
    for (const e of tutti) expect(Object.values(FONTI)).toContainEqual(e.fonte);
  });

  it("segna quello che manca", () => {
    const pagina: Pagina = { titolo: "Home", viewport: false, telefono: false, whatsapp: false, email: false };
    const tutti = esiti(new URL("http://esempio.ch/"), pagina, 4_200);
    expect(tutti.map((e) => e.stato)).toEqual(Array(6).fill("da-migliorare"));
    expect(tutti.find((e) => e.id === "titolo")!.testo).toContain("«Home»");
    expect(tutti.find((e) => e.id === "velocita")!.fonte).toEqual(FONTI.lcp);
  });

  it("la soglia della velocità è quella di web.dev: 2,5 secondi", () => {
    expect(esiti(new URL("https://a.ch/"), PAGINA_BUONA, 2_500).at(-1)!.stato).toBe("ok");
    expect(esiti(new URL("https://a.ch/"), PAGINA_BUONA, 2_501).at(-1)!.stato).toBe("da-migliorare");
  });

  it("senza misura la velocità resta da controllare con PageSpeed", () => {
    const velocita = esiti(new URL("https://a.ch/"), PAGINA_BUONA).at(-1)!;
    expect(velocita.stato).toBe("non-controllato");
    expect(velocita.fonte).toEqual(FONTI.pageSpeed);
  });
});

describe("controlla", () => {
  it("rifiuta gli indirizzi interni senza aprirli", async () => {
    await expect(controlla("localhost")).rejects.toBeInstanceOf(ErroreControllo);
    await expect(controlla("http://192.168.1.1")).rejects.toBeInstanceOf(ErroreControllo);
  });

  it("mostra il sito senza https e www", () => {
    expect(nomeSito(new URL("https://www.esempio.ch/"))).toBe("esempio.ch");
    expect(nomeSito(new URL("https://esempio.ch/negozio/"))).toBe("esempio.ch/negozio");
  });
});

describe("le email", () => {
  const controllo = {
    url: "https://esempio.ch/",
    sito: "esempio.ch",
    quando: "2026-10-26T09:30:00Z",
    esiti: esiti(new URL("https://esempio.ch/"), { ...PAGINA_BUONA, titolo: "<script>alert(1)</script>", descrizione: undefined }),
  };

  it("il rapporto ha ogni risultato con la fonte, e l'invito senza impegno", () => {
    const email = emailRapporto(controllo, { nome: "Mario", email: "mario@esempio.ch" }, "https://controllo.weblinkx.ch");
    expect(email.oggetto).toBe("Il controllo del tuo sito esempio.ch");
    expect(email.testo).toContain("Ciao Mario,");
    expect(email.testo).toContain("del 26.10.2026");
    for (const e of controllo.esiti) {
      expect(email.testo).toContain(e.titolo);
      expect(email.testo).toContain(e.fonte.url);
    }
    expect(email.testo).toContain("C'è un punto da migliorare");
    expect(email.testo).toContain("preventivo è senza impegno");
    expect(email.testo).toMatch(/informazioni generali/i);
    expect(email.testo).toContain("su controllo.weblinkx.ch");
    // Il titolo arriva dal sito controllato: nell'HTML non deve diventare codice.
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("l'avviso a Romeo dice chi è e cosa migliorare", () => {
    const email = emailAvviso(controllo, { nome: "Mario", email: "mario@esempio.ch", telefono: "079 123 45 67" });
    expect(email.oggetto).toBe("Nuovo contatto: Mario ha controllato esempio.ch");
    expect(email.testo).toContain("Telefono: 079 123 45 67");
    expect(email.testo).toContain("Da migliorare (1): La descrizione su Google");
  });

  it("le date sono svizzere", () => {
    expect(dataSvizzera("2026-11-05T23:30:00Z")).toBe("06.11.2026");
  });
});
