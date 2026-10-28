/**
 * Quando far partire il workflow dei post di Weblinkx (repository
 * weblinkx-social, .github/workflows/social.yml): dalle 12 a mezzanotte, ora
 * svizzera. Il video esce dalle 12, il carosello dalle 19; prima non c'è
 * niente da pubblicare. Cosa pubblicare lo decide poi il workflow, e il
 * registro evita i doppioni.
 */

/** La prima ora utile: quella del video (ORE in scripts/social/turno.ts). */
export const DALLE = 12;

/** L'ora in Svizzera (0-23). */
export function oraInSvizzera(adesso: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hourCycle: "h23" }).format(adesso));
}

export function momentoDiAvviare(adesso: Date): boolean {
  return oraInSvizzera(adesso) >= DALLE;
}
