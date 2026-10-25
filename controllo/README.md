# Il controllo gratuito del sito

Una pagina dove il titolare di un'attività scrive l'indirizzo del suo sito e
in un minuto vede sei cose che Google e i clienti guardano: il lucchetto
(HTTPS), il telefono, il titolo e la descrizione su Google, un link per
contattarlo con un tocco e la velocità. Ogni risultato ha la sua fonte
ufficiale ([`src/fonti.ts`](src/fonti.ts), copiata da
[`../src/data/fonti.ts`](../src/data/fonti.ts): i test controllano che siano
uguali). Sono informazioni generali, e la pagina lo dice.

Se vuole, lascia l'email e riceve il rapporto: parte da solo, e a Romeo
arriva un avviso con il contatto. È un contatto che l'ha chiesto lui (la
casella del consenso è obbligatoria).

- **Online:** https://weblinkx-controllo.netlify.app (progetto Netlify
  `weblinkx-controllo`).
- **La pagina:** [`public/index.html`](public/index.html).
- **Il controllo:** [`src/controllo.ts`](src/controllo.ts), chiamato da
  [`netlify/functions/controlla.mts`](netlify/functions/controlla.mts)
  (`POST /api/controlla`). Apre solo siti pubblici: niente indirizzi
  interni, porte strane o password nell'indirizzo.
- **Le email:** [`src/email.ts`](src/email.ts), mandate da
  [`netlify/functions/rapporto.mts`](netlify/functions/rapporto.mts) quando
  arriva il modulo «rapporto». I moduli restano salvati su Netlify (Forms).
- **I test:** `npm test` nella cartella principale.

## Da fare una volta sola

1. **Le email (serve per il rapporto automatico).** Nel tuo account Google
   attiva la verifica in due passaggi, poi apri
   https://myaccount.google.com/apppasswords, crea una password per le app
   «Weblinkx controllo» e copiala. Su Netlify: progetto
   **weblinkx-controllo → Project configuration → Environment variables →
   Add a variable**: `GMAIL_APP_PASSWORD`, spunta «Contains secret values»,
   valore = la password. Poi **Deploys → Trigger deploy**. (`GMAIL_USER` c'è
   già.) La password non va mai scritta in chat né nel codice.
2. **La velocità (facoltativo).** Senza chiave, Google risponde solo poche
   volte al giorno e la velocità resta «da controllare». Crea una chiave
   gratuita: https://developers.google.com/speed/docs/insights/v5/get-started
   («Get a Key»), poi su Netlify la variabile `PAGESPEED_API_KEY`, segreta,
   e un nuovo deploy.
3. **Il tuo indirizzo (facoltativo).** Per `controllo.weblinkx.ch`: su
   Netlify **Domain management → Add a domain**, e segui le istruzioni per
   il DNS di weblinkx.ch.
4. **Il link.** Metti il link alla pagina su weblinkx.ch e nella bio di
   Instagram. I post possono finire con «controlla il tuo sito gratis».

## Aggiornare la pagina

Si carica con il server MCP di Netlify (strumento `deploy-site`), dalla
cartella `controllo/` senza `node_modules`: Netlify installa le dipendenze e
pubblica `public/` con le funzioni.
