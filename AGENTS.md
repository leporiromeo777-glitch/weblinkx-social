# Weblinkx social: regole del progetto

I post di Weblinkx (siti web, branding e video di Romeo Lepori, Ticino):
ogni giorno un video e un carosello su Instagram e Facebook, fatti dal codice
e pubblicati da GitHub Actions. Come funziona: `social/README.md`.

## Regole sul contenuto (non negoziabili)
- Testi in italiano semplice e diretto, per chi ha una piccola attività.
  Formato svizzero: `CHF 1'500`, date `27.10.2026`.
- **Solo lavori veri e confermati** da Romeo (`src/data/lavori.ts`). Le
  descrizioni dicono cosa si vede sul sito, mai risultati inventati («+50% di
  clienti», «primo su Google»).
- **Ogni cifra, soglia o regola** viene da una fonte ufficiale con URL
  (`src/data/fonti.ts`) e il post la cita. Leggi e privacy: informazioni
  generali, e il testo lo dice.
- Niente prezzi né promesse che Romeo non ha confermato. L'invito è sempre
  «preventivo senza impegno», come sul sito.
- I token e le chiavi non si scrivono mai nel codice né in chat: solo nei
  secret di GitHub.

## Tecnica
- Logica pura in `src/` (dati in `src/data/`, funzioni in `src/lib/`) e
  script in `scripts/`, con test Vitest accanto (`*.test.ts`).
- Grafiche e video con Remotion in `video/` (immagini: `npm run social`,
  video: `npm run reel`). La voce è ElevenLabs «Holden»: se un testo
  cambia, la voce va rifatta (`cd video && npm run voci`).
- Le foto dei siti dei clienti: `npm run catture` (Playwright).

## Comandi
- `npm test` (Vitest)
- `npm run typecheck` (e `cd video && npm run typecheck`)
