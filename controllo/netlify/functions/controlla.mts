/**
 * POST /api/controlla con { url }: fa il controllo del sito (src/controllo.ts)
 * e risponde con i risultati, che la pagina mostra. La velocità si misura
 * solo con PAGESPEED_API_KEY (una chiave gratuita di Google, vedi README).
 */
import type { Config } from "@netlify/functions";
import { controlla, ErroreControllo } from "../../src/controllo";

export default async (req: Request) => {
  const corpo = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof corpo?.url !== "string") return Response.json({ errore: "Scrivi l'indirizzo del sito." }, { status: 400 });
  try {
    return Response.json(await controlla(corpo.url, Netlify.env.get("PAGESPEED_API_KEY")));
  } catch (errore) {
    if (errore instanceof ErroreControllo) return Response.json({ errore: errore.message }, { status: 422 });
    console.error("[controlla]", errore);
    return Response.json({ errore: "Qualcosa non ha funzionato. Riprova tra poco." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/controlla", method: "POST" };
