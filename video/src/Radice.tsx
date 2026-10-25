import { Composition } from "remotion";
import { POST_SOCIAL } from "../../src/data/post";
import { ALTEZZA_POST, LARGHEZZA_POST, Post, type PropsPost } from "./Post";
import { Reel, type PropsReel } from "./Reel";
import { ALTEZZA_REEL, FPS_REEL, LARGHEZZA_REEL, tempiReel } from "./tempi-reel";
import { trovaPost } from "../../src/data/post";

export function Radice() {
  return (
    <>
      {/* Le immagini dei post, una per scheda: le fa scripts/social.ts. */}
      <Composition
        id="post"
        component={Post}
        fps={FPS_REEL}
        width={LARGHEZZA_POST}
        height={ALTEZZA_POST}
        durationInFrames={1}
        defaultProps={{ postId: POST_SOCIAL[0].id, indice: 0 } satisfies PropsPost}
      />
      {/* Il video verticale del post del giorno: lo fa scripts/reel.ts. */}
      <Composition
        id="reel"
        component={Reel}
        fps={FPS_REEL}
        width={LARGHEZZA_REEL}
        height={ALTEZZA_REEL}
        durationInFrames={1}
        defaultProps={{ postId: POST_SOCIAL[1].id, audio: null, voce: null } satisfies PropsReel}
        calculateMetadata={({ props }) => ({ durationInFrames: tempiReel(trovaPost(props.postId), props.voce).totale })}
      />
    </>
  );
}
