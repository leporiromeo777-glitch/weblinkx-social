/**
 * Il registro di cosa è uscito sui social: social/storico.json. Lo aggiorna
 * scripts/social/pubblica.ts dopo ogni pubblicazione e il workflow lo salva
 * nel repository. Serve a non pubblicare due volte lo stesso post e, più
 * avanti, a leggere le statistiche di ogni post.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Piattaforma } from "../../src/lib/post";

export const FILE_STORICO = "social/storico.json";

export const FORMATI = ["carosello", "video"] as const;
export type Formato = (typeof FORMATI)[number];

export type VoceStorico = {
  /** Giorno del post (ISO). */
  data: string;
  /** Id del post in src/data/post.ts. */
  post: string;
  piattaforma: Piattaforma;
  formato: Formato;
  /** Id del post sul social. */
  id: string;
  /** Istante della pubblicazione (ISO, UTC). */
  pubblicatoIl: string;
};

type Chiave = Pick<VoceStorico, "data" | "post" | "piattaforma" | "formato">;

/** La voce già pubblicata con la stessa chiave, se c'è. */
export function giaPubblicato(storico: readonly VoceStorico[], chiave: Chiave): VoceStorico | undefined {
  return storico.find(
    (v) => v.data === chiave.data && v.post === chiave.post && v.piattaforma === chiave.piattaforma && v.formato === chiave.formato,
  );
}

/** Lo storico con le voci nuove, in ordine di data, social e formato (così i diff restano piccoli). */
export function aggiungiAlloStorico(storico: readonly VoceStorico[], nuove: readonly VoceStorico[]): VoceStorico[] {
  const chiave = (v: VoceStorico) => `${v.data}|${v.piattaforma}|${v.formato}|${v.post}`;
  return [...storico, ...nuove].sort((a, b) => chiave(a).localeCompare(chiave(b)));
}

/** Lo storico senza la voce indicata (un post cancellato dal social e ripubblicato). */
export function togliDalloStorico(storico: readonly VoceStorico[], voce: VoceStorico): VoceStorico[] {
  return storico.filter((v) => v !== voce);
}

export function leggiStorico(file: string = FILE_STORICO): VoceStorico[] {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as VoceStorico[]) : [];
}

export function scriviStorico(storico: readonly VoceStorico[], file: string = FILE_STORICO) {
  writeFileSync(file, `${JSON.stringify(storico, null, 2)}\n`);
}
