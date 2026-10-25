/**
 * Instagram e pagina Facebook con la Graph API di Meta (accesso con
 * Facebook Login for Business). Basta un token della pagina: se viene da un
 * token utente di lunga durata non scade (vedi social/README.md).
 * Instagram e Facebook prendono le immagini da un indirizzo pubblico; i video
 * (Reel) si caricano direttamente, da file.
 */
export type ConfigMeta = {
  /** Token della pagina Facebook collegata all'account Instagram. */
  token: string;
  /** Versione della Graph API, per esempio "v26.0". */
  versione: string;
  fetch?: typeof fetch;
  /** Per i test: niente attese vere. */
  attesa?: (ms: number) => Promise<void>;
};

type Risposta = Record<string, unknown> & { id?: string };

const GRAPH = "https://graph.facebook.com";
/** Il server dove si caricano i video. */
const RUPLOAD = "https://rupload.facebook.com";
/** Controllo dello stato dei contenitori di Instagram: ogni 5 secondi, al massimo per 2 minuti (10 per un video). */
const PAUSA_MS = 5_000;
const CONTROLLI = 24;
const CONTROLLI_VIDEO = 120;

/** I permessi che servono per leggere le statistiche (scripts/social/aggiorna-statistiche.ts). */
export const PERMESSI_STATISTICHE = ["instagram_manage_insights", "read_insights"] as const;

/** Un errore della Graph API, con il codice di Meta (100: parametro non valido, 10 e 200: permessi, 190: token). */
export class ErroreMeta extends Error {
  constructor(
    messaggio: string,
    readonly codice: number | null,
  ) {
    super(messaggio);
  }
}

const aspetta = (ms: number) => new Promise<void>((fatto) => setTimeout(fatto, ms));

async function graph(cfg: ConfigMeta, metodo: "GET" | "POST", percorso: string, parametri: Record<string, string>) {
  const f = cfg.fetch ?? fetch;
  const url = `${GRAPH}/${cfg.versione}/${percorso}`;
  const corpo = new URLSearchParams({ ...parametri, access_token: cfg.token });
  const risposta = metodo === "GET" ? await f(`${url}?${corpo}`) : await f(url, { method: "POST", body: corpo });
  const json = (await risposta.json().catch(() => ({}))) as Risposta & { error?: { message?: string; code?: number } };
  // Il messaggio non contiene mai l'indirizzo: ci sarebbe il token.
  if (!risposta.ok || json.error) {
    throw new ErroreMeta(`Meta, ${metodo} ${percorso}: ${json.error?.message ?? `HTTP ${risposta.status}`}`, json.error?.code ?? null);
  }
  return json;
}

function id(risposta: Risposta, cosa: string): string {
  if (typeof risposta.id !== "string") throw new Error(`Meta: nessun id per ${cosa}`);
  return risposta.id;
}

/** Aspetta che un contenitore di Instagram sia pronto (FINISHED) prima di usarlo. */
async function attendiContenitore(cfg: ConfigMeta, contenitore: string, controlli = CONTROLLI) {
  for (let i = 0; i < controlli; i++) {
    const { status_code: stato, status: dettaglio } = await graph(cfg, "GET", contenitore, { fields: "status_code,status" });
    if (stato === "FINISHED") return;
    if (stato === "ERROR" || stato === "EXPIRED") {
      throw new Error(`Instagram: il contenitore ${contenitore} è in stato ${stato}${dettaglio ? ` (${String(dettaglio)})` : ""}`);
    }
    await (cfg.attesa ?? aspetta)(PAUSA_MS);
  }
  throw new Error(`Instagram: il contenitore ${contenitore} non è pronto dopo ${(controlli * PAUSA_MS) / 1000} secondi`);
}

