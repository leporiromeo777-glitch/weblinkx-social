/**
 * Impostazioni di Remotion per `npx remotion render` e `npx remotion studio`.
 * Il video finale: H.264, qualità CRF 23, audio AAC leggero (è solo voce).
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(23);
Config.setX264Preset("slow");
Config.setAudioBitrate("96k");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);

// Se Remotion non riesce a scaricare il suo browser, si può usare un Chromium
// già installato: REMOTION_BROWSER=/percorso/di/chrome npm run render -- …
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
