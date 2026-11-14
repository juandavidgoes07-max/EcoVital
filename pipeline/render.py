#!/usr/bin/env python3
"""EcoVital explainer render (1080x1920): HTML/SVG + headless Chrome + ffmpeg.
Usage: python3 render.py script.json out.mp4 [--voice voz.wav] [--preview t1,t2,...]
script.json: {"jar": path|null, "scenes":[{"id","text"}], "durations":[...],
              "words":[[{"s":rel_start,"e":rel_end}, ...] per scene] (opcional: tiempos reales relativos al inicio de cada escena)}
"""
import json, sys, os, re, subprocess, wave, base64
import numpy as np
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); FPS = 30

def build_spec(sc):
    scenes, words, chunks = [], [], []; t = 0.0
    for si, (s, dur) in enumerate(zip(sc["scenes"], sc["durations"])):
        scenes.append({"id": s["id"], "start": round(t, 3)})
        toks = s["text"].split(); real = (sc.get("words") or [None]*99)[si]
        if real and len(real) == len(toks):
            times = [(t + w["s"], t + w["e"]) for w in real]
        else:
            weights = [len(re.sub(r"[^\wáéíóúñü]", "", w, flags=re.I)) + 2 for w in toks]
            a, b = t + 0.2, t + dur - 0.3; tot = sum(weights); acc = a; times = []
            for wt in weights: d = (b - a) * wt / tot; times.append((acc, acc + d)); acc += d
        cur0 = len(words)
        for i, (w, (ws, we)) in enumerate(zip(toks, times)):
            words.append({"w": w, "s": round(ws, 3), "e": round(we, 3)}); idx = len(words) - 1
            n_in = idx - cur0 + 1
            if (re.search(r"[,.:;!?]$", w) and n_in >= 3) or n_in >= 5 or i == len(toks) - 1:
                chunks.append([cur0, idx]); cur0 = idx + 1
        t += dur
    return {"scenes": scenes, "words": words, "chunks": chunks, "duration": round(t, 3), "capY": 330}

def pad_music(dur, sr=44100):
    t = np.arange(int(dur * sr)) / sr
    chords = [(261.63, 329.63, 392.0), (220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (196.0, 246.94, 293.66)]
    sig = np.zeros_like(t); seg = 2.0
    for i in range(int(dur / seg) + 2):
        c = chords[i % 4]; a, b = i * seg, i * seg + seg * 1.25; m = (t >= a) & (t < b)
        if not m.any(): continue
        env = np.sin(np.pi * (t[m] - a) / (b - a)) ** 2
        for fq in c: sig[m] += 0.5 * env * (np.sin(2 * np.pi * fq * t[m]) + 0.25 * np.sin(4 * np.pi * fq * t[m]))
    beat = 60 / 112
    for k, bt in enumerate(np.arange(0, dur, beat)):
        m = (t >= bt) & (t < bt + 0.25); tt = t[m] - bt
        sig[m] += 1.2 * np.exp(-tt * 30) * np.sin(2 * np.pi * (60 + 80 * np.exp(-tt * 40)) * tt)
        if k % 2 == 1:
            m2 = (t >= bt) & (t < bt + 0.08); n = np.random.default_rng(k).standard_normal(m2.sum())
            sig[m2] += 0.25 * n * np.exp(-(t[m2] - bt) * 60)
        notes = [523.25, 659.25, 783.99, 659.25]; m3 = (t >= bt) & (t < bt + 0.35); tt = t[m3] - bt
        sig[m3] += 0.35 * np.exp(-tt * 10) * np.sin(2 * np.pi * notes[k % 4] * tt)
    fade = np.clip((dur - t) / 1.0, 0, 1); return sig * fade

def sfx(spec, dur, sr=44100):
    t = np.arange(int(dur * sr)) / sr; sig = np.zeros_like(t); rng = np.random.default_rng(7)
    for i, s in enumerate(spec["scenes"]):
        if i == 0: continue
        st = max(0, s["start"] - 0.2); m = (t >= st) & (t < st + 0.4); tt = t[m] - st
        n = rng.standard_normal(m.sum()); env = np.sin(np.pi * tt / 0.4) ** 2
        out = np.zeros_like(n); y = 0
        for j, x in enumerate(n): a = 0.02 + 0.25 * (j / len(n)); y += a * (x - y); out[j] = y
        sig[m] += 1.6 * out * env
    return sig

def write_wav(path, sig, sr=44100):
    sig = sig / (np.abs(sig).max() + 1e-9) * 0.8
    data = (np.stack([sig, sig], 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(data.tobytes())

def open_page(p, spec):
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--allow-file-access-from-files"])
    pg = br.new_page(viewport={"width": 1080, "height": 1920})
    pg.goto("file://" + os.path.join(HERE, "scene.html")); pg.evaluate("s=>window.setSpec(s)", spec); pg.wait_for_timeout(300)
    return br, pg

def main():
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    voice = sys.argv[sys.argv.index("--voice") + 1] if "--voice" in sys.argv else None
    spec = build_spec(sc)
    if sc.get("jar"): spec["jar"] = "data:image/png;base64," + base64.b64encode(open(sc["jar"], "rb").read()).decode()
    if "--preview" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
        with sync_playwright() as p:
            br, pg = open_page(p, spec)
            for i, tt in enumerate(ts): pg.evaluate(f"window.renderAt({tt})"); pg.screenshot(path=f"{out}_prev{i}.png")
            br.close()
        return
    dur = spec["duration"]; n = int(dur * FPS)
    mus = out + ".mus.wav"; fx = out + ".fx.wav"; write_wav(mus, pad_music(dur)); write_wav(fx, sfx(spec, dur))
    inputs = ["-i", mus, "-i", fx]
    if voice:
        inputs += ["-i", voice]
        af = ("[1:a]volume=0.16[m];[2:a]volume=0.35[f];[3:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.6[v];"
              "[m][f][v]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[a]")
    else:
        af = "[1:a]volume=0.55[m];[2:a]volume=0.6[f];[m][f]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-"] + inputs + [
        "-filter_complex", af, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", str(dur), "-movflags", "+faststart", out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with sync_playwright() as p:
        br, pg = open_page(p, spec)
        for f in range(n): pg.evaluate(f"window.renderAt({f / FPS})"); ff.stdin.write(pg.screenshot(type="png"))
        br.close()
    ff.stdin.close(); ff.wait(); os.remove(mus); os.remove(fx)

if __name__ == "__main__": main()
