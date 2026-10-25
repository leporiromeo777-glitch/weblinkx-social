/**
 * I lavori di Weblinkx che si possono mostrare nei post: solo siti fatti da
 * Weblinkx e confermati da Romeo (25.10.2026). Le descrizioni riprendono
 * quello che c'è sui siti stessi: niente risultati inventati («+50% di
 * clienti»). Le immagini dei siti le fa `npm run catture` in risorse/siti/.
 */
export const ID_LAVORI = [
  "jf-limo",
  "essenza",
  "centro-cardiologico",
  "swiss-ncc",
  "slada",
  "villa-hedonia",
] as const;
export type IdLavoro = (typeof ID_LAVORI)[number];

export type Lavoro = {
  id: IdLavoro;
  /** Il nome del cliente, come sul suo sito. */
  nome: string;
  /** Che attività è, in poche parole. */
  attivita: string;
  /** Attività e luogo in breve, per l'etichetta della copertina. */
  breve: string;
  luogo: string;
  url: string;
  /** Le lingue del sito. */
  lingue: readonly string[];
  /** Cose che si vedono sul sito, da mostrare nei post. */
  cosaCe: readonly string[];
  /**
   * Una versione del sito di prima, nell'archivio di Internet Archive
   * (web.archive.org), per i post «prima e dopo». Solo se il sito di prima
   * era davvero del cliente.
   */
  prima?: { url: string; anno: number };
  /** Come fotografare il sito (scripts/catture.ts). */
  cattura?: {
    /** Il menu delle lingue e la lingua da scegliere, se il sito non parte in italiano. */
    lingua?: { selettore: string; valore: string };
    /** Elementi da nascondere (selettori CSS), per esempio un popup. */
    nascondi?: readonly string[];
  };
};

export const LAVORI: Record<IdLavoro, Lavoro> = {
  "jf-limo": {
    id: "jf-limo",
    nome: "JF Limo Service",
    attivita: "autista privato e limousine",
    breve: "Limousine, Zurigo",
    luogo: "Zurigo",
    url: "https://jf-limo-service.ch",
    lingue: ["tedesco", "inglese"],
    cosaCe: [
      "Prenotazione della corsa direttamente sul sito",
      "Le classi di veicoli da scegliere",
      "Le tratte più richieste",
      "Recensioni e domande frequenti",
    ],
  },
  essenza: {
    id: "essenza",
    nome: "EssenZa",
    attivita: "centro estetico",
    breve: "Centro estetico, Vacallo",
    luogo: "Vacallo",
    url: "https://essenzacentroestetico.ch",
    lingue: ["italiano"],
    cosaCe: [
      "Tutti i trattamenti, spiegati uno per uno",
      "I prodotti e l'organizzazione di eventi",
      "Il metodo del centro",
      "Il primo appuntamento si prenota dal sito",
    ],
  },
  "centro-cardiologico": {
    id: "centro-cardiologico",
    nome: "Centro Cardiologico Ticino",
    attivita: "centro di cardiologia",
    breve: "Centro medico, Lugano",
    luogo: "Lugano",
    url: "https://centrocardiologico.ch",
    lingue: ["italiano"],
    cosaCe: ["La filosofia del centro", "I check-up", "Dove si trova, nel cuore di Lugano"],
  },
  "swiss-ncc": {
    id: "swiss-ncc",
    nome: "Swiss NCC",
    attivita: "autista privato e transfer",
    breve: "Transfer, Svizzera",
    luogo: "Svizzera",
    url: "https://swissncc.ch",
    lingue: ["tedesco", "inglese", "francese", "italiano", "spagnolo", "russo"],
    cosaCe: [
      "Transfer da e per gli aeroporti svizzeri",
      "La flotta, sempre in vista",
      "Le tratte più richieste",
      "Prenotare in pochi passi",
    ],
    cattura: { lingua: { selettore: "select.lang-sel", valore: "it" } },
  },
  slada: {
    id: "slada",
    nome: "Slađa",
    attivita: "trattori, attrezzi, concimi e sementi",
    breve: "Negozio agricolo, Bosnia",
    luogo: "Velika Obarska (Bosnia ed Erzegovina)",
    url: "https://doosladja.com",
    lingue: ["serbo"],
    cosaCe: ["Il catalogo dei prodotti", "Un'azienda attiva dal 2001", "Contatti e indicazioni per arrivare"],
    // Il popup «Želite ovakav sajt?» che rimanda a Weblinkx.
    cattura: { nascondi: [".wlx-pop"] },
  },
  "villa-hedonia": {
    id: "villa-hedonia",
    nome: "Villa Hedonia",
    attivita: "villa con piscina per matrimoni e feste",
    breve: "Villa per eventi, Bosnia",
    luogo: "Bijeljina (Bosnia ed Erzegovina)",
    url: "https://villahedonia.com",
    lingue: ["serbo"],
    cosaCe: [
      "Le foto della villa e della piscina",
      "Matrimoni, compleanni e feste",
      "Si controlla se la data è libera",
    ],
  },
};

export function trovaLavoro(id: IdLavoro): Lavoro {
  return LAVORI[id];
}
