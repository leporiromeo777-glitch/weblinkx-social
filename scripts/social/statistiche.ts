/**
 * Le statistiche dei post usciti: social/statistiche.json. Le legge ogni
 * giorno scripts/social/aggiorna-statistiche.ts da Instagram e Facebook (per
 * LinkedIn l'API non le dà ai profili personali) e il workflow le salva nel
 * repository; src/lib/social/analisi.ts le confronta.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { VoceStorico } from "./storico";

export const FILE_STATISTICHE = "social/statistiche.json";

/** Dopo 28 giorni i numeri di un post non cambiano quasi più: non si rileggono. */
export const GIORNI_LETTURA = 28;
/** Una lettura più giovane di così è ancora buona (il workflow gira due volte al giorno). */
const ORE_FRESCA = 20;

const GIORNO_MS = 86_400_000;

export type VoceStatistiche = Pick<VoceStorico, "data" | "post" | "piattaforma" | "formato" | "id"> & {
  /** Istante della lettura (ISO, UTC). */
  lettoIl: string;
  /** Giorni passati dalla pubblicazione al momento della lettura. */
  giorni: number;
  /** Le metriche come le dà Meta (vedi METRICHE in scripts/social/meta.ts). */
  metriche: Record<string, number>;
};

const chiave = (v: Pick<VoceStorico, "piattaforma" | "formato" | "id">) => `${v.piattaforma}|${v.formato}|${v.id}`;

/**
 * Le pubblicazioni di cui leggere le statistiche: Instagram e Facebook,
 * uscite da meno di GIORNI_LETTURA giorni e senza una lettura fresca.
 */
export function daLeggere(storico: readonly VoceStorico[], statistiche: readonly VoceStatistiche[], adesso: Date): VoceStorico[] {
  const lette = new Map(statistiche.map((s) => [chiave(s), s]));
  return storico.filter((v) => {
    if (v.piattaforma === "linkedin") return false;
    if (adesso.getTime() - Date.parse(v.pubblicatoIl) > GIORNI_LETTURA * GIORNO_MS) return false;
    const ultima = lette.get(chiave(v));
    return !ultima || adesso.getTime() - Date.parse(ultima.lettoIl) > ORE_FRESCA * 3_600_000;
  });
}

/** Una lettura nuova per una pubblicazione. */
export function lettura(voce: VoceStorico, metriche: Record<string, number>, adesso: Date): VoceStatistiche {
  const giorni = Math.max(0, Math.round(((adesso.getTime() - Date.parse(voce.pubblicatoIl)) / GIORNO_MS) * 10) / 10);
  return {
    data: voce.data,
    post: voce.post,
    piattaforma: voce.piattaforma,
    formato: voce.formato,
    id: voce.id,
    lettoIl: adesso.toISOString(),
    giorni,
    metriche,
  };
}

/** Le statistiche con le letture nuove al posto delle vecchie, in ordine di data, social e formato. */
export function aggiornaStatistiche(statistiche: readonly VoceStatistiche[], nuove: readonly VoceStatistiche[]): VoceStatistiche[] {
  const tutte = new Map(statistiche.map((s) => [chiave(s), s]));
  for (const s of nuove) tutte.set(chiave(s), s);
  const ordine = (v: VoceStatistiche) => `${v.data}|${v.piattaforma}|${v.formato}|${v.post}`;
  return [...tutte.values()].sort((a, b) => ordine(a).localeCompare(ordine(b)));
}

export function leggiStatistiche(file: string = FILE_STATISTICHE): VoceStatistiche[] {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as VoceStatistiche[]) : [];
}

export function scriviStatistiche(statistiche: readonly VoceStatistiche[], file: string = FILE_STATISTICHE) {
  writeFileSync(file, `${JSON.stringify(statistiche, null, 2)}\n`);
}
