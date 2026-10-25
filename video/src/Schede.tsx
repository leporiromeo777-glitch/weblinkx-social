/**
 * Le schede dei post, uguali nel carosello (Post.tsx, ferme) e nel video
 * (Reel.tsx, animate). `t` è il fotogramma dall'inizio della scheda: nel
 * carosello è grande, così ogni animazione è già finita. `comparse` dice in
 * quale fotogramma compare ogni punto di un elenco.
 */
import type { CSSProperties } from "react";
import { Easing, interpolate, spring, useVideoConfig } from "remotion";
import { LAVORI, type IdLavoro } from "../../src/data/lavori";
import { MARCHIO } from "../../src/data/marchio";
import { INVITO, type PostSocial, type SchedaPost } from "../../src/data/post";
import { domandaInvito } from "../../src/lib/post";
import dimensioni from "../../risorse/siti/dimensioni.json";
import {
  Browser,
  Evidenziato,
  Icona,
  Logo,
  Occhiello,
  paroleTitolo,
  schermoBrowser,
  schermoTelefono,
  Telefono,
} from "./componenti/Base";
import { CARATTERE, COLORI, SFUMATURA_BLU } from "./stile";
import { larghezzaUtile, type Tela } from "./tela";
import { CONTA, numeroDaContare } from "./tempi-reel";

/** Nel carosello: un fotogramma in cui tutte le animazioni sono finite. */
export const FERMO = 10_000;

const MOLLA = { damping: 15, stiffness: 120, mass: 0.9 };

export type PropsScheda = {
  scheda: SchedaPost;
  tela: Tela;
  t: number;
  durata: number;
  comparse: readonly number[];
};

function useMolla(t: number, da = 0) {
  const { fps } = useVideoConfig();
  return spring({ frame: t - da, fps, config: MOLLA });
}

/** Entrata dal basso con dissolvenza. */
function entrata(p: number, distanza = 50): CSSProperties {
  return { opacity: Math.min(1, p), transform: `translateY(${(1 - p) * distanza}px)` };
}

const dominio = (id: IdLavoro) => LAVORI[id].url.replace(/^https:\/\//, "");
const immagine = (id: IdLavoro, vista: "desktop" | "mobile") => `siti/${id}/${vista}.jpg`;

/** Quanto può scorrere la pagina di un sito in uno schermo largo `larghezza` e alto `altezza`. */
function scorrimentoMassimo(id: IdLavoro, vista: "desktop" | "mobile", larghezza: number, altezza: number): number {
  const d = (dimensioni as Record<string, Record<string, { larghezza: number; altezza: number }>>)[id]?.[vista];
  if (!d) return 0;
  return Math.max(0, (d.altezza * larghezza) / d.larghezza - altezza);
}

/** Nel video la pagina scorre piano per circa due schermi, poi si ferma; nel carosello resta in cima. */
function scorrimento(t: number, durata: number, massimo: number, schermo: number): number {
  if (t >= FERMO) return 0;
  const p = interpolate(t, [18, Math.max(30, durata - 12)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return p * Math.min(massimo, schermo * 2.2);
}

/** Un titolo che entra parola per parola. */
function TitoloAnimato({ testo, t, da, dimensione, style }: { testo: string; t: number; da: number; dimensione: number; style?: CSSProperties }) {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        fontSize: dimensione,
        fontWeight: 800,
        lineHeight: 1.06,
        letterSpacing: "-0.035em",
        color: COLORI.testo,
        ...style,
      }}
    >
      {paroleTitolo(testo).map(({ parola, blu }, i) => {
        const p = spring({ frame: t - da - i * 3, fps, config: MOLLA });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.24em",
              color: blu ? COLORI.bluChiaro : undefined,
              opacity: Math.min(1, p),
              transform: `translateY(${(1 - p) * 0.5}em)`,
            }}
          >
            {parola}
          </span>
        );
      })}
    </div>
  );
}

export function Scheda(props: PropsScheda) {
  switch (props.scheda.tipo) {
    case "copertina":
      return props.scheda.lavoro ? <CopertinaLavoro {...props} scheda={props.scheda} /> : <Copertina {...props} scheda={props.scheda} />;
    case "punti":
      return <Punti {...props} scheda={props.scheda} />;
    case "sito":
      return props.scheda.vista === "desktop" ? <SitoDesktop {...props} scheda={props.scheda} /> : <SitoMobile {...props} scheda={props.scheda} />;
    case "cifra":
      return <Cifra {...props} scheda={props.scheda} />;
    case "confronto":
      return <Confronto {...props} scheda={props.scheda} />;
  }
}

/** Una colonna fra `alto` e `basso`, con il contenuto in mezzo. */
function colonnaCentrata(tela: Tela): CSSProperties {
  return {
    position: "absolute",
    left: tela.x,
    top: tela.alto,
    width: larghezzaUtile(tela),
    height: tela.basso - tela.alto,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };
}

