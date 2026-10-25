/**
 * Pubblica il post del giorno (src/data/post.ts) sui social collegati:
 * Instagram e pagina Facebook (Graph API di Meta), profilo LinkedIn.
 *
 *   npm run social:pubblica                          il carosello di immagini
 *   SOCIAL_FORMATO=video npm run social:pubblica     il video (Reel) su Instagram e Facebook
 *
 * Il video lo fa prima `npm run reel` in video/.
 * Lo lancia ogni giorno il workflow .github/workflows/social.yml. Variabili
 * d'ambiente e collegamento dei social: social/README.md. Con SOCIAL_PROVA=true
 * mostra testi e immagini e controlla chiavi e id, senza pubblicare nulla.
 * Ogni pubblicazione finisce in social/storico.json (scripts/social/storico.ts):
 * un post già uscito su un social non viene ripubblicato.
 */
import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FINE_PIANO, immaginiPost, INIZIO_PIANO, postDelGiorno, senzaEvidenza, type PostSocial } from "../../src/data/post";
import { dataSvizzera } from "../../src/lib/post";
import { didascalia, testiAlternativi, type Piattaforma } from "../../src/lib/post";
import { leggiConfigurazione, statoPiattaforma, type Configurazione } from "./configurazione";
import { autoreLinkedIn, pubblicaLinkedIn } from "./linkedin";
import {
  esisteSuMeta,
  pubblicaFacebook,
  pubblicaInstagram,
  pubblicaReelFacebook,
  pubblicaReelInstagram,
  verificaMeta,
} from "./meta";
import {
  aggiungiAlloStorico,
  giaPubblicato,
  leggiStorico,
  scriviStorico,
  togliDalloStorico,
  type VoceStorico,
} from "./storico";

type Esito = { piattaforma: Piattaforma; stato: "pubblicato" | "prova" | "saltato" | "errore"; dettaglio: string };

const NOMI: Record<Piattaforma, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };

/**
 * Il momento del video usato come copertina su Instagram: il titolo della
 * prima scheda è già tutto entrato (vedi video/src/social/tempi-reel.ts).
 */
const COPERTINA_REEL_MS = 2_500;

/** Il file del video del post, come lo scrive `npm run reel` in video/. */
const fileVideo = (conf: Configurazione, post: PostSocial) => conf.video ?? join("video", "out", `reel-${post.id}.mp4`);

/** Instagram e Facebook scaricano le immagini dall'indirizzo pubblico: prima controlliamo che rispondano. */
async function controllaIndirizzi(indirizzi: readonly string[]): Promise<string | null> {
  for (const url of indirizzi) {
    const risposta = await fetch(url, { method: "HEAD" }).catch(() => null);
    const tipo = risposta?.headers.get("content-type") ?? "";
    if (!risposta?.ok || !tipo.startsWith("image/jpeg")) {
      return `${url} non risponde con un JPEG (${risposta ? `HTTP ${risposta.status}, ${tipo || "senza tipo"}` : "nessuna risposta"})`;
    }
  }
  return null;
}

async function pubblica(conf: Configurazione, post: PostSocial, piattaforma: Piattaforma, file: string[], indirizzi: string[]) {
  const testo = didascalia(post, piattaforma, conf.sitoUrl ?? undefined);
  if (conf.formato === "video") {
    const video = new Uint8Array(readFileSync(file[0]));
    if (piattaforma === "instagram") return pubblicaReelInstagram(conf.meta!, conf.meta!.instagramId!, video, testo, COPERTINA_REEL_MS);
    if (piattaforma === "facebook") return pubblicaReelFacebook(conf.meta!, conf.meta!.paginaId!, video, testo);
    throw new Error("il video esce solo su Instagram e Facebook");
  }
  switch (piattaforma) {
    case "instagram":
      return pubblicaInstagram(conf.meta!, conf.meta!.instagramId!, indirizzi, testo);
    case "facebook":
      return pubblicaFacebook(conf.meta!, conf.meta!.paginaId!, indirizzi, testo);
    case "linkedin": {
      const autore = await autoreLinkedIn(conf.linkedin!);
      const alternativi = testiAlternativi(post);
      const immagini = file.map((f, i) => ({ dati: new Uint8Array(readFileSync(f)), testoAlternativo: alternativi[i] }));
      return pubblicaLinkedIn(conf.linkedin!, autore, immagini, testo);
    }
  }
}

