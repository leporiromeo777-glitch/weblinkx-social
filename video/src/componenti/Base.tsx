/**
 * I pezzi comuni di immagini e video: lo sfondo scuro del sito, il logo, i
 * titoli con le parole in blu, il telefono e la finestra del browser in cui
 * scorrono i siti dei clienti.
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { MARCHIO } from "../../../src/data/marchio";
import { CARATTERE, COLORI, OMBRA } from "../stile";

/** Il fondo del sito: quasi nero, con due luci blu che si muovono piano e una griglia leggera. */
export function Sfondo() {
  const t = useCurrentFrame() / 30;
  const dx = Math.sin(t / 3) * 24;
  const dy = Math.cos(t / 4) * 18;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORI.sfondo, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -420 + dx,
          top: -380 + dy,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(17, 109, 255, 0.30) 0%, rgba(17, 109, 255, 0.08) 45%, rgba(17, 109, 255, 0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          right: -380 - dx,
          bottom: -320 + dy,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 76, 115, 0.45) 0%, rgba(0, 76, 115, 0) 68%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
}

/** Il logo: «Web» bianco e «linkx» blu, come sul sito. */
export function Logo({ dimensione }: { dimensione: number }) {
  return (
    <div style={{ fontFamily: CARATTERE, fontWeight: 800, fontSize: dimensione, letterSpacing: "-0.03em", lineHeight: 1, color: COLORI.testo }}>
      {MARCHIO.logo.prima}
      <span style={{ color: COLORI.blu }}>{MARCHIO.logo.seconda}</span>
    </div>
  );
}

/** Un testo con le parole fra asterischi in blu: «Il sito di *EssenZa*». */
export function Evidenziato({ testo }: { testo: string }) {
  return (
    <>
      {testo.split("*").map((parte, i) =>
        i % 2 ? (
          <span key={i} style={{ color: COLORI.bluChiaro }}>
            {parte}
          </span>
        ) : (
          <span key={i}>{parte}</span>
        ),
      )}
    </>
  );
}

/** Le parole di un titolo, una per una, con le parole fra asterischi segnate. */
export function paroleTitolo(testo: string): { parola: string; blu: boolean }[] {
  return testo
    .split("*")
    .flatMap((parte, i) => parte.split(/\s+/).filter(Boolean).map((parola) => ({ parola, blu: i % 2 === 1 })));
}

/** L'etichetta piccola sopra i titoli. */
export function Occhiello({ testo, dimensione, style }: { testo: string; dimensione: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dimensione * 0.5,
        padding: `${dimensione * 0.45}px ${dimensione * 0.85}px`,
        borderRadius: 999,
        border: `2px solid rgba(17, 109, 255, 0.55)`,
        background: "rgba(17, 109, 255, 0.12)",
        color: "#A9C8FF",
        fontSize: dimensione,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      <span style={{ width: dimensione * 0.42, height: dimensione * 0.42, borderRadius: "50%", background: COLORI.blu, boxShadow: `0 0 ${dimensione}px ${COLORI.blu}` }} />
      {testo}
    </div>
  );
}

/** Un'immagine di un sito che scorre dentro uno schermo. `scorri`: pixel (dello schermo) già scorsi. */
function Schermo({ src, scorri, children }: { src: string; scorri: number; children?: ReactNode }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#fff" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: "100%", transform: `translateY(${-scorri}px)` }} />
      {children}
    </div>
  );
}

/** Lo spessore del bordo del telefono rispetto alla sua larghezza. */
const BORDO_TELEFONO = 0.035;
/** Il rapporto altezza/larghezza del telefono. */
export const PROPORZIONE_TELEFONO = 2.05;

/** Lo schermo del telefono: larghezza e altezza utili, per calcolare quanto può scorrere la pagina. */
export function schermoTelefono(larghezza: number) {
  const bordo = larghezza * BORDO_TELEFONO;
  return { larghezza: larghezza - 2 * bordo, altezza: larghezza * PROPORZIONE_TELEFONO - 2 * bordo };
}

