import { describe, expect, it } from "vitest";
import {
  esisteSuMeta,
  pubblicaFacebook,
  pubblicaInstagram,
  pubblicaReelFacebook,
  pubblicaReelInstagram,
  statisticheFacebook,
  statisticheInstagram,
  verificaMeta,
  type ConfigMeta,
} from "./meta";

type Chiamata = {
  metodo: string;
  url: string;
  parametri: Record<string, string>;
  intestazioni: Record<string, string>;
  /** Byte di un corpo binario (il caricamento di un video). */
  byte: number | null;
};

/** Una Graph API finta: risponde in base a metodo e percorso, e registra le chiamate. */
function graphFinta(risposte: (c: Chiamata) => unknown) {
  const chiamate: Chiamata[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const metodo = init?.method ?? "GET";
    const binario = init?.body instanceof Uint8Array ? init.body : null;
    const parametri = binario
      ? {}
      : Object.fromEntries(metodo === "GET" ? url.searchParams : new URLSearchParams(String(init?.body)));
    const intestazioni = Object.fromEntries(new Headers(init?.headers));
    const chiamata = { metodo, url: `${url.origin}${url.pathname}`, parametri, intestazioni, byte: binario?.byteLength ?? null };
    chiamate.push(chiamata);
    const corpo = risposte(chiamata);
    return new Response(JSON.stringify(corpo), { status: corpo && typeof corpo === "object" && "error" in corpo ? 400 : 200 });
  }) as typeof fetch;
  const cfg: ConfigMeta = { token: "segreto", versione: "v24.0", fetch: f, attesa: async () => {} };
  return { cfg, chiamate };
}

const IMMAGINI = ["https://img.example/01.jpg", "https://img.example/02.jpg"];

describe("pubblicaInstagram", () => {
  it("crea i contenitori delle immagini, il carosello e lo pubblica quando è pronto", async () => {
    let figlio = 0;
    let controlliCarosello = 0;
    const { cfg, chiamate } = graphFinta((c) => {
      if (c.url.endsWith("/17/media") && c.parametri.is_carousel_item) return { id: `figlio-${++figlio}` };
      if (c.url.endsWith("/17/media")) return { id: "carosello" };
      if (c.url.endsWith("/carosello")) return { status_code: ++controlliCarosello < 2 ? "IN_PROGRESS" : "FINISHED" };
      if (c.metodo === "GET") return { status_code: "FINISHED" };
      if (c.url.endsWith("/17/media_publish")) return { id: "post-ig" };
      throw new Error(`chiamata inattesa ${c.url}`);
    });

    expect(await pubblicaInstagram(cfg, "17", IMMAGINI, "Didascalia")).toBe("post-ig");

    const post = chiamate.filter((c) => c.metodo === "POST");
    expect(post.map((c) => c.url)).toEqual([
      "https://graph.facebook.com/v24.0/17/media",
      "https://graph.facebook.com/v24.0/17/media",
      "https://graph.facebook.com/v24.0/17/media",
      "https://graph.facebook.com/v24.0/17/media_publish",
    ]);
    expect(post[0].parametri).toMatchObject({ image_url: IMMAGINI[0], is_carousel_item: "true", access_token: "segreto" });
    expect(post[2].parametri).toMatchObject({ media_type: "CAROUSEL", children: "figlio-1,figlio-2", caption: "Didascalia" });
    expect(post[3].parametri).toMatchObject({ creation_id: "carosello" });
    expect(controlliCarosello).toBe(2);
  });

  it("si ferma con il messaggio di Meta, senza mostrare il token", async () => {
    const { cfg } = graphFinta(() => ({ error: { message: "Invalid OAuth access token." } }));
    const errore = await pubblicaInstagram(cfg, "17", IMMAGINI, "x").catch((e: Error) => e);
    expect(errore).toBeInstanceOf(Error);
    expect((errore as Error).message).toContain("Invalid OAuth access token.");
    expect((errore as Error).message).not.toContain("segreto");
  });

  it("si ferma se un contenitore va in errore", async () => {
    const { cfg } = graphFinta((c) => (c.metodo === "GET" ? { status_code: "ERROR" } : { id: "x" }));
    await expect(pubblicaInstagram(cfg, "17", IMMAGINI, "x")).rejects.toThrow("stato ERROR");
  });

  it("rifiuta caroselli con meno di 2 o più di 10 immagini", async () => {
    const { cfg } = graphFinta(() => ({ id: "x" }));
    await expect(pubblicaInstagram(cfg, "17", IMMAGINI.slice(0, 1), "x")).rejects.toThrow("da 2 a 10");
  });
});

