/**
 * Il video verticale del post del giorno (Reel di Instagram e della pagina
 * Facebook): quanto dura ogni scheda, quando compare ogni punto e quali
 * suoni partono. Logica pura: la disegna Reel.tsx, i suoni li fa
 * scripts/audio-reel.py.
 */
import type { PostSocial, SchedaPost } from "../../src/data/post";

export const FPS_REEL = 30;
export const LARGHEZZA_REEL = 1080;
export const ALTEZZA_REEL = 1920;

export type ParteReel = {
  /** null: la chiusura con l'invito. */
  scheda: SchedaPost | null;
  indice: number;
  inizio: number;
  durata: number;
  /** Elenchi e confronti: il fotogramma (dall'inizio della parte) in cui compare ogni punto. */
  punti: number[];
};

export type TempiReel = { parti: ParteReel[]; totale: number };

/**
 * La voce (la misura scripts/reel.ts): per ogni scheda quanto dura la frase
 * e, negli elenchi, quando comincia ogni punto (fotogrammi dall'inizio della
 * frase); poi la chiusura.
 */
export type VoceReel = { schede: { durata: number; punti: number[] | null }[]; chiusura: number };

/** Senza voce: quanto resta ogni scheda. */
const DURATE = { copertina: 105, sito: 150, cifra: 105, chiusura: 120 } as const;
/** Elenco: la scheda entra, poi un punto ogni 45 fotogrammi, poi una pausa per leggere. */
const ELENCO = { primo: 24, passo: 45, coda: 36 } as const;
/** Con la voce: la frase parte poco dopo la scheda e, finita, resta un attimo di respiro. */
export const ATTACCO_VOCE = 8;
const CODA_VOCE = 14;
/** Fra un punto e l'altro almeno mezzo secondo. */
const PASSO_MINIMO = 16;
/** Un sito resta almeno 4 secondi: il tempo di vederlo scorrere. */
const MINIMO_SITO = 120;

/** Quanti punti compaiono uno alla volta: quelli dell'elenco, o «no» e «sì» del confronto. */
export function elementi(scheda: SchedaPost): number {
  if (scheda.tipo === "punti") return scheda.punti.length;
  if (scheda.tipo === "confronto") return 2;
  return 0;
}

export function tempiReel(post: PostSocial, voce: VoceReel | null = null): TempiReel {
  const parti: ParteReel[] = [];
  let t = 0;
  post.schede.forEach((scheda, indice) => {
    const n = elementi(scheda);
    let punti = Array.from({ length: n }, (_, k) => ELENCO.primo + k * ELENCO.passo);
    let durata: number =
      scheda.tipo === "copertina" ? DURATE.copertina : scheda.tipo === "sito" ? DURATE.sito : scheda.tipo === "cifra" ? DURATE.cifra : ELENCO.primo + n * ELENCO.passo + ELENCO.coda;
    const frase = voce?.schede[indice];
    if (frase) {
      // Ogni punto compare quando la voce comincia a dirlo, un attimo prima.
      if (frase.punti && n) {
        punti = frase.punti.slice(0, n).map((p) => Math.max(ELENCO.primo, ATTACCO_VOCE + p - 3));
        for (let k = 1; k < punti.length; k++) punti[k] = Math.max(punti[k], punti[k - 1] + PASSO_MINIMO);
      }
      const minimo = scheda.tipo === "copertina" ? DURATE.copertina : scheda.tipo === "sito" ? MINIMO_SITO : 60;
      durata = Math.max(minimo, ATTACCO_VOCE + frase.durata + CODA_VOCE, (punti.at(-1) ?? 0) + 30);
    }
    parti.push({ scheda, indice, inizio: t, durata, punti });
    t += durata;
  });
  const chiusura = voce ? Math.max(DURATE.chiusura, ATTACCO_VOCE + voce.chiusura + 24) : DURATE.chiusura;
  parti.push({ scheda: null, indice: post.schede.length, inizio: t, durata: chiusura, punti: [] });
  return { parti, totale: t + chiusura };
}

/** Un suono del video, a un fotogramma preciso (li suona scripts/audio-reel.py). */
export type SuonoReel = {
  tipo: "passaggio" | "punto" | "conta" | "cifra" | "festa";
  fotogramma: number;
  /** Punto: quale (la nota sale a ogni punto). */
  indice?: number;
  /** Conta: per quanti fotogrammi ticchetta. */
  durata?: number;
};

/** Il fotogramma (dall'inizio della cifra) in cui il numero comincia e finisce di salire (vedi Schede.tsx). */
export const CONTA = { da: 8, a: 42 } as const;

/**
 * I suoni del video, legati alle animazioni: un soffio a ogni cambio di
 * scheda, un «pop» quando compare un punto, il ticchettio mentre la cifra
 * sale e una piccola festa quando compare il pulsante finale.
 */
export function suoniReel(tempi: TempiReel, contaCifra: (cifra: string) => boolean): SuonoReel[] {
  const suoni: SuonoReel[] = [];
  for (const parte of tempi.parti) {
    // Il soffio parte un attimo prima, mentre la scheda vecchia esce.
    suoni.push({ tipo: "passaggio", fotogramma: Math.max(0, parte.inizio - (parte.indice ? 6 : 0)) });
    parte.punti.forEach((comparsa, k) => suoni.push({ tipo: "punto", fotogramma: parte.inizio + comparsa, indice: k }));
    if (parte.scheda?.tipo === "cifra") {
      if (contaCifra(parte.scheda.cifra)) suoni.push({ tipo: "conta", fotogramma: parte.inizio + CONTA.da, durata: CONTA.a - CONTA.da });
      suoni.push({ tipo: "cifra", fotogramma: parte.inizio + CONTA.a });
    }
    if (!parte.scheda) suoni.push({ tipo: "festa", fotogramma: parte.inizio + 26 });
  }
  return suoni.sort((a, b) => a.fotogramma - b.fotogramma);
}

/** «2,5 secondi» → { numero: 2.5, decimali: 1, prima: "", dopo: " secondi" }; null per le date e i testi senza numero. */
export function numeroDaContare(cifra: string): { prima: string; numero: number; decimali: number; dopo: string } | null {
  if (/\d\.\d/.test(cifra)) return null;
  const m = /^(\D*?)(\d+)(?:,(\d+))?(.*)$/.exec(cifra);
  if (!m) return null;
  return { prima: m[1], numero: Number(`${m[2]}.${m[3] ?? 0}`), decimali: m[3]?.length ?? 0, dopo: m[4] };
}
