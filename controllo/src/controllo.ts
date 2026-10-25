/**
 * Il controllo gratuito del sito: sei cose che Google e chi visita guardano
 * (lucchetto, telefono, titolo, descrizione, contatto veloce, velocità),
 * ognuna con la sua fonte ufficiale (./fonti.ts). Sono informazioni generali
 * fatte in automatico, e il rapporto lo dice.
 *
 * La pagina la apre il server (netlify/functions/controlla.mts): l'indirizzo
 * lo scrive chi visita, quindi si aprono solo siti pubblici (niente indirizzi
 * interni, porte strane o password nell'indirizzo).
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { FONTI, type Fonte } from "./fonti";

export type Stato = "ok" | "da-migliorare" | "non-controllato";

export type Esito = {
  id: "https" | "telefono" | "titolo" | "descrizione" | "contatto" | "velocita";
  titolo: string;
  stato: Stato;
  testo: string;
  fonte: Fonte;
};

export type Controllo = {
  /** L'indirizzo controllato, dopo i redirect. */
  url: string;
  /** Il nome del sito, senza https:// e www. */
  sito: string;
  /** ISO, quando è stato fatto. */
  quando: string;
  esiti: Esito[];
};

/** Un errore da mostrare a chi visita così com'è. */
export class ErroreControllo extends Error {}

/** Il sito non risponde: senza https:// scritto, si riprova con http://. */
class SitoMuto extends ErroreControllo {}

/** Quello che serve del codice della pagina. */
export type Pagina = {
  titolo?: string;
  descrizione?: string;
  viewport: boolean;
  telefono: boolean;
  whatsapp: boolean;
  email: boolean;
};

/** Il contenuto principale è «buono» se compare entro 2,5 secondi (web.dev, FONTI.lcp). */
export const LCP_BUONO_MS = 2_500;

/** Titoli che non dicono nulla di chi c'è dietro. */
const TITOLI_VUOTI = /^(home|homepage|home page|index|untitled|senza titolo|benvenuti|welcome|sito web|il mio sito|my site|nuovo sito|new site|document|pagina iniziale)$/i;

const MASSIMO_HTML = 3_000_000;
const ATTESA_MS = 15_000;
const AGENTE = "WeblinkxControllo/1.0 (+https://weblinkx.ch)";

/** L'indirizzo scritto da chi visita, sistemato; null se non è un sito pubblico. */
export function normalizzaUrl(scritto: string): URL | null {
  const testo = scritto.trim();
  if (!testo || testo.length > 300 || /\s/.test(testo)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(testo) ? testo : `https://${testo}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.toLowerCase();
  if (isIP(host.replace(/^\[|\]$/g, ""))) return null;
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return null;
  url.hash = "";
  return url;
}

/** Gli indirizzi IP che non sono internet pubblico (rete di casa, del server, riservati). */
export function indirizzoPrivato(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

async function controllaHost(url: URL) {
  const indirizzi = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!indirizzi.length) throw new ErroreControllo(`Non trovo il sito ${url.hostname}: controlla di averlo scritto giusto.`);
  if (indirizzi.some((i) => indirizzoPrivato(i.address))) throw new ErroreControllo("Posso controllare solo siti pubblici.");
}

/** Apre la pagina seguendo al massimo 5 redirect, ognuno controllato. */
async function scarica(inizio: URL): Promise<{ url: URL; html: string }> {
  let url = inizio;
  for (let salti = 0; salti <= 5; salti++) {
    await controllaHost(url);
    const risposta = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": AGENTE, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(ATTESA_MS),
    }).catch(() => {
      throw new SitoMuto(`Il sito ${url.hostname} non risponde. Riprova tra poco o controlla l'indirizzo.`);
    });
    const dove = risposta.headers.get("location");
    if (risposta.status >= 300 && risposta.status < 400 && dove) {
      const prossimo = normalizzaUrl(new URL(dove, url).toString());
      if (!prossimo) throw new ErroreControllo("Il sito manda a un indirizzo che non posso aprire.");
      url = prossimo;
      continue;
    }
    if (!risposta.ok) throw new ErroreControllo(`Il sito risponde con un errore (${risposta.status}): la pagina non si apre.`);
    return { url, html: await testoLimitato(risposta) };
  }
  throw new ErroreControllo("Il sito rimanda da una pagina all'altra senza fermarsi.");
}

