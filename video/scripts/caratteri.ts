import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileCaratteri } from "../src/caratteri";

/** Scarica in public/fonts/ il carattere del sito (Inter), una volta sola. */
export function scaricaCaratteri(video: string) {
  for (const c of fileCaratteri()) {
    const file = join(video, "public", c.file);
    if (existsSync(file)) continue;
    mkdirSync(dirname(file), { recursive: true });
    execFileSync("curl", ["-sSfL", "-o", file, c.url], { stdio: "inherit" });
  }
}
