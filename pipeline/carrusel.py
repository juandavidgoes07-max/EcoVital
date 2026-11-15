#!/usr/bin/env python3
"""EcoVital: genera imágenes 1080x1350 (carruseles y publicaciones de una imagen) con el mismo estilo plano de los videos.
Uso: python3 carrusel.py guion.json carpeta_salida      -> carpeta_salida/1.jpg, 2.jpg, ...
guion.json: {"paleta": "verde|lila|amarillo|crema|noche", "marca": false,
  "slides": [
   {"tipo": "portada", "titulo": "...", "sub": "...", "icono": "lemon", "desliza": true},
   {"tipo": "dato", "num": "3", "titulo": "...", "texto": "...", "icono": "grassC"},
   {"tipo": "cierre", "titulo": "...", "texto": "...", "pregunta": "..."}]}
Una publicación de una sola imagen = un guion con 1 slide (tipo portada o dato, "desliza": false).
"marca": true solo en promocionales (muestra @ecovital_7 abajo). En tips va false.
Iconos: leafS lav cham drop apple cupT mela camel grassC corn rice cane lemon mint verbena jarLila jarVerde
(los toma de scene.html; para un tema nuevo se pueden añadir <symbol> en EXTRA).
Entre *asteriscos* el texto sale resaltado."""
import json, sys, os, re, html
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {"verde": ("#cfeccd", "#7cc48a", "#1f5130", "#2e7d46"), "lila": ("#efe4fb", "#b99be0", "#3d2763", "#6b4fb0"),
       "amarillo": ("#fff4c9", "#ffd76a", "#5a3d0a", "#c0392b"), "crema": ("#fdf6e3", "#f1e2c0", "#4b3127", "#2e7d46"),
       "noche": ("#2b2350", "#14112a", "#ffffff", "#f5c22e")}
EXTRA = """
<symbol id="mint" viewBox="-120 -200 240 400"><path d="M0 195 L0 -150" stroke="#4f8a4a" stroke-width="10" stroke-linecap="round"/>
 <g fill="#5fae6b" stroke="#3f8a4f" stroke-width="4"><path d="M0 120 C-40 90 -100 95 -110 60 C-70 40 -30 60 0 120Z"/><path d="M0 120 C40 90 100 95 110 60 C70 40 30 60 0 120Z"/>
 <path d="M0 30 C-36 4 -92 8 -100 -24 C-64 -42 -28 -24 0 30Z"/><path d="M0 30 C36 4 92 8 100 -24 C64 -42 28 -24 0 30Z"/>
 <path d="M0 -60 C-30 -82 -76 -80 -84 -106 C-54 -122 -22 -106 0 -60Z"/><path d="M0 -60 C30 -82 76 -80 84 -106 C54 -122 22 -106 0 -60Z"/>
 <path d="M0 -140 C-18 -160 -16 -186 0 -196 C16 -186 18 -160 0 -140Z"/></g></symbol>
<symbol id="verbena" viewBox="-140 -200 280 400"><path d="M0 195 L0 -160" stroke="#7a6a3a" stroke-width="10" stroke-linecap="round"/>
 <g fill="#8bbf5a" stroke="#5f8f3a" stroke-width="4"><path d="M0 130 C-50 120 -110 80 -132 30 C-80 40 -30 80 0 130Z"/><path d="M0 130 C50 120 110 80 132 30 C80 40 30 80 0 130Z"/>
 <path d="M0 40 C-46 30 -100 -6 -120 -52 C-72 -44 -28 -8 0 40Z"/><path d="M0 40 C46 30 100 -6 120 -52 C72 -44 28 -8 0 40Z"/>
 <path d="M0 -50 C-40 -58 -86 -90 -102 -130 C-60 -124 -24 -92 0 -50Z"/><path d="M0 -50 C40 -58 86 -90 102 -130 C60 -124 24 -92 0 -50Z"/>
 <path d="M0 -130 C-14 -150 -12 -184 0 -198 C12 -184 14 -150 0 -130Z"/></g></symbol>
"""
def defs():
    s = open(os.path.join(HERE, "scene.html"), encoding="utf-8").read()
    out = "".join(re.findall(r"<(?:linear|radial)Gradient.*?</(?:linear|radial)Gradient>", s, flags=re.S))
    out += '<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".3"/></filter>'
    out += "".join(re.findall(r"<symbol.*?</symbol>", s, flags=re.S)) + EXTRA
    m = re.search(r'<g id="jarsvg">(.*?)\n    </g>', s, flags=re.S)
    if m:
        jar = m.group(1)
        out += f'<symbol id="jarLila" viewBox="-250 -240 500 520">{jar}</symbol>'
        v = (jar.replace("#c9b2ea", "#f4fbf4").replace("#a98bd6", "#5fae6b").replace("#3d2763", "#1f5130").replace("#4c3478", "#1f5130")
                .replace("Lavanda y", "Citronela y").replace("Manzanilla", "Árbol de té"))
        out += f'<symbol id="jarVerde" viewBox="-250 -240 500 520">{v}</symbol>'
    return out
