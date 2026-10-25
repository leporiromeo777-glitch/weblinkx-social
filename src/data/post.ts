/**
 * Il piano dei post di Weblinkx: ogni giorno un video (Reel, a pranzo) e un
 * carosello di immagini (la sera) su due argomenti diversi. Ogni post esce
 * una volta in video e una volta in carosello, a qualche settimana di
 * distanza (ORDINE_VIDEO, SFASAMENTO_CAROSELLO). Ogni post ha le schede (le
 * grafiche le fa video/, vedi social/README.md), la didascalia, gli hashtag
 * e, per i consigli, le fonti ufficiali.
 *
 * Regole (AGENTS.md): solo lavori confermati (src/data/lavori.ts), niente
 * risultati inventati, ogni cifra o regola con la sua fonte (src/data/fonti.ts).
 *
 * Nei titoli le parole fra asterischi (*così*) escono in blu.
 */
import { FONTI, VERIFICATO_IL, type Fonte } from "./fonti";
import { LAVORI, type IdLavoro } from "./lavori";

export type { Fonte };

export const CATEGORIE = ["lavoro", "consiglio", "dietro-le-quinte"] as const;
export type Categoria = (typeof CATEGORIE)[number];

/** Il carosello di immagini o il video (Reel). */
export const FORMATI = ["carosello", "video"] as const;
export type Formato = (typeof FORMATI)[number];

export type SchedaPost =
  /** La prima scheda: occhiello e titolo grande; con un lavoro, il sito sul telefono accanto. */
  | { tipo: "copertina"; occhiello: string; titolo: string; lavoro?: IdLavoro }
  /** Un elenco breve: al massimo 4 punti. */
  | { tipo: "punti"; titolo: string; punti: readonly string[]; numerati?: boolean }
  /** Il sito di un cliente su un computer o su un telefono (nel video la pagina scorre). */
  | { tipo: "sito"; lavoro: IdLavoro; vista: "desktop" | "mobile"; titolo: string; testo: string }
  /** Una cifra grande con la spiegazione sotto: sempre con una fonte. */
  | { tipo: "cifra"; cifra: string; testo: string }
  /** Cosa evitare e cosa fare. */
  | { tipo: "confronto"; titolo: string; no: string; si: string };

export type PostSocial = {
  id: string;
  /** Il giorno (ISO, ora svizzera) in cui esce come video e come carosello: lo calcola il piano. */
  uscite: Record<Formato, string>;
  categoria: Categoria;
  /** Il lavoro mostrato, per i post sui lavori. */
  lavoro?: IdLavoro;
  /** Le schede, a partire dalla copertina. L'ultima immagine (l'invito) la aggiungono le grafiche. */
  schede: readonly SchedaPost[];
  /** Il testo della didascalia; fonti e invito li aggiunge src/lib/post.ts. */
  testo: string;
  /** Le fonti dei consigli: la prima è mostrata nell'ultima immagine. */
  fonti: readonly Fonte[];
  /** Al massimo 2: altri 3 sono comuni a tutti i post. */
  hashtag: readonly string[];
};

/** Hashtag di tutti i post. Instagram ne accetta al massimo 5 per post. */
export const HASHTAG_COMUNI = ["#Ticino", "#WebDesign", "#Weblinkx"] as const;

/** L'invito dell'ultima immagine e della didascalia. */
export const INVITO = {
  lavoro: "Vuoi un sito così per la tua attività?",
  altro: "Ti serve un sito, un logo o un video?",
  sotto: "Scrivimi: preventivo senza impegno",
} as const;

/** Il primo giorno del piano. Per spostare tutto basta cambiare questa data. */
export const INIZIO_PIANO = "2026-10-27";

