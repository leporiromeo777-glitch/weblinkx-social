# Weblinkx social

I post social di [Weblinkx](https://weblinkx.ch): ogni giorno un video
(Reel) a pranzo e un carosello la sera su Instagram e Facebook, fatti dal
codice con i colori del sito e pubblicati da soli da GitHub Actions. Mostrano
i lavori di Weblinkx, consigli pratici con fonti ufficiali e il dietro le
quinte.

- Come funziona e come collegare i social: [`social/README.md`](social/README.md)
- Il piano dei post: [`src/data/post.ts`](src/data/post.ts)
- I lavori mostrati: [`src/data/lavori.ts`](src/data/lavori.ts)
- Come vanno i post: [`social/analisi.md`](social/analisi.md)

```sh
npm ci && npm test            # controlli su testi, fonti, foto e voci
cd video && npm ci
npm run social                # le immagini dei caroselli in social/
npm run reel -- lavoro-essenza  # un video in video/out/
```
