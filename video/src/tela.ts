/**
 * Le due tele: il carosello (1080×1350, il 4:5 di Instagram) e il video
 * verticale (1080×1920). Nel video Instagram copre in alto il nome e in
 * basso didascalia e pulsanti: i testi stanno fra `alto` e `basso`, telefoni
 * e browser possono scendere un po' più giù.
 */
export type Tela = {
  formato: "post" | "reel";
  larghezza: number;
  altezza: number;
  /** Margine a sinistra e a destra. */
  x: number;
  alto: number;
  basso: number;
  /** Quanto più grandi sono i caratteri rispetto al carosello. */
  scala: number;
};

export const TELA_POST: Tela = { formato: "post", larghezza: 1080, altezza: 1350, x: 80, alto: 170, basso: 1215, scala: 1 };
export const TELA_REEL: Tela = { formato: "reel", larghezza: 1080, altezza: 1920, x: 72, alto: 300, basso: 1450, scala: 1.2 };

export const larghezzaUtile = (tela: Tela) => tela.larghezza - 2 * tela.x;
