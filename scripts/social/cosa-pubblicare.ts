/**
 * Il primo passo del workflow pianificato: scrive in GITHUB_OUTPUT
 * `formato=video`, `formato=carosello` o `formato=niente` (scripts/social/turno.ts).
 *
 *   npm run social:turno
 *
 * HA_META=true: Instagram e Facebook sono collegati (video e carosello su
 * due social); HA_LINKEDIN=true: il carosello esce anche su LinkedIn. Senza
 * social collegati non c'è niente da fare, e il video non si fa nemmeno.
 */
import { appendFileSync } from "node:fs";
import { leggiStorico } from "./storico";
import { cosaPubblicare } from "./turno";

const meta = process.env.HA_META === "true" ? 2 : 0;
const linkedin = process.env.HA_LINKEDIN === "true" ? 1 : 0;
const formato = cosaPubblicare(leggiStorico(), new Date(), { video: meta, carosello: meta + linkedin }) ?? "niente";
console.log(formato === "niente" ? "Niente da pubblicare adesso." : `Adesso: ${formato}.`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `formato=${formato}\n`);