describe("pubblicaFacebook", () => {
  it("carica le foto non pubblicate e le allega a un solo post", async () => {
    let foto = 0;
    const { cfg, chiamate } = graphFinta((c) => (c.url.endsWith("/photos") ? { id: `foto-${++foto}` } : { id: "pagina_post" }));

    expect(await pubblicaFacebook(cfg, "99", IMMAGINI, "Messaggio")).toBe("pagina_post");

    expect(chiamate.map((c) => c.url)).toEqual([
      "https://graph.facebook.com/v24.0/99/photos",
      "https://graph.facebook.com/v24.0/99/photos",
      "https://graph.facebook.com/v24.0/99/feed",
    ]);
    expect(chiamate[0].parametri).toMatchObject({ url: IMMAGINI[0], published: "false" });
    expect(chiamate[2].parametri).toMatchObject({
      message: "Messaggio",
      "attached_media[0]": '{"media_fbid":"foto-1"}',
      "attached_media[1]": '{"media_fbid":"foto-2"}',
    });
  });
});

describe("verificaMeta", () => {
  it("con il token della pagina restituisce pagina e account Instagram, senza scrivere nulla", async () => {
    const { cfg, chiamate } = graphFinta((c) =>
      c.url.endsWith("/me") ? { id: "99", name: "Weblinkx" } : { id: "17", username: "weblinkx.ch" },
    );
    expect(await verificaMeta(cfg, "99", "17")).toEqual({ pagina: "Weblinkx", instagram: "weblinkx.ch", permessiMancanti: [], nonScade: false });
    expect(chiamate.every((c) => c.metodo === "GET")).toBe(true);
    expect(chiamate[1].parametri).toMatchObject({ fields: "username" });
  });

  it("riconosce un token della pagina che scade e i permessi mancanti per le statistiche", async () => {
    const risposte = (scade: number) =>
      graphFinta((c) => {
        if (c.url.endsWith("/me")) return { id: "99", name: "Weblinkx" };
        if (c.url.endsWith("/debug_token")) {
          return { data: { is_valid: true, expires_at: scade, scopes: ["pages_manage_posts", "read_insights"] } };
        }
        return { id: "17", username: "weblinkx.ch" };
      });
    await expect(verificaMeta(risposte(1_792_537_200).cfg, "99", "17")).rejects.toThrow("scade il 21.10.2026");
    expect(await verificaMeta(risposte(0).cfg, "99", "17")).toMatchObject({
      permessiMancanti: ["instagram_manage_insights"],
      nonScade: true,
    });
  });

  it("riconosce un token che non è quello della pagina", async () => {
    const { cfg } = graphFinta(() => ({ id: "555", name: "Romeo" }));
    await expect(verificaMeta(cfg, "99", "17")).rejects.toThrow("non della pagina 99");
  });
});

const VIDEO = new Uint8Array(new ArrayBuffer(1234));

