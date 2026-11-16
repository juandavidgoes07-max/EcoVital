#!/usr/bin/env python3
"""Portada fija para cada video (1080x1920 JPG), con estilo uniforme para que el perfil se vea ordenado.
Uso: python3 cover.py guion.json salida.jpg --title "Texto grande|segunda línea" --tipo tip|promo [--t 2.0] [--num 12]
- Fondo: un cuadro del propio video (escena en el segundo --t, sin subtítulos) oscurecido.
- Centro (zona segura de la cuadrícula 3:4 de Instagram, y 240–1680): etiqueta de serie + título grande.
- Tip = etiqueta amarilla "DATO CURIOSO"; promo = etiqueta verde "ECOVITAL".
"""
import json, sys, os
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import build_spec, open_page

def arg(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

def main():
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    title = arg("--title", "").split("|"); tipo = arg("--tipo", "tip"); t = float(arg("--t", "2.0")); num = arg("--num")
    spec = build_spec(sc)
    tag, tagbg, tagfg = ("DATO CURIOSO", "#f2c14e", "#2b2350") if tipo == "tip" else ("ECOVITAL", "#2e7d46", "#ffffff")
    if num: tag += f"  #{num}"
    with sync_playwright() as p:
        br, pg = open_page(p, spec)
        pg.evaluate(f"window.renderAt({t})")
        pg.evaluate("""([title, tag, tagbg, tagfg]) => {
          const NS='http://www.w3.org/2000/svg', v=document.getElementById('v');
          document.getElementById('caps').innerHTML=''; document.getElementById('flash').setAttribute('opacity',0);
          const mk=(n,a,par)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);(par||v).appendChild(e);return e;};
          for(const g of v.children){if(g.tagName==='g'&&/^s[0-9]+$/.test(g.id)&&g.getAttribute('display')!=='none')g.style.filter='blur(7px) saturate(1.15)';}
          mk('rect',{width:1080,height:1920,fill:'#0d0b1a',opacity:.25});
          const g=mk('g',{});
          const lh=132, n=title.length, h=n*lh+120, y0=960-h/2;
          mk('rect',{x:70,y:y0,width:940,height:h,rx:56,fill:'#ffffff',filter:'url(#sh)'},g);
          mk('rect',{x:70,y:y0+h-26,width:940,height:26,rx:13,fill:tagbg},g);
          const tw=tag.length*30+80;
          mk('rect',{x:540-tw/2,y:y0-50,width:tw,height:96,rx:48,fill:tagbg},g);
          const tt=mk('text',{x:540,y:y0+16,'text-anchor':'middle','font-size':46,fill:tagfg,class:'lbl','letter-spacing':4},g);tt.textContent=tag;
          title.forEach((ln,i)=>{const e=mk('text',{x:540,y:y0+60+lh*(i+1)-28,'text-anchor':'middle','font-size':112,fill:'#1d1a2e',class:'lbl'},g);e.textContent=ln;
            let fs=112;while(e.getComputedTextLength()>860&&fs>60){fs-=4;e.setAttribute('font-size',fs);}});
        }""", [title, tag, tagbg, tagfg])
        pg.wait_for_timeout(100)
        pg.screenshot(path=out, type="jpeg", quality=92)
        br.close()

if __name__ == "__main__": main()
