/**
 * Fotografa i siti dei clienti (src/data/lavori.ts) per i post: la pagina
 * intera come la vede un computer e come la vede un telefono, in
 * risorse/siti/<id>/desktop.jpg e mobile.jpg, con le misure in
 * risorse/siti/dimensioni.json. Nei video la pagina scorre
 * (video/src/Reel.tsx). Per i lavori con un sito «di prima» fotografa anche
 * quello, dall'archivio di Internet Archive (prima-desktop.jpg, prima-mobile.jpg).
 *
 *   npm run catture               tutti i lavori
 *   npm run catture -- <id> ...   solo questi
 *
 * Serve Playwright con Chromium (npx playwright install chromium). Le
 * immagini vanno nel repository: si rifanno quando un sito cambia.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ID_LAVORI, LAVORI, type IdLavoro, type Lavoro } from "../src/data/lavori";

// Playwright non è fra le dipendenze: si usa quello installato sul computer.
// Bastano pochi tipi, scritti qui.
type Pagina = {
  goto(url: string, opzioni: object): Promise<unknown>;
  waitForLoadState(stato?: string): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate(codice: string): Promise<unknown>;
  addStyleTag(opzioni: { content: string }): Promise<unknown>;
  screenshot(opzioni: object): Promise<unknown>;
  getByRole(ruolo: string): { all(): Promise<Elemento[]> };
  locator(selettore: string): { filter(f: object): { first(): { selectOption(v: string): Promise<unknown> } } };
};
type Elemento = { innerText(): Promise<string>; isVisible(): Promise<boolean>; click(): Promise<void> };
type Playwright = {
  chromium: {
    launch(): Promise<{
      newContext(opzioni: object): Promise<{ newPage(): Promise<Pagina> }>;
      close(): Promise<void>;
    }>;
  };
  devices: Record<string, object>;
};
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright") as Playwright;

/** Le pagine lunghissime si tagliano: nei post se ne vede l'inizio e qualche sezione. */
const ALTEZZA_MASSIMA = { desktop: 7_000, mobile: 6_000 } as const;

const VISTE = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { ...devices["iPhone 13"], deviceScaleFactor: 2 },
} as const;

/** I pulsanti per accettare i cookie, nelle lingue dei siti. */
const COOKIE = /^(accetta|accetto|accetta tutto|accept|accept all|akzeptieren|alle akzeptieren|prihvati|prihvatam|ok)$/i;

/**
 * Scorre tutta la pagina, così le immagini «lazy» e le animazioni all'entrata
 * si caricano. È una stringa: tsx aggiungerebbe alle funzioni un aiuto
 * (__name) che nel browser non esiste.
 */
const SCORRI = `(async () => {
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
    window.scrollTo(0, y);
    await pausa(180);
  }
  window.scrollTo(0, 0);
  await pausa(400);
})()`;

async function scorriTutto(pagina: Pagina) {
  await pagina.evaluate(SCORRI);
}

type Misure = { larghezza: number; altezza: number };

/** Fotografa la pagina e restituisce le misure dell'immagine, in pixel. */
async function fotografa(url: string, vista: keyof typeof VISTE, file: string, cattura: Lavoro["cattura"] = {}): Promise<Misure> {
  const browser = await chromium.launch();
  try {
    const contesto = await browser.newContext({ ...VISTE[vista], locale: "it-CH" });
    const pagina = await contesto.newPage();
    await pagina.goto(url, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => pagina.waitForLoadState("load"));
    for (const pulsante of await pagina.getByRole("button").all()) {
      const testo = (await pulsante.innerText().catch(() => "")).trim();
      if (COOKIE.test(testo) && (await pulsante.isVisible())) await pulsante.click().catch(() => {});
    }
    if (cattura.lingua) {
      const menu = pagina.locator(cattura.lingua.selettore).filter({ visible: true }).first();
      await menu.selectOption(cattura.lingua.valore);
      await pagina.waitForLoadState("networkidle").catch(() => {});
    }
    if (cattura.nascondi?.length) {
      await pagina.addStyleTag({ content: `${cattura.nascondi.join(", ")} { display: none !important; }` });
    }
    await scorriTutto(pagina);
    await pagina.waitForTimeout(1_500);
    const { larghezza, altezza } = (await pagina.evaluate(
      "({ larghezza: document.documentElement.clientWidth, altezza: document.documentElement.scrollHeight })",
    )) as { larghezza: number; altezza: number };
    const taglio = Math.min(altezza, ALTEZZA_MASSIMA[vista]);
    await pagina.screenshot({
      path: file,
      type: "jpeg",
      quality: 82,
      fullPage: true,
      clip: { x: 0, y: 0, width: larghezza, height: taglio },
    });
    console.log(`${file}: ${larghezza}×${taglio}${altezza > taglio ? ` (pagina di ${altezza}, tagliata)` : ""}`);
    const scala = VISTE[vista].deviceScaleFactor;
    return { larghezza: larghezza * scala, altezza: taglio * scala };
  } finally {
    await browser.close();
  }
}

const richiesti = process.argv.slice(2);
const sconosciuti = richiesti.filter((id) => !(ID_LAVORI as readonly string[]).includes(id));
if (sconosciuti.length) {
  console.error(`Lavori sconosciuti: ${sconosciuti.join(", ")}. Gli id sono in src/data/lavori.ts.`);
  process.exit(1);
}
// Le misure delle immagini servono ai video per sapere quanto può scorrere la pagina.
const FILE_MISURE = join("risorse", "siti", "dimensioni.json");
const misure = (existsSync(FILE_MISURE) ? JSON.parse(readFileSync(FILE_MISURE, "utf8")) : {}) as Record<string, Record<string, Misure>>;
const ids = (richiesti.length ? richiesti : ID_LAVORI) as readonly IdLavoro[];
for (const id of ids) {
  const lavoro = LAVORI[id];
  const cartella = join("risorse", "siti", id);
  mkdirSync(cartella, { recursive: true });
  misure[id] = {};
  for (const vista of ["desktop", "mobile"] as const) {
    misure[id][vista] = await fotografa(lavoro.url, vista, join(cartella, `${vista}.jpg`), lavoro.cattura);
    if (lavoro.prima) misure[id][`prima-${vista}`] = await fotografa(lavoro.prima.url, vista, join(cartella, `prima-${vista}.jpg`));
  }
  const ordinate = Object.fromEntries(Object.entries(misure).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(FILE_MISURE, `${JSON.stringify(ordinate, null, 2)}\n`);
}
