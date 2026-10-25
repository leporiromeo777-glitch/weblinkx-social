/**
 * Come sono andati i post social: confronta le statistiche lette da Instagram
 * e Facebook (social/statistiche.json) e dice quali post sono andati meglio,
 * quali peggio e un perché probabile. Il testo diventa social/analisi.md, da
 * cui la routine settimanale parte per i post nuovi (social/README.md).
 */
import { senzaEvidenza, type PostSocial } from "../data/post";
import { dataSvizzera } from "./post";
import type { Piattaforma } from "./post";

/** Una lettura delle statistiche di un post su un social (vedi scripts/social/statistiche.ts). */
export type LetturaPost = {
  data: string;
  post: string;
  piattaforma: Piattaforma;
  formato: "carosello" | "video";
  /** Giorni passati dalla pubblicazione alla lettura. */
  giorni: number;
  metriche: Record<string, number>;
};

/** I numeri di un post, con gli stessi nomi per tutti i social. */
export type Numeri = {
  /** Persone raggiunte (stima di Meta). */
  copertura: number;
  salvataggi: number;
  condivisioni: number;
  commenti: number;
  miPiace: number;
  /** Interazioni pesate (vedi PESI). */
  interazioni: number;
  /** Interazioni pesate per persona raggiunta. */
  tasso: number;
  /** Video: secondi medi di visione. */
  visioneMedia: number | null;
  /** Reel di Instagram: percentuale di chi lo salta nei primi 3 secondi. */
  saltati: number | null;
};

/** Salvare e condividere dicono che il post è utile: valgono più di un «mi piace». */
export const PESI = { salvataggi: 3, condivisioni: 3, commenti: 2, miPiace: 1 } as const;

/** Prima di 2 giorni i numeri di un post crescono ancora: non si confronta. */
export const GIORNI_MINIMI = 2;
/** Sotto i 3 post per gruppo i confronti sono solo indicativi. */
export const POST_MINIMI = 3;
/** Oltre 1,25 volte la mediana è «alto», sotto 0,75 «basso». */
const ALTO = 1.25;
const BASSO = 0.75;

export function numeri(l: LetturaPost): Numeri {
  const m = (nome: string) => l.metriche[nome] ?? 0;
  const conValore = (nome: string) => (nome in l.metriche ? l.metriche[nome] : null);
  let base: Omit<Numeri, "interazioni" | "tasso">;
  if (l.piattaforma === "facebook" && l.formato === "video") {
    // I Reel della pagina danno commenti e condivisioni insieme: contano come commenti.
    const visione = conValore("post_video_avg_time_watched");
    base = {
      copertura: m("post_impressions_unique"),
      salvataggi: 0,
      condivisioni: 0,
      commenti: m("post_video_social_actions"),
      miPiace: m("post_video_likes_by_reaction_type"),
      visioneMedia: visione === null ? null : visione / 1000,
      saltati: null,
    };
  } else if (l.piattaforma === "facebook") {
    base = {
      copertura: conValore("post_total_media_view_unique") ?? m("post_media_view"),
      salvataggi: 0,
      condivisioni: m("shares"),
      commenti: m("comments"),
      miPiace: m("post_reactions_by_type_total"),
      visioneMedia: null,
      saltati: null,
    };
  } else {
    const visione = conValore("ig_reels_avg_watch_time");
    base = {
      copertura: m("reach"),
      salvataggi: m("saved"),
      condivisioni: m("shares"),
      commenti: m("comments"),
      miPiace: m("likes"),
      visioneMedia: visione === null ? null : visione / 1000,
      saltati: conValore("reels_skip_rate"),
    };
  }
  const interazioni =
    base.salvataggi * PESI.salvataggi + base.condivisioni * PESI.condivisioni + base.commenti * PESI.commenti + base.miPiace * PESI.miPiace;
  return { ...base, interazioni, tasso: base.copertura > 0 ? interazioni / base.copertura : 0 };
}

