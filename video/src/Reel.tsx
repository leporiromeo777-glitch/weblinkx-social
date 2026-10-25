/**
 * Il video verticale del post del giorno (1080×1920, 30 fps): le schede del
 * carosello una dopo l'altra, animate, con la voce che le legge, i siti dei
 * clienti che scorrono nel telefono e nel browser, musica ed effetti. Lo fa
 * scripts/reel.ts; i tempi sono in tempi-reel.ts.
 */
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { trovaPost, type PostSocial } from "../../src/data/post";
import { Logo, Sfondo } from "./componenti/Base";
import { Chiusura, Scheda } from "./Schede";
import { CARATTERE, COLORI } from "./stile";
import { TELA_REEL } from "./tela";
import { ATTACCO_VOCE, tempiReel, type ParteReel, type VoceReel } from "./tempi-reel";

export type PropsReel = {
  postId: string;
  /** Musica ed effetti in public/ (li fa scripts/audio-reel.py); null: muto. */
  audio: string | null;
  /**
   * La voce: i file sono in public/<cartella>/ (01.mp3, 02.mp3, … una per
   * scheda, e chiusura.mp3); null: senza voce, solo musica.
   */
  voce: (VoceReel & { cartella: string }) | null;
};

const USCITA = 10;

export function Reel({ postId, audio, voce }: PropsReel) {
  const frame = useCurrentFrame();
  const post = trovaPost(postId);
  const tempi = tempiReel(post, voce);
  const avanzamento = frame / tempi.totale;
  return (
    <AbsoluteFill style={{ fontFamily: CARATTERE, color: COLORI.testo }}>
      <Sfondo />
      {audio ? <Html5Audio src={staticFile(audio)} /> : null}
      {voce
        ? tempi.parti.map((parte) => (
            <Sequence key={`voce-${parte.indice}`} from={parte.inizio + ATTACCO_VOCE} name="voce">
              <Html5Audio src={staticFile(`${voce.cartella}/${parte.scheda ? `${String(parte.indice + 1).padStart(2, "0")}.mp3` : "chiusura.mp3"}`)} />
            </Sequence>
          ))
        : null}
      <div style={{ position: "absolute", left: TELA_REEL.x, top: 150 }}>
        <Logo dimensione={54} />
      </div>
      <div style={{ position: "absolute", left: TELA_REEL.x, right: TELA_REEL.x, top: 230, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${avanzamento * 100}%`, height: "100%", borderRadius: 999, background: COLORI.blu, boxShadow: `0 0 16px ${COLORI.blu}` }} />
      </div>
      {tempi.parti.map((parte, i) => (
        <Sequence key={parte.indice} from={parte.inizio} durationInFrames={parte.durata} name={parte.scheda?.tipo ?? "chiusura"}>
          <Parte parte={parte} post={post} ultima={i === tempi.parti.length - 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function Parte({ parte, post, ultima }: { parte: ParteReel; post: PostSocial; ultima: boolean }) {
  const t = useCurrentFrame();
  const fuori = ultima ? 0 : interpolate(t, [parte.durata - USCITA, parte.durata], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: 1 - fuori, transform: `translateY(${-fuori * 50}px)` }}>
      {parte.scheda ? (
        <Scheda scheda={parte.scheda} tela={TELA_REEL} t={t} durata={parte.durata} comparse={parte.punti} />
      ) : (
        <Chiusura post={post} tela={TELA_REEL} t={t} />
      )}
    </AbsoluteFill>
  );
}
