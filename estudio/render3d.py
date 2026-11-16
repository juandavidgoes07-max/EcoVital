#!/usr/bin/env python3
"""EcoVital Estudio v2 — render 3D (three.js en Chrome headless + ffmpeg).
Uso:
  python3 render3d.py guion.json salida.mp4 --voice voz.wav        # video final
  python3 render3d.py guion.json salida --preview 0.5,3,7.2        # capturas salida_prev0.png ...
Guion v2 (ver FORMATO_V2.md): {"formato":"v2","tipo":"promo|tip","paleta":"bosque|lila|noche|menta|terracota|arena",
  "pasos":0..6,"marca":true|false,"resaltar":[palabras],"custom":"código JS opcional (usa API)",
  "scenes":[{"id","text","plantilla","p":{...},"paso":n,"paleta":opcional}], "durations":[...], "words":[...]}
"""
import json, sys, os, re, subprocess, wave, threading, functools, time
import numpy as np
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); FPS = 30

def timeline(sc):
    scenes, words, chunks = [], [], []; t = 0.0
    for si, (s, dur) in enumerate(zip(sc["scenes"], sc["durations"])):
        scenes.append({"id": s["id"], "start": round(t, 3), "d": round(dur, 3)})
        toks = s["text"].split(); real = (sc.get("words") or [None] * 99)[si] if si < len(sc.get("words") or []) else None
        if real and len(real) == len(toks):
            times = [(t + w["s"], t + w["e"]) for w in real]
        else:
            wts = [len(re.sub(r"[^\wáéíóúñü]", "", w, flags=re.I)) + 2 for w in toks]
            a, b = t + 0.15, t + dur - 0.25; tot = sum(wts); acc = a; times = []
            for wt in wts: d = (b - a) * wt / tot; times.append((acc, acc + d)); acc += d
        cur0 = len(words)
        for i, (w, (ws, we)) in enumerate(zip(toks, times)):
            words.append({"w": w, "s": round(ws, 3), "e": round(we, 3)}); idx = len(words) - 1; n_in = idx - cur0 + 1
            if (re.search(r"[,.:;!?]$", w) and n_in >= 2) or n_in >= 4 or i == len(toks) - 1:
                chunks.append([cur0, idx]); cur0 = idx + 1
        t += dur
    return {"scenes": scenes, "words": words, "chunks": chunks, "duration": round(t, 3)}

# ---------- audio ----------
def musica(dur, sr=44100, seed=3):
    """Base electrónica suave (sub-bajo + pads + hi-hats) a 100 BPM, con caída en el último segundo."""
    t = np.arange(int(dur * sr)) / sr; sig = np.zeros_like(t); bpm = 100; beat = 60 / bpm
    prog = [(110.0, 164.81, 220.0, 261.63), (87.31, 130.81, 174.61, 220.0), (130.81, 196.0, 261.63, 329.63), (98.0, 146.83, 196.0, 246.94)]
    bar = beat * 4
    for i in range(int(dur / bar) + 2):
        c = prog[i % 4]; a, b = i * bar, i * bar + bar; m = (t >= a) & (t < b)
        if not m.any(): continue
        tt = t[m] - a; env = np.minimum(1, tt / .3) * np.minimum(1, (b - t[m]) / .3)
        for k, fq in enumerate(c[1:]): sig[m] += .22 * env * np.sin(2 * np.pi * fq * tt + np.sin(2 * np.pi * .3 * tt) * .5)
        sig[m] += .5 * env * np.sin(2 * np.pi * c[0] / 2 * tt)
    rng = np.random.default_rng(seed)
    for k, bt in enumerate(np.arange(0, dur, beat / 2)):
        m = (t >= bt) & (t < bt + .05); sig[m] += .12 * rng.standard_normal(m.sum()) * np.exp(-(t[m] - bt) * 90)
        if k % 2 == 0:
            m = (t >= bt) & (t < bt + .3); tt = t[m] - bt; sig[m] += .9 * np.exp(-tt * 18) * np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 35)) * tt)
    return sig * np.clip((dur - t) / 1.2, 0, 1)