def fmt(t, hi): return re.sub(r"\*(.+?)\*", rf'<span style="color:{hi}">\1</span>', html.escape(t or ""))
def icon(name, size):
    return f'<svg width="{size}" height="{size}" style="filter:drop-shadow(0 14px 18px rgba(0,0,0,.18))"><use href="#{name}" width="{size}" height="{size}"/></svg>' if name else ""
def page(sl, i, n, g):
    c0, c1, ink, hi = PAL[g.get("paleta", "crema")]; t = sl.get("tipo", "dato")
    dots = "".join(f'<i style="background:{ink};opacity:{1 if k == i else .25}"></i>' for k in range(n)) if n > 1 else ""
    foot = f'<div class="foot"><div class="dots">{dots}</div>' + (f'<div class="pill" style="color:{ink}">@ecovital_7</div>' if g.get("marca") else "") + \
           (f'<div class="sw" style="background:{ink};color:{c0}">desliza →</div>' if sl.get("desliza", t == "portada" and n > 1) else "") + "</div>"
    if t == "portada":
        body = f'<div class="ico">{icon(sl.get("icono"), 430)}</div><h1 style="color:{ink}">{fmt(sl["titulo"], hi)}</h1><p class="sub" style="color:{ink}">{fmt(sl.get("sub"), hi)}</p>'
    elif t == "cierre":
        body = (f'<h2 style="color:{ink}">{fmt(sl["titulo"], hi)}</h2><div class="card"><p>{fmt(sl.get("texto"), hi)}</p></div>'
                + (f'<div class="q" style="background:{hi}">{fmt(sl["pregunta"], "#fff")}</div>' if sl.get("pregunta") else ""))
    else:
        num = f'<div class="num" style="background:{hi}">{html.escape(str(sl["num"]))}</div>' if sl.get("num") else ""
        body = f'<div class="row">{num}<h2 style="color:{ink}">{fmt(sl["titulo"], hi)}</h2></div><div class="ico">{icon(sl.get("icono"), 400)}</div><div class="card"><p>{fmt(sl.get("texto"), hi)}</p></div>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:P;src:url(file:///usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf)}}
@font-face{{font-family:PR;src:url(file:///usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf)}}
html,body{{margin:0;width:1080px;height:1350px;overflow:hidden}}
body{{background:linear-gradient({c0},{c1});font-family:P,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;box-sizing:border-box;padding:90px 80px 170px;text-align:center}}
h1{{font-size:92px;line-height:1.08;margin:0}} h2{{font-size:76px;line-height:1.1;margin:0}}
.sub{{font-family:PR;font-size:46px;margin:0;opacity:.85}} .ico{{line-height:0}}
.row{{display:flex;align-items:center;gap:30px;justify-content:center}}
.num{{flex:none;width:130px;height:130px;border-radius:50%;color:#fff;font-size:84px;line-height:130px}}
.card{{background:#fff;border-radius:44px;padding:44px 52px;box-shadow:0 14px 34px rgba(0,0,0,.18);max-width:860px}}
.card p{{font-family:PR;font-size:46px;line-height:1.3;margin:0;color:#2b2b2b}}
.q{{color:#fff;font-size:52px;line-height:1.15;border-radius:60px;padding:30px 54px;max-width:860px}}
.foot{{position:absolute;left:0;right:0;bottom:56px;display:flex;align-items:center;justify-content:center;gap:34px}}
.dots{{display:flex;gap:14px}} .dots i{{width:18px;height:18px;border-radius:50%;display:block}}
.pill{{background:rgba(255,255,255,.9);border-radius:40px;padding:12px 30px;font-size:32px}}
.sw{{border-radius:40px;padding:12px 34px;font-size:34px}}
</style></head><body><svg width="0" height="0" style="position:absolute"><defs>{DEFS}</defs></svg>{body}{foot}</body></html>"""
def main():
    global DEFS
    g = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True); DEFS = defs()
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--allow-file-access-from-files"])
        pg = br.new_page(viewport={"width": 1080, "height": 1350}); n = len(g["slides"])
        for i, sl in enumerate(g["slides"]):
            tmp = os.path.join(HERE, "_slide.html"); open(tmp, "w", encoding="utf-8").write(page(sl, i, n, g))
            pg.goto("file://" + tmp); pg.wait_for_timeout(250)
            over = pg.evaluate("document.body.scrollHeight>1350||[...document.querySelectorAll('h1,h2,.card,.q')].some(e=>e.getBoundingClientRect().right>1080||e.getBoundingClientRect().bottom>1180)")
            if over: print(f"AVISO slide {i+1}: el texto no cabe, acórtalo")
            pg.screenshot(path=f"{out}/{i+1}.jpg", type="jpeg", quality=92)
        br.close(); os.remove(tmp)
    print("OK", n, "imágenes en", out)
if __name__ == "__main__": main()
