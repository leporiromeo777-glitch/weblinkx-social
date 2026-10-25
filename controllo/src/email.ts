/**
 * Le due email del controllo: il rapporto a chi l'ha chiesto e l'avviso a
 * Romeo. Le manda netlify/functions/rapporto.mts quando arriva il modulo.
 */
import type { Controllo, Esito } from "./controllo";

/** L'indirizzo della pagina del controllo, se Netlify non lo dice. */
export const PAGINA = "https://weblinkx-controllo.netlify.app";
export const FIRMA = ["Romeo Lepori — Weblinkx", "https://weblinkx.ch"];

export type Email = { oggetto: string; testo: string; html: string };

/** Chi ha chiesto il rapporto, dal modulo. */
export type Richiesta = { nome?: string; email: string; telefono?: string; attivita?: string };

const SEGNO: Record<Esito["stato"], string> = { ok: "✓", "da-migliorare": "✗", "non-controllato": "–" };
const COLORE: Record<Esito["stato"], string> = { ok: "#1a7f37", "da-migliorare": "#c62828", "non-controllato": "#6b7280" };

/** La data in formato svizzero, ora di Zurigo: 26.10.2026. */
export function dataSvizzera(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function html(testo: string): string {
  return testo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function daMigliorare(c: Controllo): Esito[] {
  return c.esiti.filter((e) => e.stato === "da-migliorare");
}

function impagina(corpo: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:600px">${corpo}</div>`;
}

function righeEsiti(c: Controllo): string {
  return c.esiti
    .map(
      (e) =>
        `<tr><td style="padding:10px 12px 10px 0;vertical-align:top;font-size:20px;color:${COLORE[e.stato]}">${SEGNO[e.stato]}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #eee"><b>${html(e.titolo)}</b><br>${html(e.testo)}<br>` +
        `<span style="font-size:12px;color:#6b7280">Fonte: <a href="${html(e.fonte.url)}" style="color:#116DFF">${html(e.fonte.titolo)}</a>, ${html(e.fonte.ente)}</span></td></tr>`,
    )
    .join("");
}

export function emailRapporto(c: Controllo, chi: Richiesta, pagina = PAGINA): Email {
  const saluto = chi.nome ? `Ciao ${chi.nome},` : "Ciao,";
  const brutti = daMigliorare(c);
  const invito = brutti.length
    ? `${brutti.length === 1 ? "C'è un punto" : `Ci sono ${brutti.length} punti`} da migliorare. Se vuoi, ti spiego come sistemarli: rispondi a questa email, il preventivo è senza impegno.`
    : "Il tuo sito fa bene queste cose di base. Se vuoi un parere sul resto (testi, foto, Google Maps), rispondi a questa email: il preventivo è senza impegno.";
  const nota = "Sono informazioni generali, fatte in automatico sulla pagina iniziale: non sostituiscono un'analisi completa.";
  const perche = `Hai ricevuto questa email perché hai chiesto il controllo di ${c.sito} su ${pagina.replace(/^https?:\/\//, "")}. Non riceverai altre email automatiche.`;
  const testo = [
    saluto,
    `ecco il controllo di ${c.sito} del ${dataSvizzera(c.quando)}.`,
    "",
    ...c.esiti.flatMap((e) => [`${SEGNO[e.stato]} ${e.titolo}: ${e.testo}`, `  Fonte: ${e.fonte.titolo}, ${e.fonte.ente}: ${e.fonte.url}`, ""]),
    invito,
    "",
    nota,
    "",
    ...FIRMA,
    "",
    perche,
  ].join("\n");
  return {
    oggetto: `Il controllo del tuo sito ${c.sito}`,
    testo,
    html: impagina(
      `<p>${html(saluto)}<br>ecco il controllo di <a href="${html(c.url)}" style="color:#116DFF">${html(c.sito)}</a> del ${dataSvizzera(c.quando)}.</p>` +
        `<table style="border-collapse:collapse;width:100%">${righeEsiti(c)}</table>` +
        `<p>${html(invito)}</p><p style="font-size:13px;color:#6b7280">${html(nota)}</p>` +
        `<p>${FIRMA.map(html).join("<br>")}</p>` +
        `<p style="font-size:12px;color:#9AA3B0">${html(perche)}</p>`,
    ),
  };
}

export function emailAvviso(c: Controllo, chi: Richiesta): Email {
  const brutti = daMigliorare(c);
  const dati = [
    ["Nome", chi.nome],
    ["Email", chi.email],
    ["Telefono", chi.telefono],
    ["Attività", chi.attivita],
    ["Sito", c.url],
  ].filter((r): r is [string, string] => Boolean(r[1]));
  const testo = [
    `${chi.nome || chi.email} ha controllato ${c.sito} e ha ricevuto il rapporto.`,
    "",
    ...dati.map(([k, v]) => `${k}: ${v}`),
    "",
    `Da migliorare (${brutti.length}): ${brutti.map((e) => e.titolo).join(", ") || "niente"}`,
    "",
    "Rispondi a questa email per scrivergli: la risposta va a lui.",
  ].join("\n");
  return {
    oggetto: `Nuovo contatto: ${chi.nome || chi.email} ha controllato ${c.sito}`,
    testo,
    html: impagina(
      `<p><b>${html(chi.nome || chi.email)}</b> ha controllato ${html(c.sito)} e ha ricevuto il rapporto.</p>` +
        `<p>${dati.map(([k, v]) => `${html(k)}: ${html(v)}`).join("<br>")}</p>` +
        `<table style="border-collapse:collapse;width:100%">${righeEsiti(c)}</table>` +
        `<p>Rispondi a questa email per scrivergli: la risposta va a lui.</p>`,
    ),
  };
}
