"""
La musica e gli effetti del video dei social (src/Reel.tsx), fatti qui con
un po' di sintesi: niente file presi da fuori, niente diritti.

    python3 audio-reel.py suoni.json uscita.wav

suoni.json lo scrive scripts/reel.ts:
{"fps": 30, "fotogrammi": 560, "seme": "id-del-post", "voce": true,
 "suoni": [{"tipo": "punto", "fotogramma": 140, "indice": 0}, ...]}

Il sottofondo è un groove elettronico morbido in La minore a 110 battiti al
minuto (La minore, Fa, Do, Sol): un arpeggio di plettri sintetici, un
tappeto di accordi, un basso tondo e un charleston leggero; sopra, gli
effetti a tempo con le animazioni (vedi suoniReel in src/tempi-reel.ts).
WAV a 48 kHz, stereo, 16 bit.
"""

import json
import sys
import wave
import zlib

import numpy as np

SR = 48_000
BATTITO = 60 / 110
OTTAVO = BATTITO / 2
SEDICESIMO = BATTITO / 4
# La minore, Fa, Do, Sol: un accordo per battuta (4 battiti), note MIDI.
ACCORDI = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]]
BASSI = [45, 41, 36, 43]
# Le note dell'arpeggio in ogni battuta (indici nell'accordo), un ottavo ciascuna.
ARPEGGIO = [0, 1, 2, 3, 2, 1, 3, 2]
# La minore pentatonica in alto, per le scintille.
PENTATONICA = [81, 84, 86, 88, 91, 93]


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def tempo(durata: float) -> np.ndarray:
    return np.arange(int(durata * SR)) / SR




def plettro(freq: float, durata: float = 0.6, forza: float = 1.0) -> np.ndarray:
    """Un plettro sintetico: due onde un po' scordate, brillanti all'attacco e poi morbide."""
    t = tempo(durata)
    s = 0.0
    for scordo, pan in ((-0.004, 1.0), (0.004, 1.0)):
        f = freq * (1 + scordo)
        s = s + np.sin(2 * np.pi * f * t) + 0.45 * np.exp(-t * 18) * np.sin(4 * np.pi * f * t) + 0.18 * np.exp(-t * 30) * np.sin(6 * np.pi * f * t)
    return forza * 0.5 * s * np.exp(-t * 6.5) * np.minimum(1, t / 0.004)


def tappeto(frequenze: list, durata: float) -> np.ndarray:
    """Un accordo lungo e morbido che entra e esce piano."""
    t = tempo(durata)
    s = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t + 0.5) for f in frequenze)
    inviluppo = np.minimum(1, t / 0.6) * np.clip((durata - t) / 0.6, 0, 1)
    return s * inviluppo / len(frequenze)


def charleston(rng: np.random.Generator, durata: float = 0.05) -> np.ndarray:
    rumore = np.diff(np.diff(rng.standard_normal(int(durata * SR) + 2)))
    return rumore * np.exp(-tempo(durata) * 90)


def basso(freq: float, durata: float = 1.1) -> np.ndarray:
    t = tempo(durata)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return s * np.exp(-2.8 * t) * np.minimum(1, t / 0.01)




def soffio(rng: np.random.Generator, durata: float = 0.42) -> np.ndarray:
    """Un soffio che sale e scende: rumore filtrato con il taglio che si sposta."""
    n = int(durata * SR)
    rumore = rng.standard_normal(n)
    t = tempo(durata) / durata
    taglio = 300 + 2600 * np.sin(np.pi * t) ** 2
    a = np.exp(-2 * np.pi * taglio / SR)
    uscita = np.empty(n)
    y = 0.0
    for i in range(n):
        y = a[i] * y + (1 - a[i]) * rumore[i]
        uscita[i] = y
    return 2.2 * uscita * np.sin(np.pi * t) ** 2


def pop(freq: float) -> np.ndarray:
    """Il «pop» di un punto che compare: una goccia che sale di tono."""
    t = tempo(0.14)
    f = freq * (0.75 + 0.55 * np.minimum(1, t / 0.045))
    fase = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(fase) + 0.2 * np.sin(2 * fase)) * np.exp(-t * 30) * np.minimum(1, t / 0.002)


def tic(freq: float) -> np.ndarray:
    t = tempo(0.035)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 140)


def campana(freq: float) -> np.ndarray:
    t = tempo(1.6)
    parziali = [(1.0, 1.0, 1.6), (2.76, 0.45, 2.8), (5.4, 0.2, 4.5), (8.9, 0.08, 7.0)]
    s = sum(a * np.exp(-d * t) * np.sin(2 * np.pi * freq * r * t) for r, a, d in parziali)
    return s * np.minimum(1, t / 0.002)


def scintilla(rng: np.random.Generator) -> np.ndarray:
    """Cinque tintinnii alti, in disordine, nell'arco di un quarto di secondo."""
    suono = np.zeros(int(0.5 * SR))
    for k in range(5):
        inizio = int((k * 0.05 + rng.uniform(0, 0.02)) * SR)
        t = tempo(0.2)
        f = hz(rng.choice(PENTATONICA))
        blip = np.sin(2 * np.pi * f * t) * np.exp(-t * 22) * (0.8 - 0.1 * k)
        suono[inizio : inizio + len(blip)] += blip[: len(suono) - inizio]
    return suono




