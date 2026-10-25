/**
 * Fa le immagini dei post (src/data/post.ts) nella cartella social/ del
 * repository, da cui le pubblica scripts/social/pubblica.ts:
 *
 *   npm run social               tutti i post
 *   npm run social -- <id> ...   solo questi
 *
 * Un JPEG 1080×1350 per scheda più quello finale (social/<id>/01.jpg, 02.jpg,
 * …): Instagram pubblica solo JPEG. Le immagini vanno nel repository, con
 * contenuto.json: i test lo usano per accorgersi delle immagini da rifare.
 * Serve curl per il carattere, la prima volta. Il browser è quello che
 * Remotion scarica da solo; per usarne un altro: REMOTION_BROWSER=/percorso/di/chrome.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { contenutoImmagini, immaginiPost, POST_SOCIAL } from "../../src/data/post";
import { scaricaCaratteri } from "./caratteri";
import { copiaSiti } from "./risorse";

const QUI = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(QUI, "..");
const SOCIAL = join(VIDEO, "..", "social");

const richiesti = process.argv.slice(2);
const sconosciuti = richiesti.filter((id) => !POST_SOCIAL.some((p) => p.id === id));
if (sconosciuti.length) {
  console.error(`Post sconosciuti: ${sconosciuti.join(", ")}. Gli id sono in src/data/post.ts.`);
  process.exit(1);
}
const post = richiesti.length ? POST_SOCIAL.filter((p) => richiesti.includes(p.id)) : POST_SOCIAL;

// Carattere e foto dei siti in public/ prima del bundle, che li copia.
scaricaCaratteri(VIDEO);
copiaSiti(VIDEO);

const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const serveUrl = await bundle({ entryPoint: join(VIDEO, "src", "index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
try {
  for (const p of post) {
    const cartella = join(SOCIAL, p.id);
    rmSync(cartella, { recursive: true, force: true });
    mkdirSync(cartella, { recursive: true });
    const nomi = immaginiPost(p);
    for (const [indice, nome] of nomi.entries()) {
      const inputProps = { postId: p.id, indice };
      const composition = await selectComposition({ serveUrl, id: "post", inputProps, puppeteerInstance: browser, browserExecutable });
      await renderStill({
        composition,
        serveUrl,
        inputProps,
        output: join(cartella, nome),
        imageFormat: "jpeg",
        jpegQuality: 90,
        overwrite: true,
        puppeteerInstance: browser,
        browserExecutable,
      });
    }
    writeFileSync(join(cartella, "contenuto.json"), contenutoImmagini(p));
    console.log(`social/${p.id}/: ${nomi.length} immagini`);
  }
} finally {
  await browser.close({ silent: true });
}
