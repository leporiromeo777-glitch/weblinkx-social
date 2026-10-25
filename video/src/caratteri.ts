/**
 * Il carattere del sito Weblinkx: Inter. Gli indirizzi dei file vengono da
 * @remotion/google-fonts; scripts/caratteri.ts li scarica in public/fonts/,
 * così il render non dipende dalla rete.
 */
import { getInfo } from "@remotion/google-fonts/Inter";

/** latin per l'italiano, latin-ext per i nomi come Slađa. */
const SOTTOINSIEMI = ["latin", "latin-ext"] as const;
const PESI = ["400", "500", "600", "700", "800"] as const;

export type FileCarattere = { famiglia: string; peso: string; url: string; file: string; unicodeRange: string };

export function fileCaratteri(): FileCarattere[] {
  const info = getInfo();
  return PESI.flatMap((peso) =>
    SOTTOINSIEMI.map((sottoinsieme) => {
      const url = (info.fonts.normal as Record<string, Record<string, string>>)[peso][sottoinsieme];
      return {
        famiglia: info.fontFamily,
        peso,
        url,
        file: `fonts/${url.split("/").slice(-3).join("-")}`,
        unicodeRange: (info.unicodeRanges as Record<string, string>)[sottoinsieme],
      };
    }),
  );
}

export const FAMIGLIA = getInfo().fontFamily;
