#!/usr/bin/env python3
"""EcoVital: imágenes 1080x1350 para CARRUSELES y PUBLICACIONES de una imagen.
Estilo EDITORIAL (tipo revista): fondos lisos, letra serif grande, números gigantes, líneas finas.
A propósito es DISTINTO de los videos: aquí NO se usan los dibujos/ilustraciones de scene.html.
Uso: python3 carrusel.py guion.json carpeta_salida      -> carpeta_salida/1.jpg, 2.jpg, ...
guion.json: {"paleta": "bosque|terracota|noche|arena", "marca": false, "etiqueta": "DATO CURIOSO",
  "slides": [
   {"tipo": "portada", "titulo": "Hay un alimento que *nunca se vence*", "sub": "..."},
   {"tipo": "dato", "num": "1", "titulo": "...", "texto": "..."},      (num opcional; puede ser "?" o "✕")
   {"tipo": "frase", "titulo": "Una frase grande sola"},
   {"tipo": "cierre", "titulo": "...", "texto": "...", "pregunta": "¿Tú lo sabías?"}]}
Publicación de una sola imagen = guion con 1 slide (tipo "frase", "dato" o "portada").
"marca": true solo en promocionales (muestra @ecovital_7). En tips va false.
Entre *asteriscos* el texto sale en cursiva y color de acento. Textos cortos: título ≤ 9 palabras, tarjeta ≤ 22."""
import json, sys, os, re, html
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
#          fondo A    tinta A    fondo B    tinta B    acento
PAL = {"bosque": ("#12352b", "#f4ecd8", "#f4ecd8", "#12352b", "#d9a441"),
       "terracota": ("#b5482e", "#fbefe2", "#fbefe2", "#3a1a12", "#e8b04a"),
       "noche": ("#141a33", "#eef0fa", "#eef0fa", "#141a33", "#f08a5d"),
       "arena": ("#efe3cf", "#2b2a26", "#2b2a26", "#efe3cf", "#c0582f")}
def fmt(t, hi): return re.sub(r"\*(.+?)\*", rf'<em style="color:{hi}">\1</em>', html.escape(t or ""))
def page(sl, i, n, g):
    a_bg, a_ink, b_bg, b_ink, hi = PAL[g.get("paleta", "bosque")]; t = sl.get("tipo", "dato")
    inv = (i % 2 == 1) and t != "cierre"; bg, ink = (b_bg, b_ink) if inv else (a_bg, a_ink)
    acc = hi if not inv else {"bosque": "#b07a1c", "terracota": "#b5482e", "noche": "#d0603a", "arena": "#e8a04a"}[g.get("paleta", "bosque")]
    top = f'<div class="top"><span>{html.escape(g.get("etiqueta", "DATO CURIOSO"))}</span><span>{i+1:02d} / {n:02d}</span></div>' if n > 1 else \
          f'<div class="top"><span>{html.escape(g.get("etiqueta", "DATO CURIOSO"))}</span><span></span></div>'
    bot = '<div class="bot"><span>' + ("@ecovital_7" if g.get("marca") else "") + "</span><span>" + ("desliza &rarr;" if n > 1 and i < n - 1 else "") + "</span></div>"
    if t == "portada":
        body = f'<div class="rule" style="background:{acc}"></div><h1>{fmt(sl["titulo"], acc)}</h1>' + (f'<p class="sub">{fmt(sl.get("sub"), acc)}</p>' if sl.get("sub") else "")
    elif t == "frase":
        body = f'<div class="quote" style="color:{acc}">&ldquo;</div><h1 class="mid">{fmt(sl["titulo"], acc)}</h1>' + (f'<p class="sub">{fmt(sl.get("sub"), acc)}</p>' if sl.get("sub") else "")
    elif t == "cierre":
        body = (f'<h2>{fmt(sl["titulo"], acc)}</h2>' + (f'<p class="txt">{fmt(sl.get("texto"), acc)}</p>' if sl.get("texto") else "")
                + (f'<div class="q" style="border-color:{acc};color:{acc}">{html.escape(sl["pregunta"])}</div>' if sl.get("pregunta") else ""))
    else:
        num = f'<div class="num" style="color:{acc}">{html.escape(str(sl["num"]))}</div>' if sl.get("num") else f'<div class="rule" style="background:{acc}"></div>'
        body = f'{num}<h2>{fmt(sl["titulo"], acc)}</h2><p class="txt">{fmt(sl.get("texto"), acc)}</p>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:L;src:url(file:///usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf);font-weight:400 700}}
@font-face{{font-family:L;font-style:italic;src:url(file:///usr/share/fonts/truetype/google-fonts/Lora-Italic-Variable.ttf);font-weight:400 700}}
@font-face{{font-family:PR;src:url(file:///usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf)}}
html,body{{margin:0;width:1080px;height:1350px;overflow:hidden}}
body{{background:{bg};color:{ink};font-family:L,Georgia,serif;box-sizing:border-box;padding:0 96px;display:flex;flex-direction:column;justify-content:center;gap:40px}}
.top,.bot{{position:absolute;left:96px;right:96px;display:flex;justify-content:space-between;font-family:PR,Arial,sans-serif;font-size:28px;letter-spacing:5px;text-transform:uppercase;opacity:.75}}
.top{{top:84px;padding-bottom:26px;border-bottom:2px solid {ink}}} .bot{{bottom:80px;text-transform:none;letter-spacing:2px;font-size:30px}}
h1{{font-size:112px;line-height:1.04;font-weight:700;margin:0;letter-spacing:-1px}} h1.mid{{font-size:96px}}
h2{{font-size:84px;line-height:1.06;font-weight:700;margin:0}}
em{{font-style:italic}}
.sub{{font-family:PR,Arial,sans-serif;font-size:40px;line-height:1.3;margin:0;opacity:.8}}
.txt{{font-family:PR,Arial,sans-serif;font-size:46px;line-height:1.36;margin:0;opacity:.92}}
.rule{{width:150px;height:10px}}
.num{{font-size:300px;line-height:.8;font-weight:700;font-style:italic;margin-bottom:10px}}
.quote{{font-size:300px;line-height:.5;height:110px}}
.q{{align-self:flex-start;border:4px solid;border-radius:70px;padding:26px 50px;font-family:PR,Arial,sans-serif;font-size:46px;margin-top:10px}}
</style></head><body>{top}{body}{bot}</body></html>"""
def main():
    g = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--allow-file-access-from-files"])
        pg = br.new_page(viewport={"width": 1080, "height": 1350}); n = len(g["slides"])
        for i, sl in enumerate(g["slides"]):
            tmp = os.path.join(HERE, "_slide.html"); open(tmp, "w", encoding="utf-8").write(page(sl, i, n, g))
            pg.goto("file://" + tmp); pg.wait_for_timeout(300)
            over = pg.evaluate("[...document.querySelectorAll('h1,h2,.txt,.sub,.q,.num,.quote')].some(e=>{const r=e.getBoundingClientRect();return r.right>1000||r.bottom>1230||r.top<170})")
            if over: print(f"AVISO slide {i+1}: el texto no cabe, acórtalo")
            pg.screenshot(path=f"{out}/{i+1}.jpg", type="jpeg", quality=93)
        br.close(); os.remove(tmp)
    print("OK", n, "imágenes en", out)
if __name__ == "__main__": main()