type Di<T extends SchedaPost["tipo"]> = Omit<PropsScheda, "scheda"> & { scheda: Extract<SchedaPost, { tipo: T }> };

function Copertina({ scheda, tela, t }: Di<"copertina">) {
  const s = tela.scala;
  const occhiello = useMolla(t, 0);
  const barra = useMolla(t, 22);
  return (
    <div
      style={{
        position: "absolute",
        left: tela.x,
        top: tela.alto,
        width: larghezzaUtile(tela),
        height: tela.basso - tela.alto,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 44 * s,
      }}
    >
      <Occhiello testo={scheda.occhiello} dimensione={26 * s} style={entrata(occhiello, 30)} />
      <TitoloAnimato testo={scheda.titolo} t={t} da={6} dimensione={100 * s} />
      <div style={{ width: 160 * s * barra, height: 10 * s, borderRadius: 999, background: SFUMATURA_BLU, boxShadow: `0 0 30px ${COLORI.blu}` }} />
      <div style={{ display: "flex", gap: 16 * s, marginTop: 30 * s, ...entrata(useMolla(t, 28), 30) }}>
        {MARCHIO.servizi.map((servizio) => (
          <span
            key={servizio}
            style={{
              padding: `${12 * s}px ${24 * s}px`,
              borderRadius: 999,
              border: `1px solid ${COLORI.bordo}`,
              background: "rgba(20, 24, 32, 0.8)",
              color: COLORI.chiaro,
              fontSize: 28 * s,
              fontWeight: 500,
            }}
          >
            {servizio}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopertinaLavoro({ scheda, tela, t, durata }: Di<"copertina">) {
  const id = scheda.lavoro!;
  const reel = tela.formato === "reel";
  const s = tela.scala;
  const browser = reel ? { x: tela.x, y: 820, w: 800, h: 580 } : { x: tela.x, y: 620, w: 740, h: 520 };
  const telefono = reel ? { x: 640, y: 720, w: 380 } : { x: 690, y: 530, w: 320 };
  const pBrowser = useMolla(t, 14);
  const pTelefono = useMolla(t, 22);
  const schermoB = schermoBrowser(browser.w, browser.h);
  const schermoT = schermoTelefono(telefono.w);
  return (
    <>
      <div style={{ position: "absolute", left: tela.x, top: tela.alto, width: larghezzaUtile(tela) }}>
        <Occhiello testo={scheda.occhiello} dimensione={24 * s} style={{ ...entrata(useMolla(t, 0), 30), marginBottom: 34 * s }} />
        <TitoloAnimato testo={scheda.titolo} t={t} da={4} dimensione={84 * s} />
      </div>
      <Browser
        src={immagine(id, "desktop")}
        dominio={dominio(id)}
        larghezza={browser.w}
        altezza={browser.h}
        scorri={scorrimento(t, durata, scorrimentoMassimo(id, "desktop", schermoB.larghezza, schermoB.altezza), schermoB.altezza) * 0.5}
        style={{ position: "absolute", left: browser.x, top: browser.y, ...entrata(pBrowser, 80) }}
      />
      <Telefono
        src={immagine(id, "mobile")}
        larghezza={telefono.w}
        scorri={scorrimento(t, durata, scorrimentoMassimo(id, "mobile", schermoT.larghezza, schermoT.altezza), schermoT.altezza) * 0.5}
        style={{
          position: "absolute",
          left: telefono.x,
          top: telefono.y,
          opacity: Math.min(1, pTelefono),
          transform: `translateX(${(1 - pTelefono) * 140}px) rotate(${4 * pTelefono}deg)`,
        }}
      />
    </>
  );
}

function Punti({ scheda, tela, t, comparse }: Di<"punti">) {
  const s = tela.scala;
  const { fps } = useVideoConfig();
  return (
    <div style={{ ...colonnaCentrata(tela), gap: 22 * s }}>
      <div style={{ fontSize: 72 * s, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 26 * s, ...entrata(useMolla(t, 0)) }}>
        <Evidenziato testo={scheda.titolo} />
      </div>
      {scheda.punti.map((punto, k) => {
        const p = spring({ frame: t - (comparse[k] ?? 0), fps, config: MOLLA });
        const lampo = interpolate(t - (comparse[k] ?? 0), [0, 6, 26], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28 * s,
              padding: `${28 * s}px ${34 * s}px`,
              borderRadius: 28 * s,
              background: `rgba(20, 24, 32, ${0.88 + 0.1 * lampo})`,
              border: `2px solid ${lampo > 0.01 ? `rgba(17, 109, 255, ${0.3 + 0.7 * lampo})` : COLORI.bordo}`,
              boxShadow: lampo > 0.01 ? `0 0 ${50 * lampo}px rgba(17, 109, 255, ${0.45 * lampo})` : "none",
              opacity: Math.min(1, p),
              transform: `translateX(${(1 - p) * 90}px)`,
            }}
          >
            <Icona tipo={scheda.numerati ? "numero" : "si"} numero={k + 1} dimensione={60 * s} />
            <div style={{ fontSize: 42 * s, fontWeight: 500, lineHeight: 1.28, color: COLORI.chiaro }}>{punto}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Titolo e testo sopra o accanto a un sito. */
function TestoSito({ titolo, testo, id, t, s, larghezza }: { titolo: string; testo: string; id: IdLavoro; t: number; s: number; larghezza: number }) {
  return (
    <div style={{ width: larghezza, ...entrata(useMolla(t, 0)) }}>
      <div style={{ color: COLORI.bluChiaro, fontSize: 26 * s, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 16 * s }}>{dominio(id)}</div>
      <div style={{ fontSize: 62 * s, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.06 }}>{titolo}</div>
      <div style={{ fontSize: 36 * s, fontWeight: 400, lineHeight: 1.35, color: COLORI.tenue, marginTop: 18 * s }}>{testo}</div>
    </div>
  );
}

function SitoDesktop({ scheda, tela, t, durata }: Di<"sito">) {
  const reel = tela.formato === "reel";
  const s = tela.scala;
  const y = tela.alto + (reel ? 380 : 300);
  const w = larghezzaUtile(tela);
  const h = (reel ? 1460 : tela.basso) - y;
  const schermo = schermoBrowser(w, h);
  const p = useMolla(t, 8);
  return (
    <>
      <div style={{ position: "absolute", left: tela.x, top: tela.alto }}>
        <TestoSito titolo={scheda.titolo} testo={scheda.testo} id={scheda.lavoro} t={t} s={s} larghezza={w} />
      </div>
      <Browser
        src={immagine(scheda.lavoro, "desktop")}
        dominio={dominio(scheda.lavoro)}
        larghezza={w}
        altezza={h}
        scorri={scorrimento(t, durata, scorrimentoMassimo(scheda.lavoro, "desktop", schermo.larghezza, schermo.altezza), schermo.altezza)}
        style={{ position: "absolute", left: tela.x, top: y, ...entrata(p, 90) }}
      />
    </>
  );
}

function SitoMobile({ scheda, tela, t, durata }: Di<"sito">) {
  const reel = tela.formato === "reel";
  const s = tela.scala;
  const w = reel ? 480 : 430;
  const x = reel ? (tela.larghezza - w) / 2 : tela.larghezza - tela.x - w;
  const y = reel ? tela.alto + 380 : (tela.alto + tela.basso) / 2 - (w * 2.05) / 2;
  const schermo = schermoTelefono(w);
  const p = useMolla(t, 8);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: tela.x,
          top: reel ? tela.alto : tela.alto,
          height: reel ? undefined : tela.basso - tela.alto,
          display: "flex",
          alignItems: "center",
        }}
      >
        <TestoSito titolo={scheda.titolo} testo={scheda.testo} id={scheda.lavoro} t={t} s={s} larghezza={reel ? larghezzaUtile(tela) : 420} />
      </div>
      <Telefono
        src={immagine(scheda.lavoro, "mobile")}
        larghezza={w}
        scorri={scorrimento(t, durata, scorrimentoMassimo(scheda.lavoro, "mobile", schermo.larghezza, schermo.altezza), schermo.altezza)}
        style={{ position: "absolute", left: x, top: y, ...entrata(p, 120) }}
      />
    </>
  );
}

function Cifra({ scheda, tela, t }: Di<"cifra">) {
  const s = tela.scala;
  const p = useMolla(t, 0);
  const conta = numeroDaContare(scheda.cifra);
  const avanzamento = interpolate(t, [CONTA.da, CONTA.a], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const cifra = conta ? `${conta.prima}${(conta.numero * avanzamento).toFixed(conta.decimali).replace(".", ",")}${conta.dopo}` : scheda.cifra;
  return (
    <div
      style={{
        position: "absolute",
        left: tela.x,
        top: tela.alto,
        width: larghezzaUtile(tela),
        height: tela.basso - tela.alto,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: 40 * s,
      }}
    >
      <div
        style={{
          // Grande, ma sempre dentro la tela (Inter è larga circa mezza «em» per carattere).
          fontSize: Math.min(180 * s, larghezzaUtile(tela) / (scheda.cifra.length * 0.52)),
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          background: SFUMATURA_BLU,
          WebkitBackgroundClip: "text",
          color: "transparent",
          filter: `drop-shadow(0 0 40px rgba(17, 109, 255, 0.45))`,
          opacity: Math.min(1, p),
          transform: `scale(${0.7 + 0.3 * p})`,
          whiteSpace: "nowrap",
        }}
      >
        {cifra}
      </div>
      <div style={{ fontSize: 46 * s, fontWeight: 500, lineHeight: 1.3, color: COLORI.chiaro, maxWidth: 860 * s, ...entrata(useMolla(t, 14)) }}>
        {scheda.testo}
      </div>
    </div>
  );
}

function Confronto({ scheda, tela, t, comparse }: Di<"confronto">) {
  const s = tela.scala;
  const { fps } = useVideoConfig();
  const righe = [
    { tipo: "no" as const, etichetta: "No", testo: scheda.no },
    { tipo: "si" as const, etichetta: "Sì", testo: scheda.si },
  ];
  return (
    <div style={{ ...colonnaCentrata(tela), gap: 28 * s }}>
      <div style={{ fontSize: 72 * s, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 24 * s, ...entrata(useMolla(t, 0)) }}>
        {scheda.titolo}
      </div>
      {righe.map((r, k) => {
        const p = spring({ frame: t - (comparse[k] ?? 0), fps, config: MOLLA });
        const no = r.tipo === "no";
        return (
          <div
            key={r.tipo}
            style={{
              display: "flex",
              gap: 30 * s,
              alignItems: "flex-start",
              padding: `${38 * s}px ${38 * s}px`,
              borderRadius: 30 * s,
              background: no ? "rgba(255, 107, 107, 0.07)" : "rgba(17, 109, 255, 0.12)",
              border: `2px solid ${no ? "rgba(255, 107, 107, 0.45)" : "rgba(17, 109, 255, 0.7)"}`,
              opacity: Math.min(1, p) * (no && t < FERMO ? interpolate(t - (comparse[1] ?? 0), [0, 20], [1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1),
              transform: `translateY(${(1 - p) * 60}px)`,
            }}
          >
            <Icona tipo={r.tipo} dimensione={68 * s} />
            <div>
              <div style={{ fontSize: 30 * s, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: no ? COLORI.no : COLORI.bluChiaro, marginBottom: 10 * s }}>
                {r.etichetta}
              </div>
              <div style={{ fontSize: 42 * s, fontWeight: 500, lineHeight: 1.3, color: COLORI.chiaro }}>{r.testo}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** L'ultima scheda: l'invito a scrivere, il sito e, per i consigli, la fonte. */
export function Chiusura({ post, tela, t }: { post: PostSocial; tela: Tela; t: number }) {
  const s = tela.scala;
  const reel = tela.formato === "reel";
  const fonte = post.fonti[0];
  const pulsante = useMolla(t, 26);
  const pFonte = useMolla(t, 34);
  const respiro = t < FERMO ? 1 + 0.025 * Math.sin((t / 30) * Math.PI * 1.2) : 1;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: tela.x,
          top: tela.alto,
          width: larghezzaUtile(tela),
          height: tela.basso - tela.alto - (fonte ? 80 : 0),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={entrata(useMolla(t, 0), 30)}>
          <Logo dimensione={(reel ? 96 : 88) * s} />
        </div>
        <div style={{ fontSize: 70 * s, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 70 * s, ...entrata(useMolla(t, 8)) }}>
          {domandaInvito(post)}
        </div>
        <div style={{ fontSize: 38 * s, color: COLORI.tenue, marginTop: 26 * s, ...entrata(useMolla(t, 14)) }}>{INVITO.sotto}</div>
        <div
          style={{
            marginTop: 56 * s,
            padding: `${26 * s}px ${60 * s}px`,
            borderRadius: 999,
            background: SFUMATURA_BLU,
            color: "#fff",
            fontSize: 44 * s,
            fontWeight: 700,
            boxShadow: `0 0 ${60 * s}px rgba(17, 109, 255, 0.55)`,
            opacity: Math.min(1, pulsante),
            transform: `scale(${(0.8 + 0.2 * pulsante) * respiro})`,
          }}
        >
          {MARCHIO.sito.replace("https://", "")}
        </div>
        <div style={{ fontSize: 30 * s, color: COLORI.tenue, marginTop: 24 * s, ...entrata(useMolla(t, 30)) }}>Link nel profilo</div>
      </div>
      {fonte ? (
        <div
          style={{
            position: "absolute",
            left: tela.x,
            width: larghezzaUtile(tela),
            top: tela.basso - 70,
            textAlign: "center",
            fontSize: 24 * s,
            lineHeight: 1.35,
            color: COLORI.tenue,
            ...entrata(pFonte, 20),
          }}
        >
          Fonte: {fonte.titolo}, {fonte.ente}
        </div>
      ) : null}
    </>
  );
}

export { CARATTERE };
