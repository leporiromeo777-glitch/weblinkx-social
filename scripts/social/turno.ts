/**
 * Cosa pubblicare adesso. GitHub ritarda gli orari programmati anche di ore,
 * o li salta: il workflow parte ogni ora e questa funzione decide se è il
 * momento del video (dalle 12 svizzere) o del carosello (dalle 19), finché
 * non sono usciti su tutti i social. Il registro (social/storico.json) evita
 * i doppioni.
 */
import { postDelGiorno } from "../../src/data/post";
import { oggiInSvizzera } from "../../src/lib/post";
import type { Formato, VoceStorico } from "./storico";

/** Da che ora (svizzera) esce ogni formato. */
export const ORE: Record<Formato, number> = { video: 12, carosello: 19 };

/** L'ora in Svizzera (0-23). */
export function oraInSvizzera(adesso: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hourCycle: "h23" }).format(adesso));
}

/**
 * Se conviene far partire il workflow adesso: dall'ora del primo formato a
 * mezzanotte. Prima non c'è niente da pubblicare.
 */
export function momentoDiControllare(adesso: Date): boolean {
  return oraInSvizzera(adesso) >= Math.min(...Object.values(ORE));
}

/**
 * Il formato da pubblicare adesso, o null se non c'è niente da fare. Il
 * carosello passa per primo: se il video continua a non uscire, la sera
 * esce comunque il carosello.
 */
export function cosaPubblicare(
  storico: readonly VoceStorico[],
  adesso: Date,
  social: Record<Formato, number>,
): Formato | null {
  const oggi = oggiInSvizzera(adesso);
  if (!postDelGiorno(oggi)) return null;
  const ora = oraInSvizzera(adesso);
  const usciti = (formato: Formato) => storico.filter((v) => v.data === oggi && v.formato === formato).length;
  if (ora >= ORE.carosello && usciti("carosello") < social.carosello) return "carosello";
  if (ora >= ORE.video && usciti("video") < social.video) return "video";
  return null;
}