def efectos(ev, dur, sr=44100):
    t = np.arange(int(dur * sr)) / sr; sig = np.zeros_like(t); rng = np.random.default_rng(7)
    for e in ev:
        st = max(0, e["t"])
        if e["tipo"] == "whoosh":
            L = .38; m = (t >= st - L / 2) & (t < st + L / 2); tt = t[m] - (st - L / 2); n = rng.standard_normal(m.sum())
            k = np.linspace(.02, .35, m.sum()); y = np.zeros_like(n); acc = 0
            for j in range(len(n)): acc += k[j] * (n[j] - acc); y[j] = acc
            sig[m] += 1.4 * y * np.sin(np.pi * tt / L) ** 2
        elif e["tipo"] == "pop":
            m = (t >= st) & (t < st + .15); tt = t[m] - st; sig[m] += .6 * np.exp(-tt * 40) * np.sin(2 * np.pi * (900 - 2500 * tt) * tt)
        elif e["tipo"] == "golpe":
            m = (t >= st) & (t < st + .45); tt = t[m] - st
            sig[m] += 1.1 * np.exp(-tt * 12) * np.sin(2 * np.pi * (70 + 120 * np.exp(-tt * 30)) * tt) + .25 * rng.standard_normal(m.sum()) * np.exp(-tt * 30)
        elif e["tipo"] == "teclas":
            for kk in np.arange(st, st + e.get("d", 1), .11):
                m = (t >= kk) & (t < kk + .03); sig[m] += .35 * rng.standard_normal(m.sum()) * np.exp(-(t[m] - kk) * 200)
    return sig

def wav(path, sig, sr=44100, peak=.8):
    sig = sig / (np.abs(sig).max() + 1e-9) * peak; d = (np.stack([sig, sig], 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(d.tobytes())

# ---------- navegador ----------
def servidor():
    class Q(SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=HERE)
    s = ThreadingHTTPServer(("127.0.0.1", 0), h); threading.Thread(target=s.serve_forever, daemon=True).start(); return s

def abrir(p, spec, port):
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = br.new_page(viewport={"width": 1080, "height": 1920}); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(f"http://127.0.0.1:{port}/estudio.html"); pg.wait_for_function("window.MOD===true")
    pg.evaluate("s=>window.setSpec(s)", spec)
    try: pg.wait_for_function("window.LISTO===true", timeout=60000)
    except Exception: print("ERRORES:", errs); raise
    if errs: print("AVISOS JS:", errs[:5])
    return br, pg

def main():
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    voice = sys.argv[sys.argv.index("--voice") + 1] if "--voice" in sys.argv else None
    if not sc.get("durations"): sc["durations"] = [max(2.2, len(s["text"].split()) * .36 + .5) for s in sc["scenes"]]
    tl = timeline(sc); spec = dict(sc); spec["timeline"] = tl; dur = tl["duration"]
    srv = servidor(); port = srv.server_address[1]
    if "--preview" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
        with sync_playwright() as p:
            br, pg = abrir(p, spec, port)
            for i, tt in enumerate(ts): pg.evaluate(f"window.renderAt({tt})"); pg.screenshot(path=f"{out}_prev{i}.png")
            br.close()
        print("duración", dur); return
    n = int(dur * FPS); t0 = time.time()
    with sync_playwright() as p:
        br, pg = abrir(p, spec, port); ev = pg.evaluate("window.SFX")
        mus, fx = out + ".mus.wav", out + ".fx.wav"; wav(mus, musica(dur)); wav(fx, efectos(ev, dur))
        ins = ["-i", mus, "-i", fx]
        if voice:
            ins += ["-i", voice]
            af = ("[1:a]volume=0.13[m];[2:a]volume=0.32[f];[3:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.6[v];"
                  "[m][f][v]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[a]")
        else:
            af = "[1:a]volume=0.5[m];[2:a]volume=0.5[f];[m][f]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-"] + ins + [
            "-filter_complex", af, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", str(dur), "-movflags", "+faststart", out]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for f in range(n):
            pg.evaluate(f"window.renderAt({f / FPS})"); ff.stdin.write(pg.screenshot(type="jpeg", quality=93))
            if f % 150 == 0: print(f"cuadro {f}/{n} · {time.time() - t0:.0f}s", flush=True)
        br.close()
    ff.stdin.close(); ff.wait(); os.remove(mus); os.remove(fx); print("listo", out, round(dur, 2), "s")

if __name__ == "__main__": main()