export function mediana(valori: readonly number[]): number {
  if (!valori.length) return 0;
  const v = [...valori].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Quanto un valore sta sopra o sotto la mediana del gruppo (1 = nella media), limitato a 3. */
function rapporto(valore: number, med: number): number {
  if (med <= 0) return valore > 0 ? 2 : 1;
  return Math.min(3, valore / med);
}

const gruppo = (l: Pick<LetturaPost, "piattaforma" | "formato">) => `${l.piattaforma}|${l.formato}`;

export type Valutazione = {
  lettura: LetturaPost;
  numeri: Numeri;
  /** Persone raggiunte rispetto alla mediana del gruppo (stesso social e formato). */
  rCopertura: number;
  /** Interazioni per persona rispetto alla mediana del gruppo. */
  rTasso: number;
  /** La media dei due: 1 = un post nella media, 1,5 = il 50% meglio. */
  indice: number;
  /** Il gruppo ha abbastanza post per un giudizio. */
  affidabile: boolean;
  perche: string[];
};

/** Valuta ogni lettura confrontandola con le altre dello stesso social e formato. */
export function valuta(letture: readonly LetturaPost[]): Valutazione[] {
  const mature = letture.filter((l) => l.giorni >= GIORNI_MINIMI && l.piattaforma !== "linkedin");
  const perGruppo = new Map<string, Numeri[]>();
  for (const l of mature) perGruppo.set(gruppo(l), [...(perGruppo.get(gruppo(l)) ?? []), numeri(l)]);

  return mature.map((l) => {
    const n = numeri(l);
    const altri = perGruppo.get(gruppo(l))!;
    const med = (f: (x: Numeri) => number | null) => mediana(altri.map(f).filter((x): x is number => x !== null));
    const rCopertura = rapporto(n.copertura, med((x) => x.copertura));
    const rTasso = rapporto(n.tasso, med((x) => x.tasso));
    const perche: string[] = [];
    const copAlta = rCopertura >= ALTO;
    const copBassa = rCopertura <= BASSO;
    const tassoAlto = rTasso >= ALTO;
    const tassoBasso = rTasso <= BASSO;
    if (copAlta && tassoAlto) perche.push("Funziona: l'hanno visto in tanti e hanno interagito. Tema e gancio da ripetere.");
    else if (copBassa && tassoAlto)
      perche.push("Chi l'ha visto ha interagito, ma l'hanno visto in pochi: il tema piace, il gancio (copertina, prima frase) o l'orario no.");
    else if (copAlta && tassoBasso)
      perche.push("L'hanno visto in tanti ma pochi l'hanno salvato o condiviso: il gancio funziona, il contenuto è sembrato poco utile o generico.");
    else if (copBassa && tassoBasso)
      perche.push("Visto da pochi e con poche interazioni: tema poco interessante per chi ci segue, o gancio debole.");
    else if (copAlta) perche.push("Raggiunge più persone del solito: il gancio funziona.");
    else if (copBassa) perche.push("Raggiunge meno persone del solito: gancio o orario da rivedere.");
    else if (tassoAlto) perche.push("Più interazioni del solito per chi l'ha visto: il contenuto è utile.");
    else if (tassoBasso) perche.push("Meno interazioni del solito per chi l'ha visto: contenuto poco utile o generico.");
    else perche.push("Nella media.");

    const perPersona = (x: Numeri, v: number) => (x.copertura > 0 ? v / x.copertura : 0);
    if (n.salvataggi > 0 && rapporto(perPersona(n, n.salvataggi), med((x) => perPersona(x, x.salvataggi))) >= 1.5)
      perche.push("Molti salvataggi: contenuto pratico da tenere (cifre, liste di cose da fare).");
    if (n.condivisioni > 0 && rapporto(perPersona(n, n.condivisioni), med((x) => perPersona(x, x.condivisioni))) >= 1.5)
      perche.push("Molte condivisioni: un tema di cui si parla con gli amici.");
    if (n.saltati !== null && n.saltati >= med((x) => x.saltati) + 10)
      perche.push(`Il ${Math.round(n.saltati)}% lo salta nei primi 3 secondi: l'inizio del video non aggancia.`);
    if (n.visioneMedia !== null && rapporto(n.visioneMedia, med((x) => x.visioneMedia)) <= BASSO)
      perche.push("Lo guardano per poco: video lento o troppo lungo.");

    return {
      lettura: l,
      numeri: n,
      rCopertura,
      rTasso,
      indice: (rCopertura + rTasso) / 2,
      affidabile: altri.length >= POST_MINIMI,
      perche,
    };
  });
}

/** Le caratteristiche di un post che si possono confrontare. */
export const CARATTERISTICHE: readonly { nome: string; di: (p: PostSocial) => string }[] = [
  {
    nome: "Titolo della copertina",
    di: (p) => (p.schede[0]?.tipo === "copertina" && senzaEvidenza(p.schede[0].titolo).trim().endsWith("?") ? "una domanda" : "un'affermazione"),
  },
  { nome: "Cifra grande", di: (p) => (p.schede.some((s) => s.tipo === "cifra") ? "con una cifra" : "senza cifre") },
  {
    nome: "Tipo di post",
    di: (p) => ({ lavoro: "un lavoro", consiglio: "un consiglio", "dietro-le-quinte": "dietro le quinte" })[p.categoria],
  },
  { nome: "Sito di un cliente", di: (p) => (p.schede.some((s) => s.tipo === "sito") ? "con il sito" : "senza siti") },
  { nome: "Schede", di: (p) => (p.schede.length <= 2 ? "fino a 2 schede" : p.schede.length === 3 ? "3 schede" : "4 schede o più") },
];

const decimale = (x: number, cifre = 2) => x.toFixed(cifre).replace(".", ",");
const intero = (x: number) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
const NOMI: Record<Piattaforma, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };
const FORMATI = { carosello: "carosello", video: "video" } as const;

