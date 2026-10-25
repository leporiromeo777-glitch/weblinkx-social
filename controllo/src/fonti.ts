/**
 * Le fonti ufficiali del controllo: una copia di quelle in src/data/fonti.ts
 * del repository (il progetto Netlify si carica da solo, senza il resto). I
 * test controllano che siano uguali: se cambi una fonte là, copiala qui.
 */
export type Fonte = { titolo: string; ente: string; url: string };

export const VERIFICATO_IL = "2026-10-25";

export const FONTI = {
  httpsChrome: {
    titolo: "A secure web is here to stay",
    ente: "Google, blog di Chromium",
    url: "https://blog.chromium.org/2018/02/a-secure-web-is-here-to-stay.html"
  },
  mobileFirst: {
    titolo: "Best practice per l'indicizzazione mobile-first",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=it"
  },
  titoli: {
    titolo: "Influenzare i link dei titoli nella Ricerca Google",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/title-link?hl=it"
  },
  descrizioni: {
    titolo: "Come scrivere meta descrizioni",
    ente: "Google Search Central",
    url: "https://developers.google.com/search/docs/appearance/snippet?hl=it"
  },
  whatsapp: {
    titolo: "Come usare la funzione clicca per chattare",
    ente: "WhatsApp, Centro assistenza",
    url: "https://faq.whatsapp.com/5913398998672934/?locale=it_IT"
  },
  lcp: {
    titolo: "Largest Contentful Paint (LCP)",
    ente: "Google, web.dev",
    url: "https://web.dev/articles/lcp?hl=it"
  },
  pageSpeed: {
    titolo: "PageSpeed Insights",
    ente: "Google",
    url: "https://pagespeed.web.dev/"
  }
} as const satisfies Record<string, Fonte>;
