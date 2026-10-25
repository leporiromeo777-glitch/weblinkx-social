/**
 * Le fonti ufficiali dei consigli: ogni cifra, soglia o regola nei post
 * viene da una di queste pagine. Controllate il 25.10.2026.
 */
export type Fonte = { titolo: string; ente: string; url: string };

export const VERIFICATO_IL = "2026-10-25";

export const FONTI = {
  rankingLocale: {
    titolo: "Suggerimenti per migliorare il posizionamento nei risultati di ricerca locale su Google",
    ente: "Google, Guida di Profilo dell'attività",
    url: "https://support.google.com/business/answer/7091?hl=it",
  },
  recensioni: {
    titolo: "Suggerimenti per ricevere più recensioni",
    ente: "Google, Guida di Profilo dell'attività",
    url: "https://support.google.com/business/answer/3474122?hl=it",
  },
  mobileFirst: {
    titolo: "Best practice per l'indicizzazione mobile-first",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=it",
  },
  lcp: {
    titolo: "Largest Contentful Paint (LCP)",
    ente: "Google, web.dev",
    url: "https://web.dev/articles/lcp?hl=it",
  },
  pageSpeed: {
    titolo: "PageSpeed Insights",
    ente: "Google",
    url: "https://pagespeed.web.dev/",
  },
  titoli: {
    titolo: "Influenzare i link dei titoli nella Ricerca Google",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/title-link?hl=it",
  },
  descrizioni: {
    titolo: "Come scrivere meta descrizioni",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/snippet?hl=it",
  },
  esperienzaPagina: {
    titolo: "Comprendere l'esperienza sulle pagine di Google",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/page-experience?hl=it",
  },
  httpsChrome: {
    titolo: "A secure web is here to stay",
    ente: "Google, blog di Chromium",
    url: "https://blog.chromium.org/2018/02/a-secure-web-is-here-to-stay.html",
  },
  immagini: {
    titolo: "Best practice relative alla SEO per le immagini",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/google-images?hl=it",
  },
  whatsapp: {
    titolo: "Come usare la funzione clicca per chattare",
    ente: "WhatsApp, Centro assistenza",
    url: "https://faq.whatsapp.com/5913398998672934/?locale=it_IT",
  },
  lpd: {
    titolo: "Legge federale sulla protezione dei dati (LPD), art. 19",
    ente: "Confederazione svizzera, Fedlex",
    url: "https://www.fedlex.admin.ch/eli/cc/2022/491/it",
  },
  ifpdt: {
    titolo: "Incaricato federale della protezione dei dati e della trasparenza",
    ente: "IFPDT",
    url: "https://www.edoeb.admin.ch/it",
  },
  lcsl: {
    titolo: "Legge federale contro la concorrenza sleale (LCSl), art. 3 cpv. 1 lett. s",
    ente: "Confederazione svizzera, Fedlex",
    url: "https://www.fedlex.admin.ch/eli/cc/1988/223_223_223/it",
  },
  wcag: {
    titolo: "Web Content Accessibility Guidelines (WCAG) 2.2, criterio 1.4.3",
    ente: "W3C",
    url: "https://www.w3.org/TR/WCAG22/#contrast-minimum",
  },
  nic: {
    titolo: "Domini .ch e .li",
    ente: "SWITCH, nic.ch",
    url: "https://www.nic.ch/it/",
  },
} as const satisfies Record<string, Fonte>;
