/**
 * Un'immagine del carosello (1080×1350): una scheda del post o, dopo
 * l'ultima, l'invito. Le fa scripts/social.ts, una per scheda.
 */
import { AbsoluteFill } from "remotion";
import { MARCHIO } from "../../src/data/marchio";
import { trovaPost } from "../../src/data/post";
import { Logo, Sfondo } from "./componenti/Base";
import { Chiusura, FERMO, Scheda } from "./Schede";
import { CARATTERE, COLORI } from "./stile";
import { TELA_POST } from "./tela";

export const LARGHEZZA_POST = TELA_POST.larghezza;
export const ALTEZZA_POST = TELA_POST.altezza;

export type PropsPost = { postId: string; indice: number };

export function Post({ postId, indice }: PropsPost) {
  const post = trovaPost(postId);
  const totale = post.schede.length + 1;
  const scheda = post.schede[indice];
  const ultima = indice === totale - 1;
  return (
    <AbsoluteFill style={{ fontFamily: CARATTERE, color: COLORI.testo }}>
      <Sfondo />
      <div style={{ position: "absolute", left: TELA_POST.x, top: 66 }}>
        <Logo dimensione={44} />
      </div>
      <div style={{ position: "absolute", right: TELA_POST.x, top: 72, fontSize: 26, fontWeight: 600, color: COLORI.tenue, letterSpacing: "0.08em" }}>
        {String(indice + 1).padStart(2, "0")} / {String(totale).padStart(2, "0")}
      </div>
      {scheda ? <Scheda scheda={scheda} tela={TELA_POST} t={FERMO} durata={FERMO} comparse={[]} /> : <Chiusura post={post} tela={TELA_POST} t={FERMO} />}
      <div
        style={{
          position: "absolute",
          left: TELA_POST.x,
          right: TELA_POST.x,
          bottom: 56,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 26,
          fontWeight: 500,
          color: COLORI.tenue,
        }}
      >
        <span>{MARCHIO.sito.replace("https://", "")}</span>
        {ultima ? null : <span style={{ color: COLORI.bluChiaro, fontWeight: 600 }}>Scorri →</span>}
      </div>
    </AbsoluteFill>
  );
}
