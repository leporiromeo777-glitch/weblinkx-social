# I post social di Weblinkx

Ogni giorno escono da soli e gratis due contenuti di Weblinkx: a pranzo un
**video** (Reel) su Instagram e sulla pagina Facebook, la sera un
**carosello** di immagini sugli stessi social (e su LinkedIn, se lo
colleghi). Poi il sistema legge le statistiche e scrive quali post vanno
meglio e perché ([`analisi.md`](analisi.md)).

- **I post** sono in [`src/data/post.ts`](../src/data/post.ts), e i giorni
  in cui escono nel `CALENDARIO`: una riga al giorno dal 27.10.2026
  (`INIZIO_PIANO`), con il video e il carosello. Il video e il carosello
  dello stesso giorno parlano di **argomenti diversi**: i video partono dai
  lavori (dove i siti scorrono), i caroselli dai consigli da salvare, e ogni
  argomento torna nell'altro formato dopo 12-17 giorni. I giorni già usciti
  non si cambiano più: i test confrontano il calendario con `storico.json`
  (per spostare tutto con `INIZIO_PIANO` bisogna farlo prima del primo
  post). Ci sono quattro tipi di
  post: i **lavori** (i siti dei clienti, da
  [`src/data/lavori.ts`](../src/data/lavori.ts)), i **consigli** per chi ha
  un'attività (ogni regola o cifra con la sua fonte ufficiale, da
  [`src/data/fonti.ts`](../src/data/fonti.ts)), il **dietro le quinte** e la
  presentazione. I test (`npm test`) controllano lunghezze, fonti, foto e voci.
- **Le foto dei siti** dei clienti sono in [`risorse/siti/`](../risorse/siti):
  la pagina intera vista da un computer e da un telefono. Le fa
  `npm run catture` (serve Playwright con Chromium). Quando un cliente
  cambia il sito, rifalle e rifai le immagini dei post che lo mostrano.
- **Le immagini** sono in questa cartella, `social/<id-del-post>/01.jpg, 02.jpg, …`
  (JPEG 1080×1350). Le fa Remotion con i colori e il carattere del sito
  Weblinkx: `cd video && npm run social`. Accanto c'è `contenuto.json`, i
  testi da cui sono fatte: se un testo delle schede cambia e le immagini no,
  `npm test` lo segnala.
- **Il video** (1080×1920, 25-45 secondi) lo fa Remotion al momento, dalle
  stesse schede: i titoli entrano parola per parola, i siti dei clienti
  scorrono nel telefono e nel browser, i punti compaiono quando la voce li
  dice. Sotto, musica ed effetti fatti dal codice
  ([`video/scripts/audio-reel.py`](../video/scripts/audio-reel.py)), niente
  diritti da pagare; gli effetti stanno sotto la musica (`EFFETTI`). Volume
  finale -14 LUFS. In locale:
  `cd video && npm run reel -- <id-del-post>` (servono anche `ffmpeg` e
  Python con NumPy). Il video non va nel repository: GitHub lo tiene due
  settimane tra i file dell'esecuzione («Artifacts»).
- **La pubblicazione** la fa GitHub Actions
  ([`.github/workflows/social.yml`](../.github/workflows/social.yml), script
  [`scripts/social/pubblica.ts`](../scripts/social/pubblica.ts)): il video
  dalle 12 e il carosello dalle 19, ora svizzera. GitHub ritarda gli orari
  programmati anche di ore, o li salta: per questo il workflow parte ogni ora
  e il primo passo ([`scripts/social/turno.ts`](../scripts/social/turno.ts))
  decide se è il momento e se il post manca ancora su qualche social. Il
  repository è pubblico, quindi i minuti di GitHub Actions non costano
  nulla. Instagram e Facebook scaricano le immagini da
  `raw.githubusercontent.com`, alla versione del commit; il video invece lo
  carica lo script.

Ogni pubblicazione finisce in [`storico.json`](storico.json) (giorno, post,
social, formato, id e ora), che il workflow salva nel repository: un post già
uscito su un social non viene pubblicato una seconda volta, nemmeno se rilanci
il workflow a mano. Finché nessun social è collegato il workflow non fa nulla.

## La voce nei video

La voce è **«Holden» di ElevenLabs** (tramite Higgsfield, modello
`text2speech_v2`, variante `elevenlabs`, voce preset
`3c9d6053-6334-592c-8997-4e325286af3f`). Ogni scheda ha la sua frase, in
`video/sorgenti/voci/<id-del-post>/01.mp3, 02.mp3, …`, più tre chiusure
(`chiusura-lavoro.mp3`, `chiusura-fonti.mp3`, `chiusura.mp3`).

Se cambi il testo di un post, la sua voce va rifatta:

1. `cd video && npm run voci` elenca i file da rifare con il testo esatto
   da far leggere (i nomi sono già scritti come si pronunciano: «Weblinks»,
   «Sladja», «enne-ci-ci»).