/** Il giorno ISO `giorni` dopo `inizio`. */
function giornoDopo(inizio: string, giorni: number): string {
  const d = new Date(`${inizio}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/** La copertina di un post su un lavoro. */
function copertinaLavoro(id: IdLavoro, titolo: string): SchedaPost {
  return { tipo: "copertina", occhiello: `Lavoro · ${LAVORI[id].breve}`, titolo, lavoro: id };
}

/** «Cosa c'è sul sito», dai dati del lavoro. */
function cosaCe(id: IdLavoro): SchedaPost {
  return { tipo: "punti", titolo: "Cosa c'è sul sito", punti: LAVORI[id].cosaCe.slice(0, 4) };
}

const PIANO: readonly Omit<PostSocial, "uscite">[] = [
  {
    id: "ciao-sono-weblinkx",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Ciao, questo è Weblinkx", titolo: "Siti web, branding e video per le *attività del Ticino*" },
      {
        tipo: "punti",
        titolo: "Cosa faccio",
        punti: [
          "Siti moderni e veloci, fatti bene anche per il telefono",
          "Loghi e identità visive che si riconoscono",
          "Video pubblicitari per i social e il web",
        ],
      },
      {
        tipo: "punti",
        titolo: "Come lavoro",
        punti: ["Prima ascolto cosa ti serve", "Ogni progetto è su misura", "Andiamo avanti insieme, passo dopo passo"],
      },
    ],
    testo:
      "Ciao! Sono Romeo e con Weblinkx aiuto attività e brand a raccontarsi al meglio online: siti web, branding e video pubblicitari. Qui ogni giorno trovi i miei lavori e consigli pratici per farti trovare dai clienti. Tu che attività hai?",
    fonti: [],
    hashtag: ["#SvizzeraItaliana", "#Lugano"],
  },
  {
    id: "lavoro-essenza",
    categoria: "lavoro",
    lavoro: "essenza",
    schede: [
      copertinaLavoro("essenza", "Il sito di *EssenZa*"),
      { tipo: "sito", lavoro: "essenza", vista: "desktop", titolo: "Elegante come il centro", testo: "Colori caldi e caratteri raffinati, come l'atmosfera di EssenZa" },
      cosaCe("essenza"),
      { tipo: "sito", lavoro: "essenza", vista: "mobile", titolo: "Perfetto sul telefono", testo: "Si prenota online con un tocco" },
    ],
    testo:
      "Ecco il sito che ho fatto per EssenZa, centro estetico a Vacallo: tutti i trattamenti spiegati, i prodotti, gli eventi e il primo appuntamento che si prenota direttamente dal sito. Lo trovi su essenzacentroestetico.ch",
    fonti: [],
    hashtag: ["#Vacallo", "#CentroEstetico"],
  },
  {
    id: "google-maps",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Google Maps", titolo: "Su Google Maps trovano gli altri *e non te?*" },
      {
        tipo: "punti",
        titolo: "Google guarda tre cose",
        punti: [
          "Pertinenza: quanto il tuo profilo corrisponde a quello che si cerca",
          "Distanza: quanto sei vicino a chi cerca",
          "Popolarità: quanto sei conosciuto, anche dalle recensioni",
        ],
      },
      {
        tipo: "punti",
        titolo: "Cosa puoi fare oggi",
        punti: [
          "Completa tutti i dati del profilo della tua attività",
          "Tieni aggiornati gli orari, anche quelli dei festivi",
          "Rispondi alle recensioni",
          "Aggiungi foto della tua attività",
        ],
      },
    ],
    testo:
      "Quando qualcuno cerca «parrucchiere», «ristorante» o «idraulico» vicino a sé, Google mostra prima le attività con il profilo più completo e curato. Lo dice Google stesso: contano pertinenza, distanza e popolarità. La distanza non la puoi cambiare, il resto sì.",
    fonti: [FONTI.rankingLocale],
    hashtag: ["#GoogleMaps", "#MarketingLocale"],
  },
  {
    id: "sito-sul-telefono",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Telefono", titolo: "Il tuo sito funziona bene *sul telefono?*" },
      {
        tipo: "punti",
        titolo: "Google guarda prima il telefono",
        punti: [
          "Per decidere come mostrarti, Google usa la versione del sito per telefono",
          "Testi e foto che sul telefono mancano, per Google non ci sono",
        ],
      },
      {
        tipo: "punti",
        titolo: "Controlla in un minuto",
        punti: [
          "Il testo si legge senza ingrandire",
          "I pulsanti si toccano facilmente con il dito",
          "Telefono e indirizzo si aprono con un tocco",
          "Niente finestre che coprono tutta la pagina",
        ],
      },
    ],
    testo:
      "Google usa la versione per telefono del tuo sito per decidere come mostrarlo nelle ricerche: si chiama indicizzazione mobile-first. Prendi il telefono, apri il tuo sito e fai questa prova. Quante cose hai spuntato?",
    fonti: [FONTI.mobileFirst],
    hashtag: ["#SitoWeb", "#MobileFirst"],
  },
  {
    id: "come-nasce-un-sito",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Dietro le quinte", titolo: "Come nasce un sito *con Weblinkx*" },
      {
        tipo: "punti",
        titolo: "Quattro passi",
        numerati: true,
        punti: [
          "Ascolto: parliamo della tua attività e di cosa ti serve",
          "Proposta: struttura e stile, prima di cominciare",
          "Sviluppo: il sito prende forma e lo vedi passo dopo passo",
          "Online: pubblicazione con il tuo dominio",
        ],
      },
    ],
    testo:
      "Ogni sito nasce dall'ascolto: prima capisco la tua attività e i tuoi clienti, poi ti propongo struttura e stile, e solo dopo comincio a costruire. Durante il lavoro vedi il sito crescere e mi dici cosa cambiare.",
    fonti: [],
    hashtag: ["#WebDesigner", "#DietroLeQuinte"],
  },
  {
    id: "lavoro-swiss-ncc",
    categoria: "lavoro",
    lavoro: "swiss-ncc",
    schede: [
      copertinaLavoro("swiss-ncc", "Transfer in tutta la Svizzera: *Swiss NCC*"),
      { tipo: "sito", lavoro: "swiss-ncc", vista: "desktop", titolo: "Si prenota subito", testo: "Il modulo per il viaggio è la prima cosa che vedi" },
      cosaCe("swiss-ncc"),
      { tipo: "sito", lavoro: "swiss-ncc", vista: "mobile", titolo: "In sei lingue", testo: "Per i clienti svizzeri e per chi arriva da lontano" },
    ],
    testo:
      "Il sito di Swiss NCC, autista privato e transfer: si sceglie partenza e destinazione, si vede il prezzo e si prenota, in sei lingue. Lo trovi su swissncc.ch",
    fonti: [],
    hashtag: ["#Transfer", "#NCC"],
  },
  {
    id: "cinque-cose-sito",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Il tuo sito", titolo: "5 cose che il sito della tua attività *deve avere*" },
      {
        tipo: "punti",
        titolo: "Le prime tre",
        numerati: true,
        punti: [
          "Cosa fai e dove, già nella prima schermata",
          "Telefono e WhatsApp che si aprono con un tocco",
          "Orari e indirizzo, con la mappa",
        ],
      },
      {
        tipo: "punti",
        titolo: "E poi",
        numerati: true,
        punti: ["Foto vere della tua attività", "Un pulsante chiaro: prenota, chiama o scrivi"],
      },
    ],
    testo:
      "Chi arriva sul tuo sito vuole capire in pochi secondi se fai al caso suo e come contattarti. Queste cinque cose non devono mai mancare. Salva il post e controlla il tuo sito!",
    fonti: [],
    hashtag: ["#SitoWeb", "#PiccoleImprese"],
  },
  {
    id: "velocita-sito",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Velocità", titolo: "Il tuo sito è lento? *Ecco come lo misura Google*" },
      { tipo: "cifra", cifra: "2,5 secondi", testo: "Entro questo tempo dovrebbe comparire il contenuto principale della pagina" },
      {
        tipo: "punti",
        titolo: "Cosa rallenta un sito",
        punti: ["Foto troppo pesanti, non compresse", "Troppi plugin e script", "Video che partono da soli"],
      },
      {
        tipo: "punti",
        titolo: "Come controllarlo",
        punti: ["Apri PageSpeed Insights di Google", "Incolla l'indirizzo del tuo sito", "Guarda il risultato per i telefoni"],
      },
    ],
    testo:
      "Google misura quanto ci mette a comparire il contenuto principale di una pagina: per un'esperienza buona, al massimo 2,5 secondi. Puoi controllare il tuo sito gratis con PageSpeed Insights, lo strumento di Google.",
    fonti: [FONTI.lcp, FONTI.pageSpeed],
    hashtag: ["#SEO", "#VelocitaSito"],
  },
  {
    id: "come-nasce-un-logo",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Dietro le quinte · Branding", titolo: "Come nasce *un logo*" },
      {
        tipo: "punti",
        titolo: "Il percorso",
        numerati: true,
        punti: [
          "Prima le parole: chi sei, a chi parli, cosa ti rende diverso",
          "Poi gli schizzi: tante idee, poche scelte",
          "Colori e caratteri che stanno bene insieme",
          "La prova: piccolo, grande, a colori e in bianco e nero",
        ],
      },
      {
        tipo: "punti",
        titolo: "Cosa ricevi",
        punti: ["Il logo nelle versioni per sito, social e stampa", "La palette dei colori", "Le linee guida per usarlo sempre uguale"],
      },
    ],
    testo:
      "Un logo non è solo un disegno: è il modo in cui i clienti ti riconoscono. Per questo parto dalle parole, cioè da chi sei e a chi parli, e solo dopo passo a forme e colori. Alla fine ricevi logo, palette e linee guida.",
    fonti: [],
    hashtag: ["#Branding", "#Logo"],
  },
  {
    id: "lavoro-centro-cardiologico",
    categoria: "lavoro",
    lavoro: "centro-cardiologico",
    schede: [
      copertinaLavoro("centro-cardiologico", "Il sito del *Centro Cardiologico Ticino*"),
      {
        tipo: "sito",
        lavoro: "centro-cardiologico",
        vista: "desktop",
        titolo: "Chiaro e rassicurante",
        testo: "Come dev'essere il sito di un centro medico",
      },
      {
        tipo: "punti",
        titolo: "Cosa c'è sul sito",
        punti: ["La filosofia del centro", "I check-up", "Una pagina per i medici che inviano i pazienti", "Dove si trova, nel cuore di Lugano"],
      },
      { tipo: "sito", lavoro: "centro-cardiologico", vista: "mobile", titolo: "Facile anche sul telefono", testo: "Si trova subito quello che serve" },
    ],
    testo:
      "Per un centro medico il sito deve dare fiducia prima ancora della visita. Ecco il sito del Centro Cardiologico Ticino, a Lugano: filosofia, check-up e una pagina dedicata ai medici che inviano i pazienti. Lo trovi su centrocardiologico.ch",
    fonti: [],
    hashtag: ["#Lugano", "#StudioMedico"],
  },
  {
    id: "recensioni-google",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Recensioni", titolo: "Come avere *più recensioni* su Google" },
      {
        tipo: "punti",
        titolo: "Chiedile al momento giusto",
        punti: ["Subito dopo un lavoro riuscito", "Con il link di Google, così basta un tocco", "Anche con il codice QR, in negozio o sulla ricevuta"],
      },
      {
        tipo: "punti",
        titolo: "E rispondi sempre",
        punti: ["Ringrazia chi ti lascia una recensione", "Alle critiche rispondi con calma e proponi una soluzione"],
      },
    ],
    testo:
      "Le recensioni contano per chi sceglie e anche per Google. Il modo più semplice per averne di più è chiederle: Google ti dà un link e un codice QR da mandare o da stampare. E rispondi sempre, anche alle critiche.",
    fonti: [FONTI.recensioni, FONTI.rankingLocale],
    hashtag: ["#Recensioni", "#GoogleMaps"],
  },
  {
    id: "informativa-privacy",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Privacy", titolo: "Hai un modulo di contatto? Serve *l'informativa privacy*" },
      { tipo: "cifra", cifra: "1.9.2023", testo: "Da questa data in Svizzera vale la nuova legge sulla protezione dei dati" },
      {
        tipo: "punti",
        titolo: "Cosa dire a chi ti scrive",
        punti: ["Chi raccoglie i dati e come contattarlo", "Perché li raccogli", "A chi li passi, se li passi", "Se vanno all'estero, in quale Paese"],
      },
    ],
    testo:
      "Se il tuo sito raccoglie dati, per esempio con un modulo di contatto o di prenotazione, devi dire a chi ti scrive chi sei, perché raccogli i dati e a chi li passi (art. 19 LPD). Sono informazioni generali: per il tuo caso chiedi a un esperto.",
    fonti: [FONTI.lpd, FONTI.ifpdt],
    hashtag: ["#Privacy", "#LPD"],
  },
  {
    id: "come-nasce-un-video",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Dietro le quinte · Video", titolo: "Come nasce *uno spot* per i social" },
      {
        tipo: "punti",
        titolo: "Il percorso",
        numerati: true,
        punti: [
          "La storia: cosa vuoi che la gente ricordi",
          "Le riprese: luoghi, persone e prodotti veri",
          "Il montaggio: ritmo, musica e testi",
          "I formati giusti per ogni social",
        ],
      },
    ],
    testo:
      "Uno spot funziona quando racconta una storia semplice. Per questo si parte da cosa vuoi che la gente ricordi, poi vengono le riprese e il montaggio. Alla fine ricevi il video nei formati giusti per ogni social.",
    fonti: [],
    hashtag: ["#VideoMaking", "#Spot"],
  },
  {
    id: "lavoro-jf-limo",
    categoria: "lavoro",
    lavoro: "jf-limo",
    schede: [
      copertinaLavoro("jf-limo", "Limousine a Zurigo: *JF Limo Service*"),
      { tipo: "sito", lavoro: "jf-limo", vista: "desktop", titolo: "Elegante come le sue auto", testo: "Scuro, raffinato, con la prenotazione subito in alto" },
      cosaCe("jf-limo"),
      { tipo: "sito", lavoro: "jf-limo", vista: "mobile", titolo: "In tedesco e in inglese", testo: "Per i clienti di Zurigo e per chi arriva in aereo" },
    ],
    testo:
      "Il sito di JF Limo Service, autista privato e limousine a Zurigo: stile scuro ed elegante, classi di veicoli, tratte più richieste e la prenotazione della corsa direttamente sul sito. Lo trovi su jf-limo-service.ch",
    fonti: [],
    hashtag: ["#Zurigo", "#Limousine"],
  },
  {
    id: "pulsante-whatsapp",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · WhatsApp", titolo: "Un pulsante WhatsApp sul sito: *come si fa*" },
      {
        tipo: "punti",
        titolo: "Il link giusto",
        punti: [
          "WhatsApp ti dà un link: wa.me/ e il tuo numero",
          "Il numero va scritto completo, con il prefisso 41",
          "Senza +, zeri iniziali, spazi o trattini",
        ],
      },
      {
        tipo: "punti",
        titolo: "Cosa succede",
        punti: ["Chi lo tocca apre subito la chat con te", "Puoi aggiungere un messaggio già scritto"],
      },
    ],
    testo:
      "Tanti clienti preferiscono scrivere invece di chiamare. Con la funzione «clicca per chattare» di WhatsApp basta un link, wa.me/ seguito dal tuo numero completo, per aprire la chat con te dal sito o dai social.",
    fonti: [FONTI.whatsapp],
    hashtag: ["#WhatsApp", "#SitoWeb"],
  },
  {
    id: "titolo-su-google",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Google", titolo: "Cosa vede chi ti trova *su Google?*" },
      {
        tipo: "punti",
        titolo: "Il titolo blu",
        punti: [
          "Viene di solito dal titolo della pagina",
          "Scrivi cosa fai e dove, non solo «Home»",
          "Ogni pagina ha il suo titolo, diverso dalle altre",
        ],
      },
      {
        tipo: "punti",
        titolo: "La descrizione sotto",
        punti: ["Google la prende spesso dalla meta descrizione", "Scrivila per ogni pagina: cosa offri e perché sceglierti"],
      },
    ],
    testo:
      "Il titolo blu e le due righe sotto sono la prima cosa che un cliente vede di te su Google. Google consiglia titoli descrittivi e diversi per ogni pagina, ed evitare titoli vaghi come «Home». Il tuo sito come appare?",
    fonti: [FONTI.titoli, FONTI.descrizioni],
    hashtag: ["#SEO", "#Google"],
  },
  {
    id: "lavoro-villa-hedonia",
    categoria: "lavoro",
    lavoro: "villa-hedonia",
    schede: [
      copertinaLavoro("villa-hedonia", "Anche fuori dalla Svizzera: *Villa Hedonia*"),
      { tipo: "sito", lavoro: "villa-hedonia", vista: "desktop", titolo: "Le foto parlano da sole", testo: "Piscina, giardino e feste all'aperto, subito in primo piano" },
      cosaCe("villa-hedonia"),
      { tipo: "sito", lavoro: "villa-hedonia", vista: "mobile", titolo: "Nella lingua dei suoi clienti", testo: "Tutto in serbo, pensato per il telefono" },
    ],
    testo:
      "Weblinkx lavora anche fuori dalla Svizzera: ecco il sito di Villa Hedonia, una villa con piscina in Bosnia ed Erzegovina per matrimoni e feste. Tutto in serbo, la lingua dei suoi clienti. Lo trovi su villahedonia.com",
    fonti: [],
    hashtag: ["#Matrimoni", "#Eventi"],
  },
  {
    id: "foto-vere",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Foto", titolo: "Foto vere o foto *di repertorio?*" },
      {
        tipo: "confronto",
        titolo: "Cosa vede il cliente",
        no: "Foto di repertorio: le stesse che si trovano su tanti altri siti",
        si: "Foto vere: il tuo locale, i tuoi prodotti, le tue persone",
      },
      {
        tipo: "punti",
        titolo: "Tre consigli",
        punti: [
          "Luce naturale, meglio di giorno",
          "Mostra le persone al lavoro, non solo i prodotti",
          "Sul sito descrivi ogni foto con un testo alternativo",
        ],
      },
    ],
    testo:
      "Le foto di repertorio sono comode, ma il cliente vuole vedere te: il tuo locale, i tuoi prodotti, le tue persone. E sul sito ogni foto merita un testo alternativo che la descrive: aiuta chi non vede le immagini e aiuta Google a capirle.",
    fonti: [FONTI.immagini],
    hashtag: ["#Fotografia", "#SitoWeb"],
  },
  {
    id: "cosa-preparare",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Dietro le quinte", titolo: "Vuoi un sito? *Ecco cosa preparare*" },
      {
        tipo: "punti",
        titolo: "Da parte tua",
        punti: [
          "Il logo, se ce l'hai (se no lo facciamo insieme)",
          "Qualche foto della tua attività",
          "Cosa offri, gli orari e, se vuoi, i prezzi",
          "Il nome del dominio che ti piace",
        ],
      },
      {
        tipo: "punti",
        titolo: "Al resto penso io",
        punti: ["Struttura e grafica", "Che si veda bene su telefono e computer", "La pubblicazione online"],
      },
    ],
    testo:
      "Stai pensando a un sito ma non sai da dove cominciare? Ti bastano poche cose: il logo (o lo facciamo insieme), qualche foto, cosa offri e il nome che vorresti. Al resto penso io.",
    fonti: [],
    hashtag: ["#SitoWeb", "#NuovaAttivita"],
  },
  {
    id: "lavoro-slada",
    categoria: "lavoro",
    lavoro: "slada",
    schede: [
      copertinaLavoro("slada", "Un sito per un negozio agricolo: *Slađa*"),
      { tipo: "sito", lavoro: "slada", vista: "desktop", titolo: "Tanti prodotti, tutto in ordine", testo: "Sementi, concimi, trattori e attrezzi, divisi per categoria" },
      cosaCe("slada"),
      { tipo: "sito", lavoro: "slada", vista: "mobile", titolo: "Pronto per il telefono", testo: "Telefono, indirizzo e orari sempre a portata di mano" },
    ],
    testo:
      "Anche un negozio agricolo ha bisogno di un bel sito. Ecco quello di Slađa, in Bosnia ed Erzegovina, attiva dal 2001: un catalogo ordinato per categorie, i contatti e gli orari sempre in vista. Lo trovi su doosladja.com",
    fonti: [],
    hashtag: ["#Agricoltura", "#Catalogo"],
  },
  {
    id: "dominio-email",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Email", titolo: "info@tuaattivita.ch *batte Gmail*" },
      {
        tipo: "punti",
        titolo: "Perché",
        punti: ["Sembra subito più professionale", "Il dominio .ch dice che sei in Svizzera", "Indirizzo del sito ed email hanno lo stesso nome"],
      },
      {
        tipo: "punti",
        titolo: "Come sceglierlo",
        punti: ["Corto e facile da dettare al telefono", "Senza trattini, se puoi", "Registralo a nome della tua attività"],
      },
    ],
    testo:
      "Un indirizzo come info@tuaattivita.ch dà subito fiducia, e il dominio .ch dice ai clienti che sei in Svizzera. I domini .ch si registrano presso i registrar riconosciuti, che trovi sul sito ufficiale nic.ch.",
    fonti: [FONTI.nic],
    hashtag: ["#Dominio", "#EmailProfessionale"],
  },
  {
    id: "errori-sito",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Errori", titolo: "4 errori che fanno *scappare i clienti*" },
      {
        tipo: "punti",
        titolo: "Li vedo spesso",
        numerati: true,
        punti: [
          "Non si capisce cosa fai nei primi secondi",
          "Il numero di telefono non si trova",
          "Orari e prezzi vecchi",
          "Sul telefono bisogna ingrandire per leggere",
        ],
      },
    ],
    testo:
      "Sono quattro errori che vedo spesso nei siti delle piccole attività, e per fortuna si sistemano in fretta. Il tuo sito ne ha qualcuno? Scrivimi e lo guardiamo insieme.",
    fonti: [],
    hashtag: ["#SitoWeb", "#PiccoleImprese"],
  },
  {
    id: "contrasto-testo",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Leggibilità", titolo: "Il testo del tuo sito *si legge davvero?*" },
      { tipo: "cifra", cifra: "4,5 a 1", testo: "È il contrasto minimo tra testo e sfondo delle regole internazionali sull'accessibilità (WCAG)" },
      {
        tipo: "punti",
        titolo: "Errori frequenti",
        punti: ["Testo grigio chiaro su bianco", "Scritte sopra le foto, senza un fondo scuro", "Caratteri troppo piccoli o sottili"],
      },
    ],
    testo:
      "Un sito bello che non si legge non serve. Le regole internazionali sull'accessibilità (WCAG) chiedono un contrasto di almeno 4,5 a 1 tra testo e sfondo: così si legge bene anche al sole o con la vista stanca.",
    fonti: [FONTI.wcag],
    hashtag: ["#Accessibilita", "#Leggibilita"],
  },
  {
    id: "ogni-sito-diverso",
    categoria: "lavoro",
    schede: [
      { tipo: "copertina", occhiello: "Lavori", titolo: "Ogni attività è diversa, *ogni sito anche*" },
      { tipo: "sito", lavoro: "essenza", vista: "mobile", titolo: "Un centro estetico", testo: "EssenZa, Vacallo: elegante e caldo" },
      { tipo: "sito", lavoro: "centro-cardiologico", vista: "mobile", titolo: "Un centro medico", testo: "Centro Cardiologico Ticino, Lugano: chiaro e rassicurante" },
      { tipo: "sito", lavoro: "jf-limo", vista: "mobile", titolo: "Un servizio di limousine", testo: "JF Limo Service, Zurigo: scuro ed elegante" },
      { tipo: "sito", lavoro: "villa-hedonia", vista: "mobile", titolo: "Una villa per eventi", testo: "Villa Hedonia, Bosnia: foto che fanno sognare" },
    ],
    testo:
      "Un centro estetico, un centro medico, un servizio di limousine, una villa per eventi: ogni attività ha i suoi clienti e il suo stile, e il sito deve rispecchiarli. Quale ti piace di più?",
    fonti: [],
    hashtag: ["#Portfolio", "#SitiWeb"],
  },
  {
    id: "lucchetto-https",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Sicurezza", titolo: "Il lucchetto accanto all'indirizzo: *ce l'hai?*" },
      {
        tipo: "punti",
        titolo: "Perché conta",
        punti: [
          "HTTPS protegge i dati tra il sito e chi lo visita",
          "Senza, Chrome scrive «Non sicuro» accanto all'indirizzo",
          "Google lo considera nell'esperienza della pagina",
        ],
      },
    ],
    testo:
      "Se accanto all'indirizzo del tuo sito Chrome scrive «Non sicuro», manca HTTPS. Oggi è un minimo: protegge i dati di chi ti scrive e Google lo considera quando valuta l'esperienza sulle pagine.",
    fonti: [FONTI.esperienzaPagina, FONTI.httpsChrome],
    hashtag: ["#HTTPS", "#SicurezzaWeb"],
  },
  {
    id: "vendere-online-legge",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Consiglio · Legge", titolo: "Vendi online? *La legge chiede questo*" },
      {
        tipo: "punti",
        titolo: "Nel commercio elettronico",
        numerati: true,
        punti: [
          "Chi sei e un indirizzo di contatto, anche email",
          "I passi per concludere il contratto",
          "Un modo per correggere gli errori prima di ordinare",
          "La conferma dell'ordine, subito, per via elettronica",
        ],
      },
    ],
    testo:
      "In Svizzera chi vende online deve indicare chiaramente chi è e come contattarlo, spiegare i passi dell'ordine, permettere di correggere gli errori e confermare subito l'ordine (art. 3 LCSl). Sono informazioni generali: per il tuo caso chiedi a un esperto.",
    fonti: [FONTI.lcsl],
    hashtag: ["#ECommerce", "#Svizzera"],
  },
  {
    id: "anteprima-prima-di-pubblicare",
    categoria: "dietro-le-quinte",
    schede: [
      { tipo: "copertina", occhiello: "Dietro le quinte", titolo: "Prima di andare online, *il sito lo provi tu*" },
      {
        tipo: "punti",
        titolo: "Come funziona",
        numerati: true,
        punti: [
          "Ti mando un link per vedere il sito in anteprima",
          "Lo guardi sul telefono e sul computer",
          "Mi dici cosa cambiare",
          "Quando ti piace, va online con il tuo dominio",
        ],
      },
    ],
    testo:
      "Nessuna sorpresa: prima di pubblicare ti mando un link di anteprima, così vedi il sito vero, sul tuo telefono e sul computer. Mi dici cosa cambiare e va online solo quando ti piace.",
    fonti: [],
    hashtag: ["#WebDesigner", "#DietroLeQuinte"],
  },
  {
    id: "checklist-sito",
    categoria: "consiglio",
    schede: [
      { tipo: "copertina", occhiello: "Salva questo post", titolo: "Il tuo sito in *8 domande*" },
      {
        tipo: "punti",
        titolo: "Per i clienti",
        numerati: true,
        punti: [
          "Si capisce subito cosa fai e dove?",
          "Telefono e WhatsApp si aprono con un tocco?",
          "Gli orari sono aggiornati?",
          "Sul telefono si legge senza ingrandire?",
        ],
      },
      {
        tipo: "punti",
        titolo: "Per Google e per la legge",
        numerati: true,
        punti: [
          "Si apre in fretta?",
          "C'è il lucchetto, cioè HTTPS?",
          "C'è l'informativa sulla privacy?",
          "Il profilo su Google Maps è completo?",
        ],
      },
    ],
    testo:
      "Otto domande per controllare il tuo sito in cinque minuti. Ogni «no» è una cosa da sistemare: trovi i dettagli nei post di queste settimane. Sono informazioni generali: per la privacy, nel tuo caso, chiedi a un esperto. Salvalo e fai la prova!",
    fonti: [FONTI.mobileFirst, FONTI.lcp, FONTI.lpd, FONTI.rankingLocale],
    hashtag: ["#Checklist", "#SitoWeb"],
  },
  {
    id: "lavoro-tre-lingue",
    categoria: "lavoro",
    schede: [
      { tipo: "copertina", occhiello: "Lavori", titolo: "Il sito parla la lingua *dei tuoi clienti*" },
      { tipo: "sito", lavoro: "swiss-ncc", vista: "desktop", titolo: "In sei lingue", testo: "Swiss NCC: transfer in tutta la Svizzera" },
      { tipo: "sito", lavoro: "jf-limo", vista: "desktop", titolo: "In tedesco e in inglese", testo: "JF Limo Service: la clientela di Zurigo" },
      { tipo: "sito", lavoro: "slada", vista: "desktop", titolo: "In serbo", testo: "Slađa: i clienti di casa sua" },
    ],
    testo:
      "In Svizzera i clienti parlano tante lingue, e anche i turisti. Per questo faccio siti in italiano, tedesco, inglese e nelle altre lingue che servono alla tua attività. I tuoi clienti che lingua parlano?",
    fonti: [],
    hashtag: ["#SitoMultilingue", "#Svizzera"],
  },
];

/**
 * L'ordine dei video, un post al giorno da INIZIO_PIANO: prima i lavori e il
 * dietro le quinte (nel video i siti scorrono), poi i consigli.
 */
export const ORDINE_VIDEO = [
  "ciao-sono-weblinkx",
  "lavoro-essenza",
  "come-nasce-un-sito",
  "lavoro-swiss-ncc",
  "sito-sul-telefono",
  "lavoro-centro-cardiologico",
  "come-nasce-un-logo",
  "lavoro-jf-limo",
  "velocita-sito",
  "lavoro-villa-hedonia",
  "come-nasce-un-video",
  "lavoro-slada",
  "pulsante-whatsapp",
  "ogni-sito-diverso",
  "anteprima-prima-di-pubblicare",
  "lavoro-tre-lingue",
  "cosa-preparare",
  "google-maps",
  "foto-vere",
  "recensioni-google",
  "errori-sito",
  "titolo-su-google",
  "cinque-cose-sito",
  "dominio-email",
  "lucchetto-https",
  "informativa-privacy",
  "contrasto-testo",
  "vendere-online-legge",
  "checklist-sito",
] as const;

/**
 * Il carosello di un giorno è il video di 17 giorni dopo (o, verso la fine,
 * di 12 giorni prima): così video e carosello dello stesso giorno parlano di
 * cose diverse, i caroselli partono dai consigli da salvare, e ogni
 * argomento torna nell'altro formato dopo qualche settimana.
 */
export const SFASAMENTO_CAROSELLO = 17;

/** Il giorno ISO numero `indice` del piano (0 = INIZIO_PIANO). */
export function giornoDelPiano(indice: number): string {
  return giornoDopo(INIZIO_PIANO, indice);
}

/** L'ultimo giorno del piano. */
export const FINE_PIANO = giornoDelPiano(ORDINE_VIDEO.length - 1);

/** I post con i loro giorni, nell'ordine dei video. */
export const POST_SOCIAL: readonly PostSocial[] = ORDINE_VIDEO.map((id, i) => {
  const post = PIANO.find((p) => p.id === id);
  if (!post) throw new Error(`ORDINE_VIDEO: post sconosciuto ${id}`);
  const n = ORDINE_VIDEO.length;
  // Il giorno in cui esce come carosello: quello il cui video è 17 posti più avanti.
  const carosello = (i - SFASAMENTO_CAROSELLO + n) % n;
  return { ...post, uscite: { video: giornoDelPiano(i), carosello: giornoDelPiano(carosello) } };
});

/** Il post che esce in quel giorno in quel formato. */
export function postDelGiorno(data: string, formato: Formato): PostSocial | undefined {
  return POST_SOCIAL.find((p) => p.uscite[formato] === data);
}

/** I post scritti ma non in ORDINE_VIDEO (non escono mai): per i test. */
export const POST_FUORI_PIANO = PIANO.filter((p) => !(ORDINE_VIDEO as readonly string[]).includes(p.id)).map((p) => p.id);

export function trovaPost(id: string): PostSocial {
  const post = POST_SOCIAL.find((p) => p.id === id);
  if (!post) throw new Error(`Post sconosciuto: ${id}`);
  return post;
}

/** I nomi dei file delle immagini di un post: una per scheda più l'invito finale. */
export function immaginiPost(post: PostSocial): string[] {
  return Array.from({ length: post.schede.length + 1 }, (_, i) => `${String(i + 1).padStart(2, "0")}.jpg`);
}

/** Il titolo senza gli asterischi. */
export function senzaEvidenza(testo: string): string {
  return testo.replace(/\*/g, "");
}

export { VERIFICATO_IL };