function titolo(post: PostSocial | undefined, id: string): string {
  const prima = post?.schede[0];
  return prima?.tipo === "copertina" ? senzaEvidenza(prima.titolo) : id;
}

/** Il testo di social/analisi.md. */
export function analisi(posts: readonly PostSocial[], letture: readonly LetturaPost[], adesso: Date): string {
  const perId = new Map(posts.map((p) => [p.id, p]));
  const valutazioni = valuta(letture);
  const giovani = letture.filter((l) => l.giorni < GIORNI_MINIMI && l.piattaforma !== "linkedin");
  const righe: string[] = [
    "# Come vanno i post di Weblinkx",
    "",
    `Aggiornata il ${dataSvizzera(adesso.toISOString())}. La scrive il workflow dei social ogni giorno da \`social/statistiche.json\` (Instagram e Facebook: per i profili LinkedIn l'API non dà le statistiche).`,
    "",
  ];
  if (!valutazioni.length) {
    righe.push(
      giovani.length
        ? `Ci sono ${giovani.length} letture, ma di post usciti da meno di ${GIORNI_MINIMI} giorni: i numeri crescono ancora, il confronto parte dopo.`
        : "Nessuna statistica ancora: servono post pubblicati e il token di Meta con i permessi per le statistiche (vedi social/README.md).",
      "",
    );
    return righe.join("\n");
  }

  // Un punteggio per post: la media degli indici sui social e formati in cui è uscito.
  const perPost = new Map<string, Valutazione[]>();
  for (const v of valutazioni) perPost.set(v.lettura.post, [...(perPost.get(v.lettura.post) ?? []), v]);
  const classifica = [...perPost.entries()]
    .map(([id, vs]) => ({ id, post: perId.get(id), vs, indice: vs.reduce((a, v) => a + v.indice, 0) / vs.length }))
    .sort((a, b) => b.indice - a.indice);
  const pochi = valutazioni.some((v) => !v.affidabile);

  const migliore = classifica[0];
  const peggiore = classifica.at(-1)!;
  righe.push("## In breve", "");
  if (pochi) righe.push(`- **Pochi dati**: con meno di ${POST_MINIMI} post per social e formato i confronti sono solo indicativi.`);
  // Il perché del social e formato in cui il post si è distinto di più.
  const distintivo = (vs: readonly Valutazione[], meglio: boolean) =>
    [...vs].sort((x, y) => (meglio ? y.indice - x.indice : x.indice - y.indice))[0];
  const spiega = (v: Valutazione) => `Su ${NOMI[v.lettura.piattaforma]} (${FORMATI[v.lettura.formato]}): ${v.perche.join(" ")}`;
  righe.push(
    `- **Il migliore**: «${titolo(migliore.post, migliore.id)}» (indice ${decimale(migliore.indice)}). ${spiega(distintivo(migliore.vs, true))}`,
  );
  if (classifica.length > 1) {
    righe.push(
      `- **Il peggiore**: «${titolo(peggiore.post, peggiore.id)}» (indice ${decimale(peggiore.indice)}). ${spiega(distintivo(peggiore.vs, false))}`,
    );
  }

  // Le caratteristiche: per ognuna il valore con l'indice medio più alto.
  const confronti = CARATTERISTICHE.map((c) => {
    const valori = new Map<string, number[]>();
    for (const r of classifica) {
      if (!r.post) continue;
      const v = c.di(r.post);
      valori.set(v, [...(valori.get(v) ?? []), r.indice]);
    }
    const voci = [...valori.entries()]
      .map(([valore, indici]) => ({ valore, n: indici.length, indice: indici.reduce((a, b) => a + b, 0) / indici.length }))
      .sort((a, b) => b.indice - a.indice);
    return { nome: c.nome, voci };
  }).filter((c) => c.voci.length > 1);
  // Nel riassunto solo le differenze chiare e con abbastanza post per ogni valore.
  const chiari = confronti.filter((c) => c.voci[0].indice - c.voci.at(-1)!.indice >= 0.15 && c.voci.every((v) => v.n >= POST_MINIMI));
  for (const c of chiari) {
    const [primo, ...altri] = c.voci;
    righe.push(
      `- **${c.nome}**: meglio ${primo.valore} (indice ${decimale(primo.indice)} su ${primo.n} post) che ${altri.map((v) => `${v.valore} (${decimale(v.indice)})`).join(", ")}.`,
    );
  }
  if (!chiari.length) righe.push("- **Cosa hanno in comune i migliori**: non si vede ancora una differenza chiara, servono più post.");
  righe.push("");

  righe.push("## Classifica", "", "| # | Post | Giorno | Indice | Dove | Perché |", "|---|---|---|---|---|---|");
  classifica.forEach((r, i) => {
    const dove = r.vs
      .map((v) => `${NOMI[v.lettura.piattaforma]} ${FORMATI[v.lettura.formato]} ${decimale(v.indice)}`)
      .join("<br>");
    const perche = r.vs
      .map((v) => (r.vs.length > 1 ? `${NOMI[v.lettura.piattaforma]} ${FORMATI[v.lettura.formato]}: ${v.perche.join(" ")}` : v.perche.join(" ")))
      .join("<br>");
    righe.push(`| ${i + 1} | ${titolo(r.post, r.id)} | ${dataSvizzera(r.vs[0].lettura.data)} | ${decimale(r.indice)} | ${dove} | ${perche} |`);
  });
  righe.push("");

  righe.push(
    "## Carosello o video",
    "",
    "| Social | Formato | Post | Persone raggiunte (mediana) | Interazioni ogni 100 persone (mediana) | Visione media |",
    "|---|---|---|---|---|---|",
  );
  const gruppi = new Map<string, Valutazione[]>();
  for (const v of valutazioni) gruppi.set(gruppo(v.lettura), [...(gruppi.get(gruppo(v.lettura)) ?? []), v]);
  for (const [, vs] of [...gruppi.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const { piattaforma, formato } = vs[0].lettura;
    const visione = vs.map((v) => v.numeri.visioneMedia).filter((x): x is number => x !== null);
    righe.push(
      `| ${NOMI[piattaforma]} | ${FORMATI[formato]} | ${vs.length} | ${intero(mediana(vs.map((v) => v.numeri.copertura)))} | ${decimale(mediana(vs.map((v) => v.numeri.tasso)) * 100, 1)} | ${visione.length ? `${decimale(mediana(visione), 1)} s` : "-"} |`,
    );
  }
  righe.push("");

  if (confronti.length) {
    righe.push("## Cosa hanno in comune i post che vanno meglio", "");
    for (const c of confronti) {
      righe.push(`**${c.nome}**: ${c.voci.map((v) => `${v.valore} ${decimale(v.indice)} (${v.n})`).join(", ")}`, "");
    }
  }

  if (giovani.length) {
    righe.push(`Usciti da meno di ${GIORNI_MINIMI} giorni, non ancora confrontati: ${[...new Set(giovani.map((l) => titolo(perId.get(l.post), l.post)))].map((t) => `«${t}»`).join(", ")}.`, "");
  }

  righe.push(
    "## Come leggere",
    "",
    "- **Indice**: 1,00 è un post nella media del suo social e formato, 1,50 il 50% meglio, 0,50 la metà. È la media fra persone raggiunte e interazioni per persona, ognuna confrontata con la mediana.",
    `- **Interazioni pesate**: salvataggio e condivisione ${PESI.salvataggi}, commento ${PESI.commenti}, mi piace ${PESI.miPiace}. Chi salva o condivide trova il post utile.`,
    "- **Perché**: è la spiegazione più probabile dai numeri, non una certezza. Con pochi post un risultato può dipendere dal caso.",
    "",
  );
  return righe.join("\n");
}
