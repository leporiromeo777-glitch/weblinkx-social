/**
 * Legge da Instagram e Facebook le statistiche dei post usciti negli ultimi
 * 28 giorni (social/storico.json), le salva in social/statistiche.json e
 * riscrive social/analisi.md: quali post vanno meglio e perché
 * (src/lib/social/analisi.ts).
 *
 *   npm run social:statistiche
 *
 * Lo lancia ogni giorno il workflow .github/workflows/social.yml. Serve il
 * token della pagina con i permessi per le statistiche (social/README.md).
 */
import { writeFileSync } from "node:fs";
import { POST_SOCIAL } from "../../src/data/post";
import { analisi } from "../../src/lib/analisi";
import { leggiConfigurazione } from "./configurazione";
import { ErroreMeta, statisticheFacebook, statisticheInstagram } from "./meta";
import { aggiornaStatistiche, daLeggere, leggiStatistiche, lettura, scriviStatistiche, type VoceStatistiche } from "./statistiche";
import { leggiStorico } from "./storico";

const FILE_ANALISI = "social/analisi.md";

async function main() {
  const conf = leggiConfigurazione(process.env);
  const adesso = new Date();
  let statistiche = leggiStatistiche();

  if (!conf.meta) {
    console.log("Meta non collegato (manca META_PAGE_TOKEN): niente statistiche da leggere.");
  } else {
    const voci = daLeggere(leggiStorico(), statistiche, adesso);
    const nuove: VoceStatistiche[] = [];
    let permessi = false;
    for (const voce of voci) {
      try {
        const metriche =
          voce.piattaforma === "instagram"
            ? await statisticheInstagram(conf.meta, voce.id, voce.formato)
            : await statisticheFacebook(conf.meta, voce.id, voce.formato);
        nuove.push(lettura(voce, metriche, adesso));
      } catch (errore) {
        const messaggio = errore instanceof Error ? errore.message : String(errore);
        if (errore instanceof ErroreMeta && [10, 200, 190].includes(errore.codice ?? 0)) permessi = true;
        console.error(`${voce.piattaforma}, ${voce.formato} del ${voce.data} (${voce.post}): ${messaggio}`);
        process.exitCode = 1;
      }
    }
    if (nuove.length) {
      statistiche = aggiornaStatistiche(statistiche, nuove);
      scriviStatistiche(statistiche);
    }
    console.log(`Statistiche lette: ${nuove.length} di ${voci.length}.`);
    if (permessi) {
      console.error(
        "Meta rifiuta per i permessi: rigenera il token della pagina con instagram_manage_insights, read_insights e pages_manage_engagement (social/README.md).",
      );
    }
  }

  writeFileSync(FILE_ANALISI, analisi(POST_SOCIAL, statistiche, adesso));
  console.log(`Analisi aggiornata: ${FILE_ANALISI}`);
}

main().catch((errore) => {
  console.error(errore);
  process.exitCode = 1;
});
