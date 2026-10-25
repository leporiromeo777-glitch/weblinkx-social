import { describe, expect, it } from "vitest";
import { autoreLinkedIn, pubblicaLinkedIn, type ConfigLinkedIn } from "./linkedin";

type Chiamata = { metodo: string; url: string; intestazioni: Record<string, string>; corpo: unknown };

function linkedInFinto(risposta: (c: Chiamata) => Response) {
  const chiamate: Chiamata[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const intestazioni = Object.fromEntries(new Headers(init?.headers).entries());
    const corpo = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    const chiamata = { metodo: init?.method ?? "GET", url: String(input), intestazioni, corpo };
    chiamate.push(chiamata);
    return risposta(chiamata);
  }) as typeof fetch;
  const cfg: ConfigLinkedIn = { token: "segreto", versione: "202610", fetch: f, attesa: async () => {} };
  return { cfg, chiamate };
}

const json = (corpo: unknown, status = 200, intestazioni: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: intestazioni });

describe("autoreLinkedIn", () => {
  it("costruisce l'urn della persona dal profilo OpenID", async () => {
    const { cfg, chiamate } = linkedInFinto(() => json({ sub: "abc123" }));
    expect(await autoreLinkedIn(cfg)).toBe("urn:li:person:abc123");
    expect(chiamate[0].url).toBe("https://api.linkedin.com/v2/userinfo");
    expect(chiamate[0].intestazioni.authorization).toBe("Bearer segreto");
  });

  it("spiega l'errore se il token è scaduto", async () => {
    const { cfg } = linkedInFinto(() => json({ message: "Invalid access token" }, 401));
    await expect(autoreLinkedIn(cfg)).rejects.toThrow("HTTP 401");
  });
});

describe("pubblicaLinkedIn", () => {
  const immagini = [
    { dati: new Uint8Array([1, 2]), testoAlternativo: "Copertina" },
    { dati: new Uint8Array([3, 4]), testoAlternativo: "Fonte" },
  ];

  it("carica le immagini e pubblica un post multi-immagine", async () => {
    let n = 0;
    const { cfg, chiamate } = linkedInFinto((c) => {
      if (c.url.includes("initializeUpload")) {
        n++;
        return json({ value: { uploadUrl: `https://upload.example/${n}`, image: `urn:li:image:${n}` } });
      }
      if (c.url.startsWith("https://upload.example/")) return new Response(null, { status: 201 });
      if (c.url.endsWith("/rest/posts")) return json({}, 201, { "x-restli-id": "urn:li:share:7" });
      throw new Error(`chiamata inattesa ${c.url}`);
    });

    expect(await pubblicaLinkedIn(cfg, "urn:li:person:abc", immagini, "Commento \\(con parentesi\\)")).toBe("urn:li:share:7");

    expect(chiamate.map((c) => `${c.metodo} ${c.url}`)).toEqual([
      "POST https://api.linkedin.com/rest/images?action=initializeUpload",
      "PUT https://upload.example/1",
      "POST https://api.linkedin.com/rest/images?action=initializeUpload",
      "PUT https://upload.example/2",
      "POST https://api.linkedin.com/rest/posts",
    ]);
    expect(chiamate[0].intestazioni).toMatchObject({ "linkedin-version": "202610", "x-restli-protocol-version": "2.0.0" });
    expect(chiamate[0].corpo).toEqual({ initializeUploadRequest: { owner: "urn:li:person:abc" } });
    expect(chiamate[1].corpo).toBe(immagini[0].dati);
    expect(chiamate[4].corpo).toMatchObject({
      author: "urn:li:person:abc",
      commentary: "Commento \\(con parentesi\\)",
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
      content: {
        multiImage: {
          images: [
            { id: "urn:li:image:1", altText: "Copertina" },
            { id: "urn:li:image:2", altText: "Fonte" },
          ],
        },
      },
    });
  });

  it("si ferma se il post non viene creato", async () => {
    const { cfg } = linkedInFinto((c) =>
      c.url.includes("initializeUpload")
        ? json({ value: { uploadUrl: "https://upload.example/1", image: "urn:li:image:1" } })
        : c.metodo === "PUT"
          ? new Response(null, { status: 201 })
          : json({ message: "ACCESS_DENIED" }, 403),
    );
    await expect(pubblicaLinkedIn(cfg, "urn:li:person:abc", immagini, "x")).rejects.toThrow("HTTP 403");
  });
});