2. Genera ogni frase con la voce Holden e salvala con quel nome.
3. `npm run voci -- --registra` aggiorna `voci.json`.

Finché una voce manca o non corrisponde al testo, quel video esce con la
sola musica, e `npm test` lo segnala.

## Collegare Instagram e la pagina Facebook

Ti servono la **pagina Facebook di Weblinkx** e l'**account Instagram
professionale** collegato alla pagina.

**Usa la stessa app di Meta dei post di Bleo** («Bleo social»): un'app può
pubblicare su più pagine. Non creare una seconda app né un secondo account
sviluppatore: Meta li considera sospetti e può bloccare l'account, com'è
successo il 22.10. Genera i token **una volta sola**, con calma.

1. Apri il [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   con il tuo profilo personale e scegli l'app «Bleo social».
2. **Generate Access Token** con gli stessi permessi di Bleo:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`,
   `instagram_manage_insights`, `read_insights`. Quando Meta chiede quali
   pagine e account Instagram usare, **spunta anche Weblinkx** (lascia
   spuntata anche Bleo, se no il suo token smette di funzionare).
3. Nel [debugger dei token](https://developers.facebook.com/tools/debug/accesstoken/)
   incolla il token e premi **Estendi token d'accesso**.
4. Torna nel Graph API Explorer con il token esteso e chiedi `me/accounts`.
   Della pagina **Weblinkx** copia `id` e `access_token`: questo token **non
   scade** (nel debugger: «Scade: mai»).
5. Chiedi `<id-della-pagina>?fields=instagram_business_account` e copia l'id
   di Instagram.
6. Su GitHub, nel repository **weblinkx-social**: **Settings → Secrets and
   variables → Actions**.
   - Scheda *Secrets*: `META_PAGE_TOKEN` = il token della pagina Weblinkx.
   - Scheda *Variables*: `FACEBOOK_PAGE_ID` e `INSTAGRAM_USER_ID`.
7. Fai una prova: **Actions → Post social di Weblinkx → Run workflow** con
   «Solo prova» spuntato. Nel riassunto deve comparire «credenziali a posto».

I token non vanno mai incollati in chat: solo nei secret di GitHub.

Nella bio di Instagram metti il link con la provenienza:
`https://weblinkx.ch/?utm_source=instagram`. Nei post di Facebook e
LinkedIn il link c'è già, con `utm_source=facebook` e `utm_source=linkedin`.

## LinkedIn e TikTok

LinkedIn funziona come per Bleo: un token (`LINKEDIN_TOKEN`) che dura 60
giorni. Su TikTok, con l'API ufficiale i post restano privati finché l'app
non supera la revisione di TikTok: il video lo scarichi dalla pagina
dell'esecuzione su GitHub («Artifacts») e lo pubblichi dal telefono.

## Statistiche e post nuovi

Ogni sera, dopo il carosello, `npm run social:statistiche` legge da Meta i
numeri dei post degli ultimi 28 giorni (`statistiche.json`) e riscrive
`analisi.md`: classifica, migliore e peggiore, e cosa hanno in comune i post
che vanno meglio (tipo di post, sito di un cliente, domanda o affermazione
nel titolo).

**La routine che corregge il tiro.** Ogni **lunedì e giovedì alle 7:37**
(ora svizzera) una routine di Claude legge `analisi.md`, scrive in
[`analisi/`](analisi) cosa è andato bene e male e perché (separato per video
e carosello), e rende i post dei giorni dopo più simili a quelli andati
meglio:

- cambia testi e schede dei post futuri, o il loro ordine nel `CALENDARIO`,
  mai quelli di oggi e di domani né quelli già usciti;
- quando al calendario restano meno di 14 giorni aggiunge post nuovi sui
  temi che funzionano: solo lavori veri di `src/data/lavori.ts` e cifre con
  la fonte in `src/data/fonti.ts`;
- rifà le immagini e le voci (Holden, con Higgsfield) dei post cambiati;
- se `npm test` e `npm run typecheck` passano, fa il commit su `main` da sola
  (senza pull request); se no non cambia nulla e lo dice.

Con pochi dati (i primi giorni) non cambia nulla. Il riassunto arriva come
notifica sul telefono. La routine si gestisce da claude.ai/code, sezione
delle attività programmate («Analisi dei social di Weblinkx»).

Se il calendario finisce senza post nuovi, il workflow fallisce apposta e
GitHub ti manda un'email.

## Prima e dopo

I post «prima e dopo» (il sito vecchio di un cliente accanto a quello nuovo)
non ci sono ancora: servono le immagini del sito di prima, e solo se quel
sito era davvero del cliente. Se le hai, mettile in
`risorse/siti/<id>/prima-desktop.jpg` e `prima-mobile.jpg`, oppure indica in
`src/data/lavori.ts` (`prima`) l'indirizzo della versione vecchia su
web.archive.org e `npm run catture` la fotografa. Poi serve una scheda nuova
nelle grafiche (`video/src/Schede.tsx`), con le due versioni affiancate.