class Mixer:
    def __init__(self, campioni: int):
        self.canali = np.zeros((2, campioni))

    def metti(self, suono: np.ndarray, secondi: float, volume: float, pan: float = 0.5):
        """Aggiunge `suono` a `secondi`; pan 0 tutto a sinistra, 1 tutto a destra."""
        inizio = int(secondi * SR)
        if inizio >= self.canali.shape[1]:
            return
        # Gli ultimi 8 ms sfumano: un suono tagliato di colpo fa un «clic».
        suono = suono.copy()
        coda = min(len(suono), int(0.008 * SR))
        suono[len(suono) - coda :] *= np.linspace(1, 0, coda)
        fine = min(self.canali.shape[1], inizio + len(suono))
        parte = suono[: fine - inizio] * volume
        self.canali[0, inizio:fine] += parte * np.sqrt(1 - pan)
        self.canali[1, inizio:fine] += parte * np.sqrt(pan)


def musica(mixer: Mixer, durata: float, rng: np.random.Generator):
    battuta = 0
    while battuta * 4 * BATTITO < durata:
        accordo = ACCORDI[battuta % 4]
        inizio = battuta * 4 * BATTITO
        mixer.metti(tappeto([hz(n) for n in accordo[:3]], 4 * BATTITO + 0.3), inizio, 0.10, 0.5)
        for k, indice in enumerate(ARPEGGIO):
            forte = 0.8 if k in (0, 4) else 0.55
            mixer.metti(plettro(hz(accordo[indice] + 12), 0.5, forte), inizio + k * OTTAVO, 0.26, 0.3 if k % 2 else 0.7)
        for k in range(16):
            mixer.metti(charleston(rng), inizio + k * SEDICESIMO, 0.05 if k % 2 else 0.08, 0.62)
        for b in (0, 1.5, 2, 3.5):
            mixer.metti(basso(hz(BASSI[battuta % 4]), 0.7), inizio + b * BATTITO, 0.15 if b in (0, 2) else 0.09)
        battuta += 1


# Gli effetti stanno sotto la musica: un accento, non un rumore sopra la voce.
EFFETTI = 0.3


def effetti(mixer: Mixer, suoni: list, fps: float, rng: np.random.Generator):
    for s in suoni:
        quando = s["fotogramma"] / fps
        tipo = s["tipo"]
        if tipo == "passaggio":
            mixer.metti(soffio(rng), quando, 0.22 * EFFETTI)
        elif tipo == "punto":
            # La, Do, Mi, La: la nota sale a ogni punto.
            mixer.metti(pop(hz([69, 72, 76, 81][s.get("indice", 0) % 4])), quando, 0.55 * EFFETTI)
        elif tipo == "scintilla":
            mixer.metti(scintilla(rng), quando, 0.18 * EFFETTI, rng.uniform(0.3, 0.7))
        elif tipo == "conta":
            fotogrammi = s.get("durata", 30)
            for k in range(0, fotogrammi, 3):
                mixer.metti(tic(1200 + 900 * k / fotogrammi), quando + k / fps, 0.3 * EFFETTI)
        elif tipo == "cifra":
            mixer.metti(campana(hz(84)), quando, 0.4 * EFFETTI)
        elif tipo == "festa":
            for k, nota in enumerate([69, 72, 76, 81]):
                mixer.metti(plettro(hz(nota + 12), 0.9, 0.9), quando + k * 0.07, 0.4 * EFFETTI, 0.3 + 0.13 * k)
            mixer.metti(scintilla(rng), quando + 0.28, 0.18 * EFFETTI)


def main():
    dati = json.load(open(sys.argv[1], encoding="utf-8"))
    fps = dati["fps"]
    durata = dati["fotogrammi"] / fps
    rng = np.random.default_rng(zlib.crc32(dati.get("seme", "weblinkx").encode()))
    mixer = Mixer(int(durata * SR))
    musica(mixer, durata, rng)
    # Entrata morbida e chiusura sfumata della musica, prima degli effetti.
    t = np.arange(mixer.canali.shape[1]) / SR
    mixer.canali *= np.minimum(1, t / 0.4) * np.clip((durata - t) / 1.5, 0, 1)
    effetti(mixer, dati["suoni"], fps, rng)

    # Volume: valore efficace a -20 dBFS (circa -14 LUFS, come vogliono i
    # social), poi un limitatore morbido per i picchi. Sotto la voce
    # tutto 9 dB più basso, perché la voce si capisca bene.
    uscita = mixer.canali
    efficace = np.sqrt(np.mean(uscita**2)) or 1.0
    obiettivo = -29 if dati.get("voce") else -20
    uscita = np.tanh(uscita * (10 ** (obiettivo / 20) / efficace) * 1.1) / np.tanh(1.1)
    uscita *= np.minimum(1, (durata - t) / 0.05).clip(0, 1)
    pcm = (np.clip(uscita, -1, 1) * 32_000).astype("<i2").T.reshape(-1)
    with wave.open(sys.argv[2], "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