/** Una lettura che usa chiave e id senza pubblicare: dice a nome di chi uscirebbe il post. */
async function controllaCredenziali(conf: Configurazione, piattaforma: Piattaforma): Promise<string> {
  switch (piattaforma) {
    case "instagram":
    case "facebook": {
      const { pagina, instagram, permessiMancanti, nonScade } = await verificaMeta(
        conf.meta!,
        conf.meta!.paginaId,
        conf.meta!.instagramId,
      );
      const note = [
        nonScade ? "token che non scade" : "scadenza del token non verificata",
        ...(permessiMancanti.length ? [`per le statistiche manca ${permessiMancanti.join(" e ")}`] : []),
      ];
      return `${piattaforma === "instagram" ? `account @${instagram}` : `pagina «${pagina}»`} (${note.join(", ")})`;
    }
    case "linkedin":
      return `profilo ${await autoreLinkedIn(conf.linkedin!)}`;
  }
}

function riassunto(conf: Configurazione, post: PostSocial | undefined, esiti: readonly Esito[]) {
  const righe = [
    `### ${conf.formato === "video" ? "Video" : "Post"} social del ${dataSvizzera(conf.data)}`,
    post ? `\`${post.id}\`: ${post.schede[0].tipo === "copertina" ? senzaEvidenza(post.schede[0].titolo) : ""}` : "Nessun post.",
    "",
    ...esiti.map((e) => `- **${NOMI[e.piattaforma]}**: ${e.stato}${e.dettaglio ? `, ${e.dettaglio}` : ""}`),
  ];
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${righe.join("\n")}\n`);
}

async function main() {
  const conf = leggiConfigurazione(process.env);
  if (conf.errori.length) {
    console.error(`Configurazione non valida:\n- ${conf.errori.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }

  const post = postDelGiorno(conf.data, conf.formato);
  if (!post) {
    // Il promemoria lo dà il carosello: per il video basta una riga.
    if (conf.data > FINE_PIANO && conf.formato === "carosello") {
      // Fallisce apposta: GitHub manda un'email, così ci si accorge che servono post nuovi.
      console.error(
        `Il piano editoriale è finito il ${dataSvizzera(FINE_PIANO)}: aggiungi i post nuovi in src/data/post.ts (vedi social/README.md).`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        conf.data > FINE_PIANO
          ? `Il piano editoriale è finito il ${dataSvizzera(FINE_PIANO)}: niente video.`
          : `Nessun post per il ${dataSvizzera(conf.data)}: il primo esce il ${dataSvizzera(INIZIO_PIANO)}.`,
      );
    }
    riassunto(conf, undefined, []);
    return;
  }

  const video = conf.formato === "video";
  const nomi = video ? [] : immaginiPost(post);
  const file = video ? [fileVideo(conf, post)] : nomi.map((n) => join("social", post.id, n));
  const mancanti = file.filter((f) => !existsSync(f));
  if (mancanti.length) {
    console.error(
      video
        ? `Manca il video ${file[0]}: lancia cd video && npm run reel -- ${post.id}.`
        : `Mancano le immagini ${mancanti.join(", ")}: lancia cd video && npm run social -- ${post.id}.`,
    );
    process.exitCode = 1;
    return;
  }
  const indirizzi = conf.immaginiUrl ? nomi.map((n) => `${conf.immaginiUrl}/${post.id}/${n}`) : [];
  const contenuto = video ? `video di ${(statSync(file[0]).size / 1e6).toFixed(1)} MB` : `${nomi.length} immagini`;
  console.log(`Post del ${dataSvizzera(conf.data)}: ${post.id} (${contenuto})${conf.prova ? ", solo prova" : ""}`);

  // Il controllo degli indirizzi si fa una volta sola, solo se serve a qualcuno.
  let problemaIndirizzi: string | null | undefined;
  const esiti: Esito[] = [];
  let storico = leggiStorico();
  const pubblicati: VoceStorico[] = [];
  for (const piattaforma of conf.piattaforme) {
    const nome = NOMI[piattaforma];
    if (video && piattaforma === "linkedin") {
      // Sul profilo LinkedIn basta un post al giorno: il carosello.
      console.log(`${nome}: il video esce solo su Instagram e Facebook, salto.`);
      esiti.push({ piattaforma, stato: "saltato", dettaglio: "solo carosello" });
      continue;
    }
    const gia = giaPubblicato(storico, { data: conf.data, post: post.id, piattaforma, formato: conf.formato });
    // Con «ripubblica» un post cancellato a mano dal social esce di nuovo; uno
    // ancora online no. Su LinkedIn non si può controllare: resta com'è.
    let cancellato = false;
    if (gia && conf.ripubblica && piattaforma !== "linkedin" && conf.meta) {
      cancellato = !(await esisteSuMeta(conf.meta, gia.id).catch(() => true));
      if (cancellato) console.log(`${nome}: il post ${gia.id} non c'è più, lo ripubblico.`);
    }
    if (gia && !cancellato) {
      console.log(`${nome}: già pubblicato il ${gia.pubblicatoIl} (${gia.id}), salto.`);
      esiti.push({ piattaforma, stato: "saltato", dettaglio: `già pubblicato (${gia.id})` });
      continue;
    }
    const stato = statoPiattaforma(conf, piattaforma);
    if (stato?.stato === "non collegato" && !conf.prova) {
      console.log(`${nome}: non collegato (${stato.motivo}), salto.`);
      esiti.push({ piattaforma, stato: "saltato", dettaglio: "non collegato" });
      continue;
    }
    if (stato?.stato === "incompleto") {
      console.error(`${nome}: configurazione incompleta, ${stato.motivo}.`);
      esiti.push({ piattaforma, stato: "errore", dettaglio: stato.motivo });
      continue;
    }
    if (!video && piattaforma !== "linkedin" && indirizzi.length) {
      problemaIndirizzi ??= await controllaIndirizzi(indirizzi);
      if (problemaIndirizzi) {
        console.error(`${nome}: ${problemaIndirizzi}.`);
        esiti.push({ piattaforma, stato: "errore", dettaglio: "immagini non raggiungibili" });
        continue;
      }
    }
    if (conf.prova) {
      // Con le credenziali, la prova controlla anche che chiavi e id funzionino (solo letture).
      if (!stato) {
        const controllo = await controllaCredenziali(conf, piattaforma).catch((e: unknown) => e as Error);
        if (controllo instanceof Error) {
          console.error(`${nome}: le credenziali non funzionano. ${controllo.message}`);
          esiti.push({ piattaforma, stato: "errore", dettaglio: controllo.message });
          continue;
        }
        console.log(`${nome}: credenziali a posto, ${controllo}.`);
      }
      const testo = didascalia(post, piattaforma, conf.sitoUrl ?? undefined);
      console.log(`\n--- ${nome}${stato ? ` (${stato.motivo})` : ""} ---\n${testo}\n`);
      if (piattaforma !== "linkedin") console.log(indirizzi.join("\n") || file.join("\n"));
      esiti.push({ piattaforma, stato: "prova", dettaglio: "" });
      continue;
    }
    try {
      const id = await pubblica(conf, post, piattaforma, file, indirizzi);
      console.log(`${nome}: pubblicato (${id}).`);
      esiti.push({ piattaforma, stato: "pubblicato", dettaglio: id });
      if (gia) storico = togliDalloStorico(storico, gia);
      pubblicati.push({ data: conf.data, post: post.id, piattaforma, formato: conf.formato, id, pubblicatoIl: new Date().toISOString() });
    } catch (errore) {
      const messaggio = errore instanceof Error ? errore.message : String(errore);
      console.error(`${nome}: non pubblicato. ${messaggio}`);
      esiti.push({ piattaforma, stato: "errore", dettaglio: messaggio });
    }
  }

  if (pubblicati.length) scriviStorico(aggiungiAlloStorico(storico, pubblicati));
  riassunto(conf, post, esiti);
  if (esiti.some((e) => e.stato === "errore")) process.exitCode = 1;
  if (!esiti.some((e) => e.stato !== "saltato")) console.log("Nessun social collegato: niente da pubblicare (vedi social/README.md).");
}

main().catch((errore) => {
  console.error(errore);
  process.exitCode = 1;
});