async function testoLimitato(risposta: Response): Promise<string> {
  if (!risposta.body) return "";
  const lettore = risposta.body.getReader();
  const pezzi: Uint8Array[] = [];
  let totale = 0;
  while (totale < MASSIMO_HTML) {
    const { done, value } = await lettore.read();
    if (done) break;
    pezzi.push(value);
    totale += value.length;
  }
  await lettore.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(pezzi));
}

/** Gli attributi di un tag, con i nomi in minuscolo. */
function attributi(tag: string): Record<string, string> {
  const risultato: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    risultato[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return risultato;
}

function senzaEntita(testo: string): string {
  return testo
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Legge dal codice della pagina titolo, descrizione, viewport e link per contattare. */
export function analizzaHtml(html: string): Pagina {
  const titolo = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => attributi(m[0]));
  const link = [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => attributi(m[0]).href ?? "");
  const descrizione = meta.find((a) => a.name?.toLowerCase() === "description")?.content;
  return {
    titolo: titolo ? senzaEntita(titolo) || undefined : undefined,
    descrizione: descrizione ? senzaEntita(descrizione) || undefined : undefined,
    viewport: meta.some((a) => a.name?.toLowerCase() === "viewport" && /width\s*=\s*device-width/i.test(a.content ?? "")),
    telefono: link.some((h) => /^tel:/i.test(h.trim())),
    whatsapp: link.some((h) => /(^|\/\/)(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(h.trim()) || /^whatsapp:/i.test(h.trim())),
    email: link.some((h) => /^mailto:/i.test(h.trim())),
  };
}

function secondi(ms: number): string {
  return (ms / 1000).toFixed(1).replace(".", ",");
}

/** I risultati da mostrare, nell'ordine. `lcpMs` assente: velocità non misurata. */
export function esiti(url: URL, pagina: Pagina, lcpMs?: number): Esito[] {
  const titoloBuono = pagina.titolo && !TITOLI_VUOTI.test(pagina.titolo);
  const contatti = [pagina.telefono && "telefono", pagina.whatsapp && "WhatsApp", pagina.email && "email"].filter(Boolean);
  return [
    {
      id: "https",
      titolo: "Il lucchetto (HTTPS)",
      stato: url.protocol === "https:" ? "ok" : "da-migliorare",
      testo:
        url.protocol === "https:"
          ? "Il sito usa HTTPS: il browser mostra il lucchetto."
          : "Il sito non usa HTTPS: Chrome lo segna come «Non sicuro» e chi visita si fida di meno.",
      fonte: FONTI.httpsChrome,
    },
    {
      id: "telefono",
      titolo: "Fatto anche per il telefono",
      stato: pagina.viewport ? "ok" : "da-migliorare",
      testo: pagina.viewport
        ? "La pagina si adatta allo schermo del telefono. Google guarda soprattutto la versione per telefono."
        : "Manca l'impostazione per il telefono (viewport): sullo smartphone la pagina rischia di uscire piccola. Google guarda soprattutto la versione per telefono.",
      fonte: FONTI.mobileFirst,
    },
    {
      id: "titolo",
      titolo: "Il titolo su Google",
      stato: titoloBuono ? "ok" : "da-migliorare",
      testo: titoloBuono
        ? `La pagina ha un titolo: «${pagina.titolo}». Controlla che dica chi sei e cosa fai.`
        : pagina.titolo
          ? `Il titolo della pagina è «${pagina.titolo}»: non dice chi sei né cosa fai.`
          : "La pagina non ha un titolo: su Google comparirà qualcosa di generico.",
      fonte: FONTI.titoli,
    },
    {
      id: "descrizione",
      titolo: "La descrizione su Google",
      stato: pagina.descrizione ? "ok" : "da-migliorare",
      testo: pagina.descrizione
        ? "C'è una descrizione per Google: il testo che può comparire sotto il titolo."
        : "Manca la descrizione: Google sceglierà da solo un pezzo di testo da mostrare sotto il titolo.",
      fonte: FONTI.descrizioni,
    },
    {
      id: "contatto",
      titolo: "Contattarti con un tocco",
      stato: contatti.length ? "ok" : "da-migliorare",
      testo: contatti.length
        ? `Nella pagina iniziale c'è un link per contattarti subito (${contatti.join(", ")}).`
        : "Nella pagina iniziale non c'è un link per chiamarti o scriverti con un tocco (telefono, WhatsApp o email).",
      fonte: FONTI.whatsapp,
    },
    lcpMs === undefined
      ? {
          id: "velocita",
          titolo: "La velocità sul telefono",
          stato: "non-controllato",
          testo: "Questa volta non sono riuscito a misurarla. Puoi provarla gratis con PageSpeed Insights, lo strumento di Google.",
          fonte: FONTI.pageSpeed,
        }
      : {
          id: "velocita",
          titolo: "La velocità sul telefono",
          stato: lcpMs <= LCP_BUONO_MS ? "ok" : "da-migliorare",
          testo: `Su un telefono il contenuto principale compare in ${secondi(lcpMs)} secondi (misura di Google). Per un'esperienza buona, al massimo 2,5 secondi.`,
          fonte: FONTI.lcp,
        },
  ];
}

/** Il tempo del contenuto principale su telefono, da PageSpeed Insights; undefined se non riesce. */
async function velocita(url: URL, chiave: string): Promise<number | undefined> {
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url.toString());
  api.searchParams.set("strategy", "mobile");
  api.searchParams.set("category", "performance");
  api.searchParams.set("key", chiave);
  try {
    const risposta = await fetch(api, { signal: AbortSignal.timeout(45_000) });
    if (!risposta.ok) return undefined;
    const dati = (await risposta.json()) as { lighthouseResult?: { audits?: Record<string, { numericValue?: number }> } };
    const ms = dati.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;
    return typeof ms === "number" && Number.isFinite(ms) ? ms : undefined;
  } catch {
    return undefined;
  }
}

/** Il nome del sito da mostrare: weblinkx.ch, non https://www.weblinkx.ch/. */
export function nomeSito(url: URL): string {
  return url.hostname.replace(/^www\./, "") + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
}

/** Fa il controllo. Senza chiave di PageSpeed la velocità resta da misurare. */
export async function controlla(scritto: string, chiavePageSpeed?: string, adesso = new Date()): Promise<Controllo> {
  const inizio = normalizzaUrl(scritto);
  if (!inizio) throw new ErroreControllo("Scrivi l'indirizzo del sito, per esempio tuaattivita.ch.");
  const senzaProtocollo = !/^[a-z][a-z0-9+.-]*:\/\//i.test(scritto.trim());
  const pagina = scarica(inizio).catch((errore) => {
    if (!(errore instanceof SitoMuto) || !senzaProtocollo) throw errore;
    const http = new URL(inizio);
    http.protocol = "http:";
    return scarica(http);
  });
  const [{ url, html }, lcpMs] = await Promise.all([
    pagina,
    chiavePageSpeed ? velocita(inizio, chiavePageSpeed) : Promise.resolve(undefined),
  ]);
  return { url: url.toString(), sito: nomeSito(url), quando: adesso.toISOString(), esiti: esiti(url, analizzaHtml(html), lcpMs) };
}