/** Carica un video intero su rupload.facebook.com (Reel di Instagram e della pagina). */
async function caricaVideo(cfg: ConfigMeta, url: string, video: Uint8Array<ArrayBuffer>) {
  const f = cfg.fetch ?? fetch;
  const risposta = await f(url, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${cfg.token}`,
      offset: "0",
      file_size: String(video.byteLength),
      "Content-Type": "application/octet-stream",
    },
    body: video,
  });
  const json = (await risposta.json().catch(() => ({}))) as {
    success?: boolean;
    debug_info?: { message?: string };
    error?: { message?: string };
  };
  if (!risposta.ok || json.success !== true) {
    throw new Error(`Meta, caricamento del video: ${json.debug_info?.message ?? json.error?.message ?? `HTTP ${risposta.status}`}`);
  }
}

/** Il token si manda solo a rupload.facebook.com: se Meta indica un altro indirizzo si usa quello standard. */
function indirizzoCaricamento(proposto: unknown, standard: string): string {
  if (typeof proposto !== "string") return standard;
  try {
    return new URL(proposto).origin === RUPLOAD ? proposto : standard;
  } catch {
    return standard;
  }
}

/**
 * Controlla token e id senza pubblicare nulla. Con il token di una pagina
 * «me» è la pagina stessa: se è un'altra cosa (per esempio un token utente,
 * che scade) lo dice. Restituisce i nomi di pagina e account Instagram.
 */
export async function verificaMeta(cfg: ConfigMeta, paginaId: string | null, igUserId: string | null) {
  const io = await graph(cfg, "GET", "me", { fields: "id,name" });
  if (paginaId && io.id !== paginaId) {
    throw new Error(
      `Meta: il token è di «${String(io.name)}» (${String(io.id)}), non della pagina ${paginaId}. Serve il token della pagina (vedi social/README.md).`,
    );
  }
  const instagram = igUserId ? await graph(cfg, "GET", igUserId, { fields: "username" }) : null;
  // Il token della pagina preso con un token utente esteso non scade mai. Se
  // ha una scadenza, è stato preso con un token utente breve e smette di
  // funzionare dopo un paio d'ore. Se Meta non dà le informazioni, si salta.
  const info = await graph(cfg, "GET", "debug_token", { input_token: cfg.token }).catch(() => null);
  const dati = (info?.data ?? {}) as { expires_at?: number; scopes?: string[] };
  if (dati.expires_at && dati.expires_at > 0) {
    const quando = new Intl.DateTimeFormat("de-CH", {
      timeZone: "Europe/Zurich",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dati.expires_at * 1000));
    throw new Error(
      `Meta: il token della pagina scade il ${quando}, quindi è stato preso con un token utente breve. Rifai me/accounts con il token esteso: quello della pagina deve dire «Scade: mai» (vedi social/README.md).`,
    );
  }
  return {
    pagina: String(io.name),
    instagram: instagram ? String(instagram.username) : null,
    /** I permessi per le statistiche che il token non ha (vuoto se Meta non dice i permessi). */
    permessiMancanti: dati.scopes ? PERMESSI_STATISTICHE.filter((p) => !dati.scopes!.includes(p)) : [],
    /** true: Meta conferma che il token non scade; false: Meta non l'ha detto. */
    nonScade: info !== null && dati.expires_at === 0,
  };
}

/**
 * Il post è ancora sul social? false se Meta dice che non esiste più
 * (cancellato a mano); gli altri errori (token, rete) passano.
 */
export async function esisteSuMeta(cfg: ConfigMeta, id: string): Promise<boolean> {
  try {
    await graph(cfg, "GET", id, { fields: "id" });
    return true;
  } catch (errore) {
    if (errore instanceof ErroreMeta && errore.codice === 100) return false;
    throw errore;
  }
}

/** Pubblica un carosello (da 2 a 10 immagini JPEG) e restituisce l'id del post. */
export async function pubblicaInstagram(cfg: ConfigMeta, igUserId: string, immagini: readonly string[], didascalia: string) {
  if (immagini.length < 2 || immagini.length > 10) throw new Error("Instagram: un carosello ha da 2 a 10 immagini");
  const figli: string[] = [];
  for (const url of immagini) {
    const figlio = id(await graph(cfg, "POST", `${igUserId}/media`, { image_url: url, is_carousel_item: "true" }), url);
    await attendiContenitore(cfg, figlio);
    figli.push(figlio);
  }
  const carosello = id(
    await graph(cfg, "POST", `${igUserId}/media`, { media_type: "CAROUSEL", children: figli.join(","), caption: didascalia }),
    "il carosello",
  );
  await attendiContenitore(cfg, carosello);
  return id(await graph(cfg, "POST", `${igUserId}/media_publish`, { creation_id: carosello }), "la pubblicazione");
}

/** Pubblica un post con più foto sulla pagina e restituisce il suo id. */
export async function pubblicaFacebook(cfg: ConfigMeta, paginaId: string, immagini: readonly string[], messaggio: string) {
  const foto: string[] = [];
  // Prima le foto, non pubblicate; poi il post che le contiene tutte.
  for (const url of immagini) foto.push(id(await graph(cfg, "POST", `${paginaId}/photos`, { url, published: "false" }), url));
  const parametri: Record<string, string> = { message: messaggio };
  foto.forEach((fbid, i) => {
    parametri[`attached_media[${i}]`] = JSON.stringify({ media_fbid: fbid });
  });
  return id(await graph(cfg, "POST", `${paginaId}/feed`, parametri), "il post");
}

/**
 * Pubblica un Reel su Instagram caricando il file (H.264, 9:16) e restituisce
 * l'id del post. `copertinaMs`: il momento del video da usare come copertina.
 */
export async function pubblicaReelInstagram(
  cfg: ConfigMeta,
  igUserId: string,
  video: Uint8Array<ArrayBuffer>,
  didascalia: string,
  copertinaMs?: number,
) {
  const parametri: Record<string, string> = { media_type: "REELS", upload_type: "resumable", caption: didascalia };
  if (copertinaMs !== undefined) parametri.thumb_offset = String(Math.round(copertinaMs));
  const risposta = await graph(cfg, "POST", `${igUserId}/media`, parametri);
  const contenitore = id(risposta, "il Reel");
  await caricaVideo(cfg, indirizzoCaricamento(risposta.uri, `${RUPLOAD}/ig-api-upload/${cfg.versione}/${contenitore}`), video);
  // Instagram elabora il video prima di poterlo pubblicare: può volerci qualche minuto.
  await attendiContenitore(cfg, contenitore, CONTROLLI_VIDEO);
  return id(await graph(cfg, "POST", `${igUserId}/media_publish`, { creation_id: contenitore }), "la pubblicazione");
}

/**
 * Pubblica un Reel sulla pagina Facebook e restituisce l'id del video. Dopo
 * l'invio Facebook elabora e pubblica il video da solo: si aspetta che lo
 * faccia, e se va in errore si dice.
 */
export async function pubblicaReelFacebook(cfg: ConfigMeta, paginaId: string, video: Uint8Array<ArrayBuffer>, descrizione: string) {
  const inizio = await graph(cfg, "POST", `${paginaId}/video_reels`, { upload_phase: "start" });
  if (typeof inizio.video_id !== "string") throw new Error("Meta: nessun video_id per il Reel");
  const videoId = inizio.video_id;
  await caricaVideo(cfg, indirizzoCaricamento(inizio.upload_url, `${RUPLOAD}/video-upload/${cfg.versione}/${videoId}`), video);
  const fine = await graph(cfg, "POST", `${paginaId}/video_reels`, {
    upload_phase: "finish",
    video_id: videoId,
    video_state: "PUBLISHED",
    description: descrizione,
  });
  if (fine.success !== true) throw new Error("Meta: Facebook non ha accettato il Reel");
  for (let i = 0; i < CONTROLLI_VIDEO; i++) {
    // Subito dopo l'invio Meta a volte risponde che il video «non esiste»:
    // non è ancora leggibile, ma è stato accettato. Si riprova.
    const letto = await graph(cfg, "GET", videoId, { fields: "status" }).catch((e: unknown) => {
      if (e instanceof ErroreMeta && e.codice === 100) return null;
      throw e;
    });
    if (!letto) {
      await (cfg.attesa ?? aspetta)(PAUSA_MS);
      continue;
    }
    const { status } = letto;
    const stato = (status ?? {}) as {
      video_status?: string;
      processing_phase?: { status?: string; error?: { message?: string } };
      publishing_phase?: { status?: string; publish_status?: string };
    };
    const fallito = ["error", "upload_failed", "expired"].includes(stato.video_status ?? "") || stato.publishing_phase?.status === "error";
    if (fallito) {
      const motivo = stato.processing_phase?.error?.message;
      throw new Error(`Facebook: il Reel ${videoId} non è uscito (${stato.video_status ?? "errore"}${motivo ? `: ${motivo}` : ""})`);
    }
    if (stato.publishing_phase?.publish_status === "published" || stato.publishing_phase?.status === "completed") break;
    await (cfg.attesa ?? aspetta)(PAUSA_MS);
  }
  // Se dopo l'attesa non risulta ancora pubblicato, Facebook lo finisce più tardi:
  // il Reel è stato accettato, rilanciare lo pubblicherebbe due volte.
  return videoId;
}

/** Le metriche di un post, per nome (per esempio reach, saved, shares). */
export type Metriche = Record<string, number>;

/** Un valore delle statistiche: un numero o un oggetto per tipo (per esempio reazioni), che si somma. */
function numero(valore: unknown): number | null {
  if (typeof valore === "number" && Number.isFinite(valore)) return valore;
  if (valore && typeof valore === "object") {
    const parti = Object.values(valore).filter((v): v is number => typeof v === "number");
    return parti.length ? parti.reduce((a, b) => a + b, 0) : null;
  }
  return null;
}

/**
 * Chiede a Meta le statistiche di un post. Prima tutte insieme; se Meta
 * rifiuta un nome (succede: le metriche cambiano spesso) una alla volta,
 * saltando quelle rifiutate. Gli errori di token e permessi passano.
 */
async function insights(cfg: ConfigMeta, percorso: string, metriche: readonly string[]): Promise<Metriche> {
  const risultato: Metriche = {};
  const leggi = (risposta: Risposta) => {
    for (const voce of (risposta.data ?? []) as { name?: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }[]) {
      const valore = numero(voce.values?.[0]?.value ?? voce.total_value?.value);
      if (voce.name && valore !== null) risultato[voce.name] = valore;
    }
  };
  try {
    leggi(await graph(cfg, "GET", percorso, { metric: metriche.join(",") }));
  } catch (errore) {
    if (!(errore instanceof ErroreMeta) || errore.codice !== 100 || metriche.length === 1) throw errore;
    for (const metrica of metriche) {
      try {
        leggi(await graph(cfg, "GET", percorso, { metric: metrica }));
      } catch (e) {
        if (!(e instanceof ErroreMeta) || e.codice !== 100) throw e;
      }
    }
  }
  return risultato;
}

/** Le metriche che chiediamo, per social e formato. Riferimento: social/README.md. */
export const METRICHE = {
  instagram: {
    carosello: ["reach", "views", "likes", "comments", "shares", "saved", "total_interactions", "profile_visits", "follows"],
    video: [
      "reach",
      "views",
      "likes",
      "comments",
      "shares",
      "saved",
      "total_interactions",
      "ig_reels_avg_watch_time",
      "reels_skip_rate",
    ],
  },
  facebook: {
    carosello: ["post_media_view", "post_total_media_view_unique", "post_clicks", "post_reactions_by_type_total"],
    video: [
      "post_impressions_unique",
      "blue_reels_play_count",
      "post_video_avg_time_watched",
      "post_video_likes_by_reaction_type",
      "post_video_social_actions",
      "post_video_followers",
    ],
  },
} as const;

/** Le statistiche di un post o Reel di Instagram. */
export function statisticheInstagram(cfg: ConfigMeta, mediaId: string, formato: "carosello" | "video") {
  return insights(cfg, `${mediaId}/insights`, METRICHE.instagram[formato]);
}

/**
 * Le statistiche di un post della pagina (carosello: insights del post più
 * commenti e condivisioni) o di un Reel (insights del video).
 */
export async function statisticheFacebook(cfg: ConfigMeta, postId: string, formato: "carosello" | "video") {
  if (formato === "video") return insights(cfg, `${postId}/video_insights`, METRICHE.facebook.video);
  const metriche = await insights(cfg, `${postId}/insights`, METRICHE.facebook.carosello);
  // Commenti e condivisioni del post: servono permessi che il token può non
  // avere (pages_read_user_content). Senza, restano le altre metriche.
  const post = await graph(cfg, "GET", postId, { fields: "shares,comments.summary(true).limit(0)" }).catch((e: unknown) => {
    if (e instanceof ErroreMeta && (e.codice === 10 || e.codice === 200)) return null;
    throw e;
  });
  if (!post) return metriche;
  const condivisioni = (post.shares as { count?: number } | undefined)?.count;
  const commenti = (post.comments as { summary?: { total_count?: number } } | undefined)?.summary?.total_count;
  return { ...metriche, shares: condivisioni ?? 0, ...(commenti === undefined ? {} : { comments: commenti }) };
}