export function Telefono({ src, larghezza, scorri = 0, style }: { src: string; larghezza: number; scorri?: number; style?: CSSProperties }) {
  const bordo = larghezza * BORDO_TELEFONO;
  return (
    <div
      style={{
        width: larghezza,
        height: larghezza * PROPORZIONE_TELEFONO,
        padding: bordo,
        borderRadius: larghezza * 0.16,
        background: "linear-gradient(145deg, #2b3242, #0b0d12)",
        boxShadow: `${OMBRA}, inset 0 0 0 2px rgba(255,255,255,0.08)`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: larghezza * 0.13, overflow: "hidden" }}>
        <Schermo src={src} scorri={scorri}>
          <div
            style={{
              position: "absolute",
              top: larghezza * 0.03,
              left: "50%",
              width: larghezza * 0.3,
              height: larghezza * 0.085,
              transform: "translateX(-50%)",
              borderRadius: 999,
              background: "#05070b",
            }}
          />
        </Schermo>
      </div>
    </div>
  );
}

/** L'altezza della barra in alto del browser rispetto alla sua larghezza. */
const BARRA_BROWSER = 0.06;

/** Lo schermo del browser: larghezza e altezza utili. */
export function schermoBrowser(larghezza: number, altezza: number) {
  return { larghezza, altezza: altezza - larghezza * BARRA_BROWSER };
}

export function Browser({
  src,
  dominio,
  larghezza,
  altezza,
  scorri = 0,
  style,
}: {
  src: string;
  dominio: string;
  larghezza: number;
  altezza: number;
  scorri?: number;
  style?: CSSProperties;
}) {
  const barra = larghezza * BARRA_BROWSER;
  const punto = barra * 0.22;
  return (
    <div
      style={{
        width: larghezza,
        height: altezza,
        borderRadius: barra * 0.42,
        overflow: "hidden",
        background: COLORI.sfondo2,
        boxShadow: OMBRA,
        border: `1px solid ${COLORI.bordo}`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div style={{ height: barra, flex: "none", display: "flex", alignItems: "center", gap: punto * 0.8, padding: `0 ${barra * 0.4}px` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: punto, height: punto, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            marginLeft: barra * 0.4,
            flex: 1,
            height: barra * 0.58,
            borderRadius: 999,
            background: COLORI.sfondo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: barra * 0.12,
            color: COLORI.tenue,
            fontFamily: CARATTERE,
            fontSize: barra * 0.3,
            fontWeight: 500,
          }}
        >
          <Lucchetto dimensione={barra * 0.28} />
          {dominio}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Schermo src={src} scorri={scorri} />
      </div>
    </div>
  );
}

function Lucchetto({ dimensione }: { dimensione: number }) {
  return (
    <svg width={dimensione} height={dimensione} viewBox="0 0 24 24" fill="none" stroke={COLORI.tenue} strokeWidth={2.4}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Il segno di spunta, la croce o un numero dentro un cerchio. */
export function Icona({ tipo, dimensione, numero }: { tipo: "si" | "no" | "numero"; dimensione: number; numero?: number }) {
  const colore = tipo === "no" ? COLORI.no : COLORI.blu;
  return (
    <div
      style={{
        width: dimensione,
        height: dimensione,
        flex: "none",
        borderRadius: "50%",
        background: tipo === "no" ? "rgba(255, 107, 107, 0.14)" : colore,
        border: tipo === "no" ? `2px solid ${COLORI.no}` : "none",
        boxShadow: tipo === "no" ? "none" : `0 0 ${dimensione * 0.5}px rgba(17, 109, 255, 0.55)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: CARATTERE,
        fontWeight: 800,
        fontSize: dimensione * 0.48,
      }}
    >
      {tipo === "numero" ? (
        numero
      ) : (
        <svg width={dimensione * 0.5} height={dimensione * 0.5} viewBox="0 0 24 24" fill="none" stroke={tipo === "no" ? COLORI.no : "#fff"} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
          {tipo === "si" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
        </svg>
      )}
    </div>
  );
}
