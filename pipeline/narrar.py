#!/usr/bin/env python3
"""Genera la voz en off escena por escena con la voz clonada y llena durations/words del guion.
Uso: python3 narrar.py guion.json voz_referencia.wav salida_voz.wav
Por escena: TTS -> recortar silencios -> atempo 1.2 -> 0.12 s antes + 0.18 s después.
Subtítulos: faster-whisper small con word_timestamps; si el nº de palabras coincide, usa esos tiempos.
"""
import json, sys, subprocess, os, re
import numpy as np, soundfile as sf, librosa, torchaudio as ta
from voz import load

def ff(*a): subprocess.run(["ffmpeg", "-y", "-v", "error", *a], check=True)

def main():
    gpath, ref, out = sys.argv[1:4]
    g = json.load(open(gpath)); tmp = os.path.splitext(out)[0] + "_parts"; os.makedirs(tmp, exist_ok=True)
    m = load()
    from faster_whisper import WhisperModel
    wm = WhisperModel("small", device="cpu", compute_type="int8")
    durs, words, parts = [], [], []
    for i, s in enumerate(g["scenes"]):
        raw = f"{tmp}/{i}_raw.wav"; fin = f"{tmp}/{i}.wav"
        if not os.path.exists(fin):
            w = m.generate(s["text"], language_id="es", audio_prompt_path=ref,
                           exaggeration=float(os.environ.get("EXAG", 0.55)), cfg_weight=float(os.environ.get("CFG", 0.45)), temperature=float(os.environ.get("TEMP", 0.75)))
            ta.save(raw, w, m.sr)
            ff("-i", raw, "-af",
               "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
               "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
               f"atempo={os.environ.get('TEMPO', '1.2')},adelay=120:all=1,apad=pad_dur={os.environ.get('PAUSA', '0.18')}", "-ar", "24000", "-ac", "1", fin)
        y, sr = librosa.load(fin, sr=16000)
        d = round(len(y) / sr, 3); durs.append(d); parts.append(fin)
        segs, _ = wm.transcribe(y, language="es", word_timestamps=True)
        ws = [x for sg in segs for x in sg.words]
        toks = s["text"].split()
        if len(ws) == len(toks):
            words.append([{"s": round(x.start, 3), "e": round(x.end, 3)} for x in ws])
        else:
            print(f"escena {s['id']}: whisper {len(ws)} vs guion {len(toks)} palabras -> reparto proporcional")
            words.append(None)
        print(s["id"], d, "s", flush=True)
    g["durations"] = durs; g["words"] = words
    json.dump(g, open(gpath, "w"), ensure_ascii=False, indent=1)
    lst = f"{tmp}/list.txt"; open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
    ff("-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", out)
    print("TOTAL", round(sum(durs), 2), "s")

if __name__ == "__main__": main()
