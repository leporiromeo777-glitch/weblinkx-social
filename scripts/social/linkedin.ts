/**
 * Post con più immagini sul profilo LinkedIn (prodotto «Share on LinkedIn»,
 * permesso w_member_social). Il token dura 60 giorni: poi va rifatto (vedi
 * social/README.md). Le immagini si caricano dal disco.
 */
export type ConfigLinkedIn = {
  token: string;
  /** Versione delle API, AAAAMM: ognuna vale circa un anno. */
  versione: string;
  fetch?: typeof fetch;
  /** Per i test: niente attese vere. */
  attesa?: (ms: number) => Promise<void>;
};

export type ImmagineLinkedIn = { dati: Uint8Array<ArrayBuffer>; testoAlternativo: string };

const API = "https://api.linkedin.com";
/** LinkedIn elabora le immagini caricate: una breve pausa prima del post. */
const PAUSA_MS = 3_000;

const aspetta = (ms: number) => new Promise<void>((fatto) => setTimeout(fatto, ms));

function intestazioni(cfg: ConfigLinkedIn): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    "LinkedIn-Version": cfg.versione,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

async function errore(risposta: Response, cosa: string): Promise<Error> {
  const testo = await risposta.text().catch(() => "");
  return new Error(`LinkedIn, ${cosa}: HTTP ${risposta.status} ${testo.slice(0, 300)}`.trim());
}

/** L'autore dei post: la persona del token (serve anche il permesso openid e profile). */
export async function autoreLinkedIn(cfg: ConfigLinkedIn): Promise<string> {
  const risposta = await (cfg.fetch ?? fetch)(`${API}/v2/userinfo`, { headers: { Authorization: `Bearer ${cfg.token}` } });
  if (!risposta.ok) throw await errore(risposta, "lettura del profilo");
  const { sub } = (await risposta.json()) as { sub?: string };
  if (!sub) throw new Error("LinkedIn: il profilo non ha un id (sub)");
  return `urn:li:person:${sub}`;
}

/** Pubblica un post con da 2 a 20 immagini e restituisce il suo id (urn). */
export async function pubblicaLinkedIn(
  cfg: ConfigLinkedIn,
  autore: string,
  immagini: readonly ImmagineLinkedIn[],
  commento: string,
): Promise<string> {
  if (immagini.length < 2 || immagini.length > 20) throw new Error("LinkedIn: un post multi-immagine ha da 2 a 20 immagini");
  const f = cfg.fetch ?? fetch;
  const caricate: { id: string; altText: string }[] = [];
  for (const immagine of immagini) {
    const inizio = await f(`${API}/rest/images?action=initializeUpload`, {
      method: "POST",
      headers: intestazioni(cfg),
      body: JSON.stringify({ initializeUploadRequest: { owner: autore } }),
    });
    if (!inizio.ok) throw await errore(inizio, "preparazione del caricamento");
    const { value } = (await inizio.json()) as { value?: { uploadUrl?: string; image?: string } };
    if (!value?.uploadUrl || !value.image) throw new Error("LinkedIn: risposta senza uploadUrl o image");
    const caricamento = await f(value.uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/octet-stream" },
      body: immagine.dati,
    });
    if (!caricamento.ok) throw await errore(caricamento, "caricamento dell'immagine");
    caricate.push({ id: value.image, altText: immagine.testoAlternativo.slice(0, 4_000) });
  }
  await (cfg.attesa ?? aspetta)(PAUSA_MS);
  const post = await f(`${API}/rest/posts`, {
    method: "POST",
    headers: intestazioni(cfg),
    body: JSON.stringify({
      author: autore,
      commentary: commento,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { multiImage: { images: caricate } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (post.status !== 201) throw await errore(post, "pubblicazione del post");
  return post.headers.get("x-restli-id") ?? "(id non restituito)";
}