describe("pubblicaReelInstagram", () => {
  it("crea il contenitore, carica il file su rupload, aspetta l'elaborazione e pubblica", async () => {
    let controlli = 0;
    const { cfg, chiamate } = graphFinta((c) => {
      if (c.url.endsWith("/17/media")) return { id: "reel", uri: "https://rupload.facebook.com/ig-api-upload/v24.0/reel" };
      if (c.url.startsWith("https://rupload.facebook.com")) return { success: true, message: "Upload successful." };
      if (c.url.endsWith("/reel")) return { status_code: ++controlli < 3 ? "IN_PROGRESS" : "FINISHED" };
      if (c.url.endsWith("/17/media_publish")) return { id: "post-reel" };
      throw new Error(`chiamata inattesa ${c.url}`);
    });

    expect(await pubblicaReelInstagram(cfg, "17", VIDEO, "Didascalia", 2500)).toBe("post-reel");

    expect(chiamate[0].parametri).toMatchObject({
      media_type: "REELS",
      upload_type: "resumable",
      caption: "Didascalia",
      thumb_offset: "2500",
    });
    const caricamento = chiamate[1];
    expect(caricamento.url).toBe("https://rupload.facebook.com/ig-api-upload/v24.0/reel");
    expect(caricamento.intestazioni).toMatchObject({ authorization: "OAuth segreto", offset: "0", file_size: "1234" });
    expect(caricamento.byte).toBe(1234);
    expect(controlli).toBe(3);
    expect(chiamate.at(-1)?.parametri).toMatchObject({ creation_id: "reel" });
  });

  it("manda il token solo a rupload.facebook.com", async () => {
    const { cfg, chiamate } = graphFinta((c) => {
      if (c.url.endsWith("/17/media")) return { id: "reel", uri: "https://altro.example/carica" };
      if (c.metodo === "GET") return { status_code: "FINISHED" };
      return c.url.endsWith("/media_publish") ? { id: "post-reel" } : { success: true };
    });
    await pubblicaReelInstagram(cfg, "17", VIDEO, "x");
    expect(chiamate[1].url).toBe("https://rupload.facebook.com/ig-api-upload/v24.0/reel");
    expect(chiamate.some((c) => c.url.includes("altro.example"))).toBe(false);
  });

  it("si ferma se il caricamento non riesce, senza mostrare il token", async () => {
    const { cfg } = graphFinta((c) =>
      c.url.startsWith("https://rupload") ? { debug_info: { retriable: false, message: "ProcessingFailedError" } } : { id: "reel" },
    );
    const errore = await pubblicaReelInstagram(cfg, "17", VIDEO, "x").catch((e: Error) => e);
    expect((errore as Error).message).toContain("ProcessingFailedError");
    expect((errore as Error).message).not.toContain("segreto");
  });
});

describe("pubblicaReelFacebook", () => {
  it("apre il caricamento, carica il file, pubblica e aspetta che Facebook finisca", async () => {
    let controlli = 0;
    const { cfg, chiamate } = graphFinta((c) => {
      if (c.url.endsWith("/99/video_reels") && c.parametri.upload_phase === "start") {
        return { video_id: "v1", upload_url: "https://rupload.facebook.com/video-upload/v1" };
      }
      if (c.url.startsWith("https://rupload.facebook.com")) return { success: true };
      if (c.url.endsWith("/99/video_reels")) return { success: true };
      if (c.url.endsWith("/v1")) {
        controlli++;
        return {
          status: {
            video_status: controlli < 2 ? "processing" : "ready",
            publishing_phase: { status: controlli < 2 ? "not_started" : "completed", publish_status: controlli < 2 ? "draft" : "published" },
          },
        };
      }
      throw new Error(`chiamata inattesa ${c.url}`);
    });

    expect(await pubblicaReelFacebook(cfg, "99", VIDEO, "Descrizione")).toBe("v1");

    expect(chiamate[1].url).toBe("https://rupload.facebook.com/video-upload/v1");
    expect(chiamate[1].intestazioni).toMatchObject({ authorization: "OAuth segreto", offset: "0", file_size: "1234" });
    expect(chiamate[2].parametri).toMatchObject({
      upload_phase: "finish",
      video_id: "v1",
      video_state: "PUBLISHED",
      description: "Descrizione",
    });
    expect(controlli).toBe(2);
  });

  it("se subito dopo l'invio Meta dice che il video non esiste ancora, riprova", async () => {
    let letture = 0;
    const { cfg } = graphFinta((c) => {
      if (c.parametri.upload_phase === "start") return { video_id: "v1" };
      if (c.metodo === "GET" && ++letture === 1) return { error: { message: "Object with ID 'v1' does not exist", code: 100 } };
      if (c.metodo === "GET") return { status: { video_status: "ready", publishing_phase: { status: "completed" } } };
      return { success: true };
    });
    expect(await pubblicaReelFacebook(cfg, "99", VIDEO, "x")).toBe("v1");
    expect(letture).toBe(2);
  });

  it("dice se Facebook non riesce a elaborare il video", async () => {
    const { cfg } = graphFinta((c) => {
      if (c.parametri.upload_phase === "start") return { video_id: "v1" };
      if (c.metodo === "GET") return { status: { video_status: "error", processing_phase: { error: { message: "Durata non valida" } } } };
      return { success: true };
    });
    await expect(pubblicaReelFacebook(cfg, "99", VIDEO, "x")).rejects.toThrow("Durata non valida");
  });
});

