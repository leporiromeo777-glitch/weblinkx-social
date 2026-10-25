/**
 * Il marchio Weblinkx come sul sito (https://weblinkx.ch): nome, colori,
 * carattere e servizi. Le grafiche (video/) e le didascalie partono da qui.
 */
export const MARCHIO = {
  nome: "Weblinkx",
  /** Nel logo «Web» è bianco e «linkx» blu. */
  logo: { prima: "Web", seconda: "linkx" },
  sito: "https://weblinkx.ch",
  motto: "Dove le idee diventano realtà",
  chi: "Romeo Lepori, creative freelancer",
  dove: "Ticino, Svizzera",
  /** Le tre cose che Weblinkx fa, con le parole del sito. */
  servizi: ["Siti web", "Branding", "Video pubblicitari"],
} as const;

/** I colori del sito (variabili CSS di weblinkx.ch). */
export const COLORI = {
  sfondo: "#0d0f14",
  sfondo2: "#141820",
  sfondo3: "#1e2330",
  blu: "#116DFF",
  bluScuro: "#004C73",
  testo: "#FFFFFF",
  tenue: "#9AA3B0",
  chiaro: "#E8EAED",
} as const;

/** Il carattere del sito. */
export const CARATTERE = "Inter";
