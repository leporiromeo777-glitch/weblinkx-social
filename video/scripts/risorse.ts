/**
 * Cose comuni a scripts/social.ts e scripts/reel.ts: le foto dei siti dei
 * clienti in public/siti/ e le misure dei file audio (servono ffmpeg e ffprobe).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Copia in public/siti/ le foto dei siti (risorse/siti/, le fa `npm run catture` nella cartella principale). */
export function copiaSiti(video: string) {
  mkdirSync(join(video, "public"), { recursive: true });
  cpSync(join(video, "..", "risorse", "siti"), join(video, "public", "siti"), { recursive: true });
}

export function ffprobe(file: string, ...argomenti: string[]): string {
  return execFileSync("ffprobe", ["-v", "error", ...argomenti, "-of", "csv=p=0", file], { encoding: "utf8" }).trim();
}

/** La durata di un file audio o video, in secondi. */
export function durataSecondi(file: string): number {
  return Number(ffprobe(file, "-show_entries", "format=duration"));
}

/** Le pause di una voce ([inizio, fine] in secondi), con silencedetect di ffmpeg. */
export function pauseVoce(file: string, soglia = "-30dB", minima = 0.08): [number, number][] {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", `silencedetect=noise=${soglia}:d=${minima}`, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const inizi = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const fini = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return inizi.map((a, i): [number, number] => [a, fini[i] ?? a]);
}