describe("statistiche", () => {
  const insight = (name: string, value: unknown) => ({ name, period: "lifetime", values: [{ value }] });

  it("legge le metriche di Instagram tutte insieme", async () => {
    const { cfg, chiamate } = graphFinta(() => ({ data: [insight("reach", 120), insight("saved", 4)] }));
    expect(await statisticheInstagram(cfg, "m1", "carosello")).toEqual({ reach: 120, saved: 4 });
    expect(chiamate).toHaveLength(1);
    expect(chiamate[0].url).toBe("https://graph.facebook.com/v24.0/m1/insights");
    expect(chiamate[0].parametri.metric).toContain("saved");
  });

  it("se Meta rifiuta un nome, chiede le metriche una alla volta e salta quelle rifiutate", async () => {
    const { cfg, chiamate } = graphFinta((c) => {
      const metriche = c.parametri.metric.split(",");
      if (metriche.length > 1 || metriche[0] === "reels_skip_rate") {
        return { error: { message: "(#100) metric must be one of the following values", code: 100 } };
      }
      return { data: [insight(metriche[0], 7)] };
    });
    const metriche = await statisticheInstagram(cfg, "m1", "video");
    expect(metriche.reach).toBe(7);
    expect(metriche).not.toHaveProperty("reels_skip_rate");
    expect(chiamate.length).toBeGreaterThan(2);
  });

  it("non nasconde gli errori di permessi", async () => {
    const { cfg } = graphFinta(() => ({ error: { message: "(#10) Application does not have permission", code: 10 } }));
    await expect(statisticheInstagram(cfg, "m1", "carosello")).rejects.toThrow("permission");
  });

  it("su Facebook, senza i permessi per commenti e condivisioni, tiene le altre metriche", async () => {
    const { cfg } = graphFinta((c) =>
      c.url.endsWith("/insights")
        ? { data: [insight("post_media_view", 300)] }
        : { error: { message: "(#10) This endpoint requires the 'pages_read_user_content' permission", code: 10 } },
    );
    expect(await statisticheFacebook(cfg, "99_1", "carosello")).toEqual({ post_media_view: 300 });
  });

  it("su Facebook somma le reazioni per tipo e aggiunge condivisioni e commenti del post", async () => {
    const { cfg } = graphFinta((c) =>
      c.url.endsWith("/insights")
        ? { data: [insight("post_media_view", 300), insight("post_reactions_by_type_total", { like: 5, love: 2 })] }
        : { id: "99_1", shares: { count: 3 }, comments: { data: [], summary: { total_count: 2 } } },
    );
    expect(await statisticheFacebook(cfg, "99_1", "carosello")).toEqual({
      post_media_view: 300,
      post_reactions_by_type_total: 7,
      shares: 3,
      comments: 2,
    });
  });
});

describe("esisteSuMeta", () => {
  it("dice se un post è ancora online o è stato cancellato", async () => {
    const { cfg } = graphFinta((c) =>
      c.url.endsWith("/vivo") ? { id: "vivo" } : { error: { message: "Object with ID 'morto' does not exist", code: 100 } },
    );
    expect(await esisteSuMeta(cfg, "vivo")).toBe(true);
    expect(await esisteSuMeta(cfg, "morto")).toBe(false);
  });

  it("non scambia un problema di token per un post cancellato", async () => {
    const { cfg } = graphFinta(() => ({ error: { message: "Error validating access token", code: 190 } }));
    await expect(esisteSuMeta(cfg, "x")).rejects.toThrow("access token");
  });
});
