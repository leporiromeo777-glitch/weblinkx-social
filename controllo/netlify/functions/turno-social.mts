/**
 * Ogni ora fa partire il workflow dei post di Weblinkx con formato «auto».
 * Lo schedule di GitHub salta molte esecuzioni (il 26.10 tre in un giorno,
 * nessuna alle 12 né alle 19), quello di Netlify no.
 *
 * Serve GITHUB_TOKEN_SOCIAL fra le variabili del progetto su Netlify: un token
 * «fine-grained» di GitHub solo per weblinkx-social, con il permesso Actions
 * in lettura e scrittura (README.md). Senza, la funzione non fa nulla.
 */
import type { Config } from "@netlify/functions";
import { momentoDiAvviare } from "../../src/turno";

const WORKFLOW = "https://api.github.com/repos/leporiromeo777-glitch/weblinkx-social/actions/workflows/social.yml/dispatches";

export default async () => {
  const token = Netlify.env.get("GITHUB_TOKEN_SOCIAL");
  if (!token) {
    console.warn("[turno-social] manca GITHUB_TOKEN_SOCIAL: il workflow resta solo sullo schedule di GitHub.");
    return;
  }
  if (!momentoDiAvviare(new Date())) return;
  const risposta = await fetch(WORKFLOW, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "weblinkx-turno-social",
    },
    body: JSON.stringify({ ref: "main", inputs: { formato: "auto", prova: "false" } }),
    signal: AbortSignal.timeout(10_000),
  });
  // 401: token sbagliato o scaduto; 403/404: manca il permesso Actions sul repository.
  if (!risposta.ok) console.error(`[turno-social] GitHub ha risposto ${risposta.status}`);
};

// Ogni ora al minuto 7 (UTC); se è prima delle 12 svizzere non fa nulla.
export const config: Config = { schedule: "7 * * * *" };
