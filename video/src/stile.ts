/** Colori e carattere del marchio, come sul sito (src/data/marchio.ts). */
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { COLORI as MARCHIO } from "../../src/data/marchio";
import { FAMIGLIA, fileCaratteri } from "./caratteri";

export const COLORI = {
  ...MARCHIO,
  /** Il blu più chiaro, per le parole evidenziate sul fondo scuro. */
  bluChiaro: "#4D8FFF",
  bordo: "#262d3d",
  no: "#FF6B6B",
} as const;

export const SFUMATURA_BLU = `linear-gradient(100deg, ${MARCHIO.blu} 0%, #4D8FFF 100%)`;
export const OMBRA = "0 40px 90px -30px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04)";

// Il render aspetta che i caratteri siano caricati (loadFont usa delayRender).
for (const c of fileCaratteri()) {
  void loadFont({ family: c.famiglia, url: staticFile(c.file), weight: c.peso, unicodeRange: c.unicodeRange });
}

export const CARATTERE = `"${FAMIGLIA}", sans-serif`;
