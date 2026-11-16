#!/usr/bin/env python3
"""Portada uniforme para videos v2 (misma plantilla que cover.py: fondo del video desenfocado + tarjeta blanca + etiqueta).
Uso: python3 portada3d.py guion.json salida.jpg --title "Línea 1|Línea 2|Línea 3" --tipo tip|promo [--t 3.0] [--num 12]
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render3d import timeline, servidor, abrir
from playwright.sync_api import sync_playwright

def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

def main():
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    title = arg("--title", "").split("|"); tipo = arg("--tipo", "tip"); t = float(arg("--t", "3.0")); num = arg("--num")
    if not sc.get("durations"): sc["durations"] = [max(2.2, len(s["text"].split()) * .36 + .5) for s in sc["scenes"]]
    spec = dict(sc); spec["timeline"] = timeline(sc)
    tag, tagbg, tagfg = ("DATO CURIOSO", "#f2c14e", "#2b2350") if tipo == "tip" else ("ECOVITAL", "#2e7d46", "#ffffff")
    if num: tag += f"  #{num}"
    srv = servidor()
    with sync_playwright() as p:
        br, pg = abrir(p, spec, srv.server_address[1])
        pg.evaluate(f"window.renderAt({t})")
        pg.evaluate("""([title, tag, tagbg, tagfg]) => {
          document.querySelectorAll('.capa,.caps,.pasos,.marca').forEach(e=>e.style.display='none');
          document.getElementById('gl').style.filter='blur(8px) saturate(1.15) brightness(.85)';
          const box=document.createElement('div'); document.getElementById('ov').appendChild(box);
          box.style.cssText='position:absolute;left:70px;width:940px;top:50%;transform:translateY(-50%);background:#fff;border-radius:56px;box-shadow:0 30px 80px rgba(0,0,0,.45);padding:90px 40px 70px;box-sizing:border-box;text-align:center;border-bottom:26px solid '+tagbg;
          const tg=document.createElement('div'); tg.textContent=tag; tg.style.cssText='position:absolute;left:50%;top:-48px;transform:translateX(-50%);background:'+tagbg+';color:'+tagfg+';font:700 46px P;letter-spacing:4px;padding:20px 44px;border-radius:48px;white-space:nowrap';
          box.appendChild(tg);
          title.forEach(l=>{const d=document.createElement('div'); d.textContent=l; d.style.cssText='font:800 112px/1.12 P;color:#1d1a2e;white-space:nowrap'; box.appendChild(d); let fs=112; while(d.scrollWidth>860&&fs>60){fs-=4; d.style.fontSize=fs+'px';}});
        }""", [title, tag, tagbg, tagfg])
        pg.wait_for_timeout(150); pg.screenshot(path=out, type="jpeg", quality=92); br.close()
    print("portada", out)

if __name__ == "__main__": main()
