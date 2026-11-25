// EcoVital Estudio v2 — motor 3D (three.js) + capa de edición (subtítulos con caja, etiquetas, contador, stickers).
// Cada escena del guion usa una "plantilla" con parámetros "p". Ver PLANTILLAS al final y FORMATO_V2.md.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export const W = 1080, H = 1920;
const canvas = document.getElementById('gl');
export const R = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H, false); R.setPixelRatio(1);
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
R.outputColorSpace = THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(R);
export const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
let FONT3D = null;

// ---------- utilidades ----------
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const eout = k => { k = clamp(k); return 1 - Math.pow(1 - k, 3); };
export const back = k => { k = clamp(k); const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const elastic = k => { k = clamp(k); if (k === 0 || k === 1) return k; return Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1; };
export const win = (t, a, b) => clamp((t - a) / (b - a));
const col = c => new THREE.Color(c);

export const PALETAS = {
  bosque:   { bg: '#0d1712', piso: '#13221a', acento: '#9be15d', acento2: '#f7c948', luz: '#fff4e0', rim: '#9be15d', texto: '#ffffff' },
  lila:     { bg: '#140f1f', piso: '#1d1630', acento: '#b98cff', acento2: '#ffd36e', luz: '#fff1f8', rim: '#b98cff', texto: '#ffffff' },
  noche:    { bg: '#0b0f1c', piso: '#121a2e', acento: '#ff8a3d', acento2: '#7fd1ff', luz: '#ffe9d2', rim: '#ff8a3d', texto: '#ffffff' },
  menta:    { bg: '#0b1716', piso: '#10221f', acento: '#3ee6b3', acento2: '#ffffff', luz: '#f0fffb', rim: '#3ee6b3', texto: '#ffffff' },
  terracota:{ bg: '#1a0f0b', piso: '#26160f', acento: '#ff7a4a', acento2: '#ffd9a8', luz: '#fff0e6', rim: '#ff7a4a', texto: '#ffffff' },
  arena:    { bg: '#1b1710', piso: '#262014', acento: '#f2c14e', acento2: '#9be15d', luz: '#fff8e8', rim: '#f2c14e', texto: '#ffffff' },
};
export let PAL = PALETAS.bosque;
export function setPaleta(n) { PAL = PALETAS[n] || PALETAS.bosque; document.documentElement.style.setProperty('--acento', PAL.acento); document.documentElement.style.setProperty('--acento2', PAL.acento2); }

// texturas de canvas
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g, draw };
  return t;
}
export function redraw(tex, ...args) { const { c, g, draw } = tex.userData; g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height, ...args); tex.needsUpdate = true; }
const glowTex = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
export function glow(color, size, op = 0.7) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(color), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// materiales
export const M = {
  std: (c, r = .55, m = 0, e = null) => new THREE.MeshStandardMaterial({ color: col(c), roughness: r, metalness: m, envMap: ENV, envMapIntensity: .8, ...(e ? { emissive: col(e), emissiveIntensity: .6 } : {}) }),
  oro: () => new THREE.MeshStandardMaterial({ color: col('#e8b84a'), roughness: .22, metalness: 1, envMap: ENV, envMapIntensity: 1.4 }),
  vidrio: () => new THREE.MeshPhysicalMaterial({ color: col('#ffffff'), roughness: .04, metalness: 0, transparent: true, opacity: .32, envMap: ENV, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide, depthWrite: false }),
  neon: c => new THREE.MeshBasicMaterial({ color: col(c) }),
  piel: c => new THREE.MeshStandardMaterial({ color: col(c), roughness: .62, metalness: 0, envMap: ENV, envMapIntensity: .5 }),
};
export const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
export const rbox = (w, h, d, r = .08) => new RoundedBoxGeometry(w, h, d, 4, r);

// ---------- estudio (fondo + piso + luces) ----------
export function estudio(opts = {}) {
  const sc = new THREE.Scene(); const bg = opts.bg || PAL.bg;
  sc.background = col(bg); sc.fog = new THREE.Fog(col(bg), opts.fogNear || 14, opts.fogFar || 34);
  sc.environment = null;
  const pisoTex = canvasTex(1024, 1024, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, opts.piso || PAL.piso); r.addColorStop(1, bg); g.fillStyle = r; g.fillRect(0, 0, w, h);
    if (opts.rejilla) { g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } } });
  const piso = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ map: pisoTex, roughness: .35, metalness: .2, envMap: ENV, envMapIntensity: .25 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; sc.add(piso);
  sc.add(new THREE.HemisphereLight(col('#ffffff'), col(bg), .55));
  const key = new THREE.DirectionalLight(col(PAL.luz), 2.2); key.position.set(4, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8; key.shadow.radius = 6; key.shadow.bias = -0.0005;
  sc.add(key);
  const rim = new THREE.PointLight(col(opts.rim || PAL.rim), 40, 20, 1.6); rim.position.set(-4, 4, -4); sc.add(rim);
  const fill = new THREE.PointLight(col('#ffffff'), 8, 20, 2); fill.position.set(3, 2, 7); sc.add(fill);
  // pared de fondo curva con halo
  const halo = glow(opts.halo || PAL.acento, 16, .18); halo.position.set(0, 4, -9); sc.add(halo);
  // polvo/bokeh flotando
  const motas = new THREE.Group(); for (let i = 0; i < 40; i++) { const s = glow(i % 3 ? '#ffffff' : PAL.acento, .12 + Math.random() * .18, .5); s.position.set((Math.random() - .5) * 14, Math.random() * 8, -6 + Math.random() * 9); s.userData.v = Math.random(); motas.add(s); } sc.add(motas);
  const cam = new THREE.PerspectiveCamera(opts.fov || 42, W / H, .1, 100); cam.position.set(0, 2.4, 11); cam.lookAt(0, 1.6, 0);
  return { sc, cam, key, rim, piso, halo, motas, tick(t) { motas.children.forEach((m, i) => { m.position.y = (m.userData.v * 8 + t * .25) % 8; m.material.opacity = .25 + .25 * Math.sin(t * 2 + i); }); } };
}
export function camara(cam, t, a, b, desde, hasta, mirarDesde, mirarHasta) { const k = ease(win(t, a, b)); const off = cam.userData.off ?? .9; cam.position.set(lerp(desde[0], hasta[0], k), lerp(desde[1], hasta[1], k), lerp(desde[2], hasta[2], k)); const m = mirarHasta || mirarDesde; cam.lookAt(lerp(mirarDesde[0], m[0], k), lerp(mirarDesde[1], m[1], k) + off, lerp(mirarDesde[2], m[2], k)); }

// ---------- personaje: el frasco EcoVital ----------
export const AROMAS = {
  lavanda:   { banda: '#b79be6', tinta: '#4a2f7a', l1: 'Lavanda', l2: 'y Manzanilla', hoja: '#8a5cc9' },
  citronela: { banda: '#e8f3df', tinta: '#2e6b3a', l1: 'Citronela', l2: 'y Árbol de Té', hoja: '#3f9a4b' },
};
export function frasco(o = {}) {
  const ar = AROMAS[o.aroma || 'lavanda']; const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const r = .95, h = 1.7;
  const crema = mesh(new THREE.CylinderGeometry(r * .9, r * .9, h * .9, 6), M.std('#f6f0e4', .8), 0, h / 2 + .05, 0); crema.rotation.y = Math.PI / 6; rig.add(crema);
  const vid = mesh(new THREE.CylinderGeometry(r, r, h, 6), M.vidrio(), 0, h / 2 + .05, 0); vid.rotation.y = Math.PI / 6; vid.castShadow = false; rig.add(vid);
  const base = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, .12, 6), M.vidrio(), 0, .1, 0); base.rotation.y = Math.PI / 6; rig.add(base);
  const tapa = mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, .5, 6), M.oro(), 0, h + .3, 0); tapa.rotation.y = Math.PI / 6; rig.add(tapa);
  const aro = mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, .06, 6), M.oro(), 0, h + .08, 0); aro.rotation.y = Math.PI / 6; rig.add(aro);
  // etiqueta (cara frontal plana)
  const ap = r * Math.cos(Math.PI / 6);
  const et = canvasTex(512, 384, (c, w, hh) => { c.fillStyle = ar.banda; rr(c, 0, 0, w, hh, 30); c.fill(); c.fillStyle = ar.tinta; c.textAlign = 'center';
    c.font = '700 92px P'; c.fillText('EcoVital', w / 2, 140); c.font = '600 46px P'; c.fillText(ar.l1, w / 2, 222); c.fillText(ar.l2, w / 2, 276); c.font = '500 30px P'; c.globalAlpha = .7; c.fillText('desodorante natural · 60 g', w / 2, 340); });
  const etq = new THREE.Mesh(new THREE.PlaneGeometry(r * .98, r * .74), new THREE.MeshStandardMaterial({ map: et, roughness: .7, envMap: ENV, envMapIntensity: .4 })); etq.position.set(0, .62, ap + .012); rig.add(etq);
  // cara (sobre el vidrio, arriba de la etiqueta)
  const cara = new THREE.Group(); cara.position.set(0, 1.42, ap + .02); rig.add(cara);
  const ojoM = M.std('#1b1b22', .3);
  const ojoL = mesh(new THREE.CapsuleGeometry(.07, .12, 4, 12), ojoM, -.24, 0, 0), ojoR = mesh(new THREE.CapsuleGeometry(.07, .12, 4, 12), ojoM, .24, 0, 0);
  [ojoL, ojoR].forEach(e => { e.scale.z = .4; const b = mesh(new THREE.SphereGeometry(.025, 8, 8), M.neon('#ffffff'), .025, .05, .03); e.add(b); cara.add(e); });
  const boca = mesh(new THREE.TorusGeometry(.12, .025, 8, 24, Math.PI), ojoM, 0, -.2, 0); boca.rotation.z = Math.PI; cara.add(boca);
  const bocaO = mesh(new THREE.SphereGeometry(.09, 16, 12), M.std('#3a1420', .5), 0, -.22, 0); bocaO.scale.set(1, 1, .3); bocaO.visible = false; cara.add(bocaO);
  const mej = [-.42, .42].map(x => { const m = mesh(new THREE.CircleGeometry(.08, 20), new THREE.MeshBasicMaterial({ color: col('#ff8fa3'), transparent: true, opacity: .55 }), x, -.12, .005); cara.add(m); return m; });
  // patas y brazos
  const pataM = M.std(ar.tinta, .5);
  const patas = [-.4, 0, .4].map(x => { const p = mesh(new THREE.CapsuleGeometry(.08, .18, 4, 10), pataM, x, -.08, .3); rig.add(p); return p; });
  const brazos = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * (r + .02), .9, 0); const b = mesh(new THREE.CapsuleGeometry(.07, .5, 4, 10), pataM, 0, -.3, 0); const mano = mesh(new THREE.SphereGeometry(.11, 12, 12), pataM, 0, -.6, 0); piv.add(b); piv.add(mano); piv.rotation.z = s * .35; rig.add(piv); return piv; });
  g.userData = { rig, ojoL, ojoR, boca, bocaO, brazos, patas, cara, tapa, mej };
  if (o.escala) g.scale.setScalar(o.escala);
  return g;
}
// animar frasco: expr = feliz | sorpresa | guiño | serio ; hablar = 0..1
export function animFrasco(f, t, o = {}) {
  const u = f.userData; const bl = (Math.sin(t * 1.3 + (o.fase || 0)) > .97) ? .1 : 1;
  u.ojoL.scale.y = u.ojoR.scale.y = bl; if (o.expr === 'guiño') u.ojoR.scale.y = .12;
  if (o.expr === 'sorpresa') { u.ojoL.scale.set(1.25, bl * 1.3, .4); u.ojoR.scale.set(1.25, bl * 1.3, .4); }
  const habla = o.hablar ? Math.abs(Math.sin(t * 15)) * o.hablar : 0;
  u.boca.visible = !(o.expr === 'sorpresa' || habla > .25); u.bocaO.visible = !u.boca.visible; u.bocaO.scale.y = o.expr === 'sorpresa' ? 1.2 : .4 + habla * 1.2;
  if (o.expr === 'serio') { u.boca.rotation.z = 0; u.boca.position.y = -.26; } else { u.boca.rotation.z = Math.PI; u.boca.position.y = -.2; }
  const bob = Math.sin(t * 3 + (o.fase || 0)) * .04 * (o.bob ?? 1);
  u.rig.position.y = bob + (o.salto ? Math.abs(Math.sin(t * 6)) * .35 * o.salto : 0);
  u.rig.scale.y = 1 - bob * .6; u.rig.rotation.z = Math.sin(t * 2.1) * .03 + (o.ladeo || 0);
  u.brazos[0].rotation.z = -.35 - (o.saluda ? .0 : 0); u.brazos[1].rotation.z = o.saluda ? 2.4 + Math.sin(t * 10) * .35 : .35 + Math.sin(t * 2) * .05;
  if (o.brazosArriba) { u.brazos[0].rotation.z = -2.5 - Math.sin(t * 8) * .2; u.brazos[1].rotation.z = 2.5 + Math.sin(t * 8) * .2; }
}

// ---------- personas ilustradas 3D ----------
const PIELES = ['#f2c4a5', '#d9a07a', '#b97a54', '#8d5a3b', '#5e3a26'];
export function persona(o = {}) {
  const piel = M.piel(o.piel || PIELES[o.tono ?? 1]); const pelo = M.std(o.pelo || '#2b1d16', .7); const ropa = M.std(o.ropa || '#3b82f6', .7);
  const g = new THREE.Group(); const cuerpo = new THREE.Group(); g.add(cuerpo);
  const torso = mesh(new THREE.CapsuleGeometry(.62, .9, 8, 20), ropa, 0, 1.05, 0); torso.scale.set(1, 1, .7); cuerpo.add(torso);
  const cuello = mesh(new THREE.CylinderGeometry(.16, .18, .3, 16), piel, 0, 1.95, 0); cuerpo.add(cuello);
  const cab = new THREE.Group(); cab.position.set(0, 2.55, 0); cuerpo.add(cab);
  const craneo = mesh(new THREE.SphereGeometry(.56, 32, 24), piel); craneo.scale.set(1, 1.08, .98); cab.add(craneo);
  [-1, 1].forEach(s => cab.add(mesh(new THREE.SphereGeometry(.12, 12, 12), piel, s * .55, -.02, 0)));
  const nariz = mesh(new THREE.SphereGeometry(.07, 12, 12), piel, 0, -.06, .55); cab.add(nariz);
  const ojoM = M.std('#16161c', .3);
  const ojos = [-1, 1].map(s => { const e = mesh(new THREE.SphereGeometry(.075, 16, 12), ojoM, s * .2, .08, .5); e.scale.z = .5; const b = mesh(new THREE.SphereGeometry(.022, 8, 8), M.neon('#fff'), .02, .03, .04); e.add(b); cab.add(e); return e; });
  const cejas = [-1, 1].map(s => { const c = mesh(rbox(.2, .045, .04, .02), pelo, s * .2, .26, .5); cab.add(c); return c; });
  const boca = mesh(new THREE.SphereGeometry(.1, 16, 12), M.std('#7a2b2b', .5), 0, -.25, .5); boca.scale.set(1, .35, .4); cab.add(boca);
  // pelo
  const p = o.peinado || 'corto';
  if (p !== 'calvo') { const cap = mesh(new THREE.SphereGeometry(.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * .5), pelo, 0, .06, -.02); cap.scale.set(1, 1.12, 1.02); cap.rotation.x = -.25; cab.add(cap); }
  if (p === 'largo') { const l = mesh(rbox(1.15, 1.1, .5, .2), pelo, 0, -.35, -.25); cab.add(l); }
  if (p === 'moño') { cab.add(mesh(new THREE.SphereGeometry(.26, 16, 16), pelo, 0, .62, -.2)); }
  if (p === 'rizos') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; cab.add(mesh(new THREE.SphereGeometry(.17, 10, 10), pelo, Math.cos(a) * .52, .3 + Math.sin(a * 2) * .08, Math.sin(a) * .4 - .1)); } }
  if (o.barba) { const b = mesh(new THREE.SphereGeometry(.42, 20, 12, 0, Math.PI * 2, Math.PI * .55, Math.PI * .45), pelo, 0, .05, .06); cab.add(b); }
  // brazos
  const brazos = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * .7, 1.62, 0); const sup = mesh(new THREE.CapsuleGeometry(.15, .55, 6, 12), ropa, 0, -.35, 0); piv.add(sup);
    const codo = new THREE.Group(); codo.position.set(0, -.72, 0); piv.add(codo); const ant = mesh(new THREE.CapsuleGeometry(.13, .45, 6, 12), piel, 0, -.3, 0); codo.add(ant); const mano = mesh(new THREE.SphereGeometry(.15, 12, 12), piel, 0, -.62, 0); codo.add(mano);
    piv.rotation.z = s * .12; cuerpo.add(piv); return { piv, codo, mano }; });
  g.userData = { cab, ojos, cejas, boca, brazos, cuerpo, torso };
  if (o.escala) g.scale.setScalar(o.escala);
  return g;
}
// accion: idle | hablar | sorpresa | oler (se huele la axila) | señalar | celebrar | pensar | asco
export function animPersona(pe, t, o = {}) {
  const u = pe.userData; const a = o.accion || 'idle'; const bl = Math.sin(t * 1.1 + (o.fase || 0)) > .975 ? .1 : 1;
  u.ojos.forEach(e => e.scale.y = bl); u.cuerpo.position.y = Math.sin(t * 2.2 + (o.fase || 0)) * .02; u.cab.rotation.set(Math.sin(t * 1.3) * .04, Math.sin(t * .9) * .08, 0);
  u.cejas.forEach((c, i) => { c.position.y = .26; c.rotation.z = 0; });
  const hab = (o.hablar ?? (a === 'hablar' ? 1 : 0)); u.boca.scale.set(1, .35 + Math.abs(Math.sin(t * 14)) * .55 * hab, .4);
  const [L, Rr] = u.brazos; L.piv.rotation.set(0, 0, -.12); Rr.piv.rotation.set(0, 0, .12); L.codo.rotation.set(0, 0, 0); Rr.codo.rotation.set(0, 0, 0);
  const k = o.k ?? 1;
  if (a === 'hablar') { Rr.piv.rotation.z = .3 + Math.sin(t * 3) * .15; Rr.codo.rotation.x = -1.2 - Math.sin(t * 5) * .2; Rr.piv.rotation.x = -.3; }
  if (a === 'sorpresa') { u.ojos.forEach(e => e.scale.set(1.3, 1.3 * bl, .5)); u.boca.scale.set(.8, 1.1, .5); u.cejas.forEach(c => c.position.y = .34); L.piv.rotation.z = -.5 * k; Rr.piv.rotation.z = .5 * k; L.codo.rotation.z = 1.6 * k; Rr.codo.rotation.z = -1.6 * k; u.cab.rotation.x = -.08; }
  if (a === 'oler') { Rr.piv.rotation.z = 2.6 * k; Rr.codo.rotation.z = .9 * k; u.cab.rotation.z = -.38 * k; u.cab.rotation.y = .35 * k; u.cab.rotation.x = .15 * k; }
  if (a === 'asco') { oneAsco(u, k, t); }
  if (a === 'señalar') { Rr.piv.rotation.z = 1.4 * k; Rr.piv.rotation.y = -.4 * k; u.cab.rotation.y = .3; }
  if (a === 'celebrar') { L.piv.rotation.z = -2.6; Rr.piv.rotation.z = 2.6; L.codo.rotation.z = -.3 + Math.sin(t * 9) * .2; Rr.codo.rotation.z = .3 - Math.sin(t * 9) * .2; u.cuerpo.position.y = Math.abs(Math.sin(t * 7)) * .15; u.boca.scale.set(1.2, .9, .5); }
  if (a === 'pensar') { Rr.piv.rotation.z = .5; Rr.piv.rotation.x = -.8; Rr.codo.rotation.x = -2.3; u.cab.rotation.z = .12; u.ojos.forEach(e => e.position.y = .12); }
  if (a === 'mostrar') { L.piv.rotation.x = -1.25 * k; L.piv.rotation.z = .35 * k; L.codo.rotation.x = -1.0 * k; L.codo.rotation.z = -.6 * k; u.cab.rotation.y = -.25; u.cab.rotation.x = .1; }
  if (a === 'llorar') llorarPersona(u, t, k); // (2026-11-25)
  if (a === 'sostener') { L.piv.rotation.x = -1.1; Rr.piv.rotation.x = -1.1; L.piv.rotation.z = .25; Rr.piv.rotation.z = -.25; L.codo.rotation.x = -.6; Rr.codo.rotation.x = -.6; }
}
function oneAsco(u, k, t) { u.ojos.forEach(e => e.scale.y = .35); u.cejas[0].rotation.z = -.35; u.cejas[1].rotation.z = .35; u.boca.scale.set(1.1, .25, .4); u.cab.rotation.x = -.15 * k; u.cab.rotation.z = Math.sin(t * 20) * .03; u.brazos[1].piv.rotation.z = 2.2 * k; u.brazos[1].codo.rotation.z = 2.0 * k; }

// ---------- villanos y objetos ----------
export function aerosol(o = {}) { // "desodorante con aluminio" genérico (sin marca)
  const g = new THREE.Group(); const lata = mesh(new THREE.CylinderGeometry(.55, .55, 2.1, 40), new THREE.MeshStandardMaterial({ color: col('#b9c0c7'), metalness: 1, roughness: .28, envMap: ENV, envMapIntensity: 1.2 }), 0, 1.15, 0); g.add(lata);
  g.add(mesh(new THREE.CylinderGeometry(.42, .55, .35, 40), M.std('#d24b4b', .4), 0, 2.38, 0)); g.add(mesh(new THREE.CylinderGeometry(.1, .1, .15, 16), M.std('#222', .4), 0, 2.62, 0));
  const et = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#d24b4b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 70px P'; c.textAlign = 'center'; c.fillText('Al', w / 2 - 70, 120); c.font = '600 40px P'; c.fillText('aluminio', w / 2 + 60, 112); c.font = '500 30px P'; c.fillText('ANTITRANSPIRANTE', w / 2, 200); });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .8, 40, 1, true, -Math.PI / 2.2, Math.PI / 1.1), new THREE.MeshStandardMaterial({ map: et, roughness: .5, envMap: ENV })); band.position.y = .85; band.rotation.y = Math.PI; g.add(band);
  const cara = new THREE.Group(); cara.position.set(0, 1.62, .53); g.add(cara);
  const ojoM = M.std('#111', .3); const ojos = [-1, 1].map(s => { const e = mesh(new THREE.SphereGeometry(.07, 12, 12), ojoM, s * .18, 0, 0); e.scale.z = .4; cara.add(e); return e; });
  const cejas = [-1, 1].map(s => { const c = mesh(rbox(.2, .05, .04, .02), ojoM, s * .18, .13, 0); c.rotation.z = s * -.4; cara.add(c); return c; });
  const boca = mesh(new THREE.TorusGeometry(.1, .022, 8, 20, Math.PI), ojoM, 0, -.17, 0); cara.add(boca);
  g.userData = { ojos, cejas, boca, cara }; if (o.escala) g.scale.setScalar(o.escala); return g;
}
export function nubeOlor(o = {}) { const g = new THREE.Group(); const m = M.std(o.color || '#8fae5c', .9); [[0, 0, 0, .55], [.5, .1, 0, .42], [-.5, .08, 0, .45], [.2, .4, 0, .4], [-.25, .38, 0, .38]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.SphereGeometry(r, 20, 16), m, x, y, z)));
  const ojoM = M.std('#1d2414', .3); [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(.07, 10, 10), ojoM, s * .2, .15, .52); e.scale.z = .5; g.add(e); }); const b = mesh(new THREE.TorusGeometry(.12, .025, 8, 16, Math.PI), ojoM, 0, -.08, .53); g.add(b); g.userData = { b }; return g; }
export function gota(c = '#6cc4ff', s = .35) { const g = new THREE.Group(); const m = mesh(new THREE.SphereGeometry(s, 24, 18), new THREE.MeshPhysicalMaterial({ color: col(c), roughness: .05, transmission: 0, transparent: true, opacity: .85, envMap: ENV, envMapIntensity: 1.5, clearcoat: 1 })); const pun = mesh(new THREE.ConeGeometry(s * .72, s * 1.2, 24), m.material, 0, s * .85, 0); g.add(m); g.add(pun); return g; }
export function lavanda(n = 7) { const g = new THREE.Group(); const tallo = M.std('#5f8f4e', .7); const flor = M.std('#8a5cc9', .6); for (let i = 0; i < n; i++) { const r = new THREE.Group(); r.add(mesh(new THREE.CylinderGeometry(.02, .02, 1.6, 6), tallo, 0, .8, 0)); for (let j = 0; j < 9; j++) r.add(mesh(new THREE.SphereGeometry(.07, 8, 8), flor, Math.sin(j * 2.3) * .05, 1.2 + j * .06, Math.cos(j * 2.3) * .05)); r.rotation.z = (i - n / 2) * .09; r.rotation.y = i; g.add(r); } return g; }
export function manzanilla(s = 1) { const g = new THREE.Group(); const pet = M.std('#ffffff', .6); for (let i = 0; i < 14; i++) { const p = mesh(new THREE.CapsuleGeometry(.06, .26, 4, 8), pet, 0, 0, 0); const a = i / 14 * Math.PI * 2; p.position.set(Math.cos(a) * .24, Math.sin(a) * .24, 0); p.rotation.z = a - Math.PI / 2; g.add(p); } g.add(mesh(new THREE.SphereGeometry(.15, 16, 12), M.std('#f5c22e', .6))); g.scale.setScalar(s); return g; }
export function hoja(c = '#3f9a4b', s = 1) { const sh = new THREE.Shape(); sh.moveTo(0, -.5); sh.quadraticCurveTo(.35, 0, 0, .5); sh.quadraticCurveTo(-.35, 0, 0, -.5); const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }), M.std(c, .55)); m.scale.setScalar(s); return m; }
export function caja(c = '#c98b4f', o = {}) { const g = new THREE.Group(); const cuerpo = mesh(rbox(1.8, 1.3, 1.8, .06), M.std(c, .8), 0, .65, 0); g.add(cuerpo); const tapa = new THREE.Group(); tapa.position.set(0, 1.3, -.9); const tm = mesh(rbox(1.9, .22, 1.9, .06), M.std(o.tapa || c, .8), 0, .1, .9); tapa.add(tm); g.add(tapa);
  if (o.cinta) { const cm = M.std(o.cinta, .4); g.add(mesh(new THREE.BoxGeometry(.25, 1.32, 1.82), cm, 0, .65, 0)); g.add(mesh(new THREE.BoxGeometry(1.82, 1.32, .25), cm, 0, .65, 0)); tm.add(mesh(new THREE.BoxGeometry(.27, .24, 1.92), cm)); const lazo = new THREE.Group(); lazo.position.set(0, .2, 0); [-1, 1].forEach(s => { const t = mesh(new THREE.TorusGeometry(.22, .07, 10, 20), cm, s * .22, .12, 0); t.rotation.y = Math.PI / 2; t.scale.set(1, 1, 1.3); lazo.add(t); }); tm.add(lazo); }
  g.userData = { tapa }; return g; }
export function celular(o = {}) { const g = new THREE.Group(); const cuerpo = mesh(rbox(1.9, 3.9, .18, .2), M.std('#15151a', .25, .6), 0, 0, 0); g.add(cuerpo);
  const tex = canvasTex(540, 1110, o.dibujar || ((c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); }));
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 3.62), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); pant.position.z = .095; g.add(pant); g.userData = { tex }; return g; }
export function pedestal(c = PAL.acento) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(1.7, 1.85, .45, 6), M.std('#15181c', .3, .4), 0, .22, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.78, .03, 8, 6), M.neon(c)); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 6; ring.position.y = .46; g.add(ring);
  const g2 = glow(c, 5, .35); g2.position.y = .5; g.add(g2); const ring2 = ring.clone(); ring2.position.y = .02; ring2.scale.setScalar(1.05); g.add(ring2); return g; }
export function relojArena(o = {}) { const g = new THREE.Group(); const mad = M.std('#7a4b2a', .55); g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, .2, 32), mad, 0, 0, 0)); g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, .2, 32), mad, 0, 3.2, 0));
  [-1, 1].forEach(s => [-1, 1].forEach(z => g.add(mesh(new THREE.CylinderGeometry(.06, .06, 3.1, 10), mad, s * .9, 1.6, z * .5))));
  const pts = []; for (let i = 0; i <= 20; i++) { const y = i / 20; const rr2 = .12 + .68 * Math.pow(Math.abs(y - .5) * 2, .9); pts.push(new THREE.Vector2(rr2, y * 3)); }
  const vid = mesh(new THREE.LatheGeometry(pts, 40), M.vidrio(), 0, .1, 0); g.add(vid);
  const arenaM = M.std(o.color || '#ff9a3d', .8, 0, o.color || '#ff9a3d');
  const arriba = mesh(new THREE.ConeGeometry(.7, 1, 32), arenaM, 0, 2.2, 0); arriba.rotation.x = Math.PI; g.add(arriba);
  const abajo = mesh(new THREE.ConeGeometry(.75, .6, 32), arenaM, 0, .45, 0); g.add(abajo);
  const chorro = mesh(new THREE.CylinderGeometry(.025, .025, 1.3, 8), arenaM, 0, 1.25, 0); g.add(chorro); const gl = glow(o.color || '#ff9a3d', 3, .5); gl.position.y = 1.6; g.add(gl);
  g.userData = { arriba, abajo, chorro }; return g; }
export function animReloj(r, k) { const u = r.userData; u.arriba.scale.set(1 - k * .7, 1 - k * .75, 1 - k * .7); u.arriba.position.y = 2.2 + k * .3; u.abajo.scale.set(.5 + k * .6, .4 + k * .9, .5 + k * .6); u.abajo.position.y = .2 + .25 * (.4 + k * .9); }
export function moto(c = '#2e7d46') { const g = new THREE.Group(); const neg = M.std('#1a1a1a', .5);
  [-1, 1].forEach(s => { g.add(mesh(new THREE.TorusGeometry(.45, .14, 12, 28), neg, s * 1.1, .5, 0)); const eje = mesh(new THREE.CylinderGeometry(.12, .12, .32, 16), M.std('#aaa', .3, 1), s * 1.1, .5, 0); eje.rotation.x = Math.PI / 2; g.add(eje); });
  g.add(mesh(rbox(1.6, .5, .6, .2), M.std(c, .4), 0, 1.0, 0)); g.add(mesh(rbox(.9, .9, .9, .1), M.std('#f2c14e', .7), -.9, 1.6, 0));
  const man = mesh(new THREE.CylinderGeometry(.05, .05, .9, 8), neg, .95, 1.4, 0); man.rotation.z = -.4; g.add(man); g.add(mesh(rbox(.2, .08, .9, .03), neg, 1.15, 1.8, 0));
  return g; }
export function casa(o = {}) { const g = new THREE.Group(); g.add(mesh(rbox(4, 3, 2.5, .05), M.std(o.pared || '#e9dccb', .9), 0, 1.5, -1.3)); const techo = mesh(new THREE.ConeGeometry(3.1, 1.4, 4), M.std(o.techo || '#b5523b', .8), 0, 3.7, -1.3); techo.rotation.y = Math.PI / 4; techo.scale.z = .7; g.add(techo);
  const puerta = new THREE.Group(); puerta.position.set(-.6, 0, 0); const pm = mesh(rbox(1.2, 2.1, .1, .03), M.std(o.puerta || '#2e5d4b', .6), .6, 1.05, 0); puerta.add(pm); puerta.add(mesh(new THREE.SphereGeometry(.06, 10, 10), M.oro(), 1.05, 1.05, .08)); g.add(puerta);
  g.add(mesh(rbox(.9, .8, .1, .03), M.std('#bfe3f5', .1, .2), 1.4, 1.9, .02)); g.userData = { puerta }; return g; }
// texto 3D extruido (números grandes, palabras cortas)
export function texto3D(txt, o = {}) { const geo = new TextGeometry(String(txt), { font: FONT3D, size: o.size || 1.6, depth: o.depth || .35, curveSegments: 6, bevelEnabled: true, bevelThickness: .05, bevelSize: .035, bevelSegments: 3 }); geo.center();
  const m = mesh(geo, o.mat || new THREE.MeshStandardMaterial({ color: col(o.color || PAL.acento), roughness: .25, metalness: .3, envMap: ENV, envMapIntensity: 1.2, emissive: col(o.color || PAL.acento), emissiveIntensity: .25 })); return m; }
// cartel plano con texto (canvas)
export function cartel(lines, o = {}) { const w = o.w || 1024, h = o.h || 512; const tex = canvasTex(w, h, (c) => { if (o.fondo !== null) { c.fillStyle = o.fondo || 'rgba(255,255,255,.95)'; rr(c, 6, 6, w - 12, h - 12, o.radio ?? 50); c.fill(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; const n = lines.length; lines.forEach((L, i) => { c.fillStyle = L.color || o.color || '#111'; c.font = `${L.peso || 800} ${L.size || 110}px P`; c.fillText(L.t, w / 2, h / 2 + (i - (n - 1) / 2) * (L.size || 110) * 1.12); }); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(o.ancho || 4, (o.ancho || 4) * h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide })); return p; }

// ---------- escenarios (fondos con decorado) ----------
export function escenario(sc, tipo) {
  const g = new THREE.Group(); sc.add(g);
  if (tipo === 'baño') { const azu = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#d7ebe6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8d2cc'; c.lineWidth = 6; for (let i = 0; i <= w; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }); azu.wrapS = azu.wrapT = THREE.RepeatWrapping; azu.repeat.set(4, 4);
    const pared = mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: azu, roughness: .4, envMap: ENV, envMapIntensity: .3 }), 0, 5, -4); g.add(pared);
    const esp = mesh(rbox(3, 3.6, .08, .3), M.std('#e8f4f8', .02, .9), 2.6, 5, -3.9); g.add(esp); g.add(mesh(rbox(4, .3, 1.4, .05), M.std('#f4f1ec', .5), -2.5, 2.4, -3.3)); g.add(mesh(new THREE.TorusGeometry(.6, .05, 8, 24, Math.PI), M.oro(), -4.5, 5.2, -3.9)); }
  if (tipo === 'gimnasio') { const pared = mesh(new THREE.PlaneGeometry(16, 12), M.std('#2a2f3a', .9), 0, 5, -4); g.add(pared); for (let i = 0; i < 4; i++) { const m = new THREE.Group(); m.add(mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 8), M.std('#888', .3, 1))); [-1, 1].forEach(s => m.add(mesh(new THREE.CylinderGeometry(.32, .32, .25, 20), M.std('#111', .5), 0, s * .7, 0))); m.rotation.z = Math.PI / 2; m.position.set(-3 + i * 2, 2.6, -3.4); g.add(m); }
    g.add(mesh(rbox(9, .2, .9, .05), M.std('#555', .5, .6), 0, 2.2, -3.4)); }
  if (tipo === 'oficina') { g.add(mesh(new THREE.PlaneGeometry(16, 12), M.std('#e9e2d6', .95), 0, 5, -4)); g.add(mesh(rbox(5, .15, 2, .05), M.std('#8a6648', .6), 0, 1.6, -1)); const mon = mesh(rbox(2.4, 1.5, .1, .05), M.std('#111', .3), 0, 2.6, -1.6); g.add(mon);
    const vent = mesh(new THREE.PlaneGeometry(3.5, 3), M.neon('#bfe6f7'), -3.8, 5, -3.95); g.add(vent); }
  if (tipo === 'habitacion') { g.add(mesh(new THREE.PlaneGeometry(16, 12), M.std('#2b2f4a', .95), 0, 5, -4)); const v = mesh(new THREE.PlaneGeometry(2.6, 3.2), M.neon('#16203f'), 3, 5.4, -3.95); g.add(v); const luna = mesh(new THREE.CircleGeometry(.5, 32), M.neon('#ffe9b0'), 3.4, 6, -3.9); g.add(luna); const gl = glow('#ffe9b0', 3, .4); gl.position.set(3.4, 6, -3.8); g.add(gl); }
  if (tipo === 'calle') { for (let i = 0; i < 6; i++) { const hgt = 4 + (i * 37 % 5); const ed = mesh(rbox(2.2, hgt, 2, .05), M.std(['#e7c8a0', '#c9d8c5', '#e8b9a6', '#cfd6e8'][i % 4], .9), -6 + i * 2.4, hgt / 2, -5); g.add(ed); for (let f = 0; f < hgt - 1; f++) ed.add(mesh(new THREE.PlaneGeometry(1.4, .5), M.neon('#ffe9b0'), 0, -hgt / 2 + 1 + f, 1.01)); } }
  if (tipo === 'cocina') { g.add(mesh(new THREE.PlaneGeometry(16, 12), M.std('#f3ece0', .9), 0, 5, -4)); g.add(mesh(rbox(10, 1.6, 1.6, .05), M.std('#3f6b5a', .6), 0, .8, -3)); g.add(mesh(rbox(10, .12, 1.7, .03), M.std('#f8f8f8', .3), 0, 1.66, -3)); for (let i = 0; i < 3; i++) g.add(mesh(rbox(1.8, 1.2, .6, .05), M.std('#3f6b5a', .6), -3 + i * 3, 5.5, -3.6)); }
  if (tipo === 'invernadero') { // (2026-11-22) invernadero de vidrio: paneles con marco blanco, luz verde, matas en materas, enredadera arriba y mesón de madera
    g.add(mesh(new THREE.PlaneGeometry(16, 12), M.neon('#cfe9d4'), 0, 5, -4.2)); const marco = M.std('#f4f4ef', .4, .2);
    for (let i = -4; i <= 4; i++) g.add(mesh(rbox(.1, 12, .1, .02), marco, i * 1.8, 5, -4.05)); for (let j = 0; j < 5; j++) g.add(mesh(rbox(16, .1, .1, .02), marco, 0, 1.2 + j * 2.2, -4.05));
    for (let j = 0; j < 4; j++) { const sol = glow('#fff6c8', 5, .22); sol.position.set(-4 + j * 2.7, 7.5, -3.9); g.add(sol); }
    g.add(mesh(rbox(10, .22, 1.6, .05), M.std('#8a5a36', .7), 0, 1.5, -3.1)); [-4.4, 4.4].forEach(x => g.add(mesh(rbox(.18, 1.5, 1.4, .04), M.std('#6e4628', .7), x, .75, -3.1)));
    const verdes = ['#3f8f46', '#5fae4f', '#2e7a3e', '#78c06a']; for (let i = 0; i < 6; i++) { const x = -4 + i * 1.6; const mat = mesh(new THREE.CylinderGeometry(.32, .24, .5, 16), M.std(i % 2 ? '#c8693f' : '#b85a33', .8), x, 1.86, -3.2); g.add(mat);
      for (let k = 0; k < 5; k++) g.add(mesh(new THREE.SphereGeometry(.28 + (k % 2) * .08, 12, 10), M.std(verdes[(i + k) % 4], .7), x + Math.sin(k * 2.3) * .3, 2.35 + (k % 3) * .22, -3.2 + Math.cos(k * 2.3) * .2)); }
    for (let i = 0; i < 14; i++) { const h = hoja(verdes[i % 4], .5); h.position.set(-6 + i * .95, 9.2 - Math.abs(Math.sin(i * 1.7)) * 1.4, -3.8); h.rotation.set(.2, 0, Math.PI + Math.sin(i) * .6); g.add(h); } }
  if (tipo === 'bus') escenarioBus(g); // (2026-11-23)
  return g;
}

// ---------- capa de edición (HTML) ----------
const OV = document.getElementById('ov');
export function el(tag, cls, parent = OV, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent.appendChild(e); return e; }
export function capa() { const d = el('div', 'capa'); return d; }
export function proyectar(obj, cam, off = [0, 0, 0]) { const v = new THREE.Vector3(); obj.getWorldPosition(v); v.x += off[0]; v.y += off[1]; v.z += off[2]; v.project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
// etiqueta con línea (tipo "Claude" del reel): ancla = objeto 3D
export function etiqueta(cp, texto, o = {}) { const e = el('div', 'tag ' + (o.cls || ''), cp, texto); const ln = el('div', 'tagln', cp); return { e, ln, set(x, y, ax, ay, k) { e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.opacity = k; e.style.transform = `translate(-50%,-50%) scale(${.6 + .4 * back(k)})`; const dx = ax - x, dy = ay - y, L = Math.hypot(dx, dy); ln.style.left = x + 'px'; ln.style.top = y + 'px'; ln.style.width = L * k + 'px'; ln.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`; ln.style.opacity = k; } }; }
export function sticker(cp, texto, o = {}) { const e = el('div', 'sticker ' + (o.cls || ''), cp, texto); e.style.left = (o.x ?? 540) + 'px'; e.style.top = (o.y ?? 1200) + 'px'; return { e, set(k, rot = o.rot ?? -6) { const s = k <= 0 ? 0 : (k < 1 ? 2.2 - 1.2 * back(k) : 1); e.style.opacity = clamp(k * 3); e.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`; } }; }
export function chip(cp, html, x, y, cls = '') { const e = el('div', 'chip ' + cls, cp, html); e.style.left = x + 'px'; e.style.top = y + 'px'; return { e, set(k, dy = 0) { e.style.opacity = clamp(k); e.style.transform = `translate(-50%,-50%) translateY(${(1 - eout(k)) * 40 + dy}px) scale(${.85 + .15 * eout(k)})`; } }; }

// ---------- PLANTILLAS ----------
// Cada plantilla: (p, ctx) => { sc, cam, upd(t,d), cp }  · t = tiempo local de la escena, d = duración
export const PLANTILLAS = {};
const def = (n, f) => PLANTILLAS[n] = f;

// 1. GANCHO: título gigante desde el cuadro 0 + héroe (frasco | persona | aerosol | reloj | nube)
def('gancho', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa();
  const heroe = crearHeroe(p.heroe || 'frasco', p); sc.add(heroe.obj); heroe.obj.position.x = 0; heroe.obj.position.z = 0;
  const t1 = el('div', 'titulo', cp, p.titulo || ''); const t2 = p.sub ? el('div', 'subtitulo', cp, p.sub) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.0, 14], [0, 2.2, 11.5], [0, 1.3, 0]); heroe.anim(t, d);
    t1.style.transform = `translate(-50%,0) scale(${1 + .04 * Math.sin(t * 3)})`; t1.style.opacity = 1; if (t2) { const k = win(t, .4, .8); t2.style.opacity = k; t2.style.transform = `translate(-50%,${(1 - eout(k)) * 30}px)`; } } };
});
// 2. VERSUS: dos personajes cara a cara con etiquetas (A vs B)
def('versus', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa();
  const A = crearHeroe(p.a || 'frasco', { ...p, aroma: p.aromaA || p.aroma }), B = crearHeroe(p.b || 'aerosol', { ...p, aroma: p.aromaB || 'citronela' });
  A.obj.position.set(-1.32, p.yA ?? 0, 0); B.obj.position.set(1.32, p.yB ?? 0, 0); A.obj.scale.setScalar(.76); B.obj.scale.setScalar(.76); cam.userData.off = .45; A.obj.rotation.y = .35; B.obj.rotation.y = -.35; sc.add(A.obj); sc.add(B.obj);
  const gA = glow(p.colorA || PAL.acento, 4.5, .35); gA.position.set(-1.9, 1.3, -.8); sc.add(gA); const gB = glow(p.colorB || '#ff5a5a', 4.5, .35); gB.position.set(1.9, 1.3, -.8); sc.add(gB);
  const vs = texto3D('VS', { size: .9, color: '#ffffff' }); vs.position.set(0, 1.3, -1.5); sc.add(vs);
  const eA = etiqueta(cp, p.etA || 'EcoVital', { cls: 'a' }), eB = etiqueta(cp, p.etB || 'Con aluminio', { cls: 'b' });
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.2, 13], [0, 2.0, 11.2], [0, 1.6, 0]); A.anim(t, d); B.anim(t + 1, d);
    vs.rotation.y = Math.sin(t * 2) * .3; vs.scale.setScalar(back(win(t, .1, .5)));
    cam.updateMatrixWorld(); const [ax, ay] = proyectar(A.obj, cam, [0, p.etY ?? 2.15, 0]), [bx, by] = proyectar(B.obj, cam, [0, p.etY ?? 2.15, 0]);
    eA.set(Math.max(200, ax - 30), ay - 120, ax, ay, win(t, .3, .6)); eB.set(Math.min(880, bx + 30), by - 120, bx, by, win(t, .5, .8)); } };
});
// 3. PEDESTAL: héroe girando en pedestal con neón + chips de beneficios que aparecen
def('pedestal', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const ped = pedestal(p.color || PAL.acento); sc.add(ped); const H = crearHeroe(p.heroe || 'frasco', p); H.obj.position.y = .46; sc.add(H.obj);
  const chips = (p.chips || []).map((c, i) => chip(cp, c, i % 2 ? 750 : 330, 1460 + Math.floor(i / 2) * 100 + (i % 2) * 60));
  return { sc, cam, cp, upd(t, d) { E.tick(t); const a = t * .5; cam.position.set(Math.sin(a) * 11, 3.2, Math.cos(a) * 11); cam.lookAt(0, 2.4, 0); H.anim(t, d); H.obj.lookAt(cam.position.x, H.obj.position.y, cam.position.z);
    chips.forEach((c, i) => c.set(win(t, .3 + i * (d - .8) / Math.max(1, chips.length), .6 + i * (d - .8) / Math.max(1, chips.length)), Math.sin(t * 2 + i) * 6)); } };
});
// 4. PERSONA en un escenario haciendo una acción (+ gotas de sudor / nube de olor / frasco en mano)
def('persona', (p) => {
  const E = estudio({ fogNear: 18, fogFar: 40 }); const sc = E.sc, cam = E.cam; const cp = capa(); const esc = escenario(sc, p.escenario || 'baño');
  const pe = persona(p.persona || {}); sc.add(pe); cam.userData.off = .35;
  const extras = [];
  if (p.sudor) for (let i = 0; i < 5; i++) { const g = gota('#7fd1ff', .1); sc.add(g); extras.push({ g, i, tipo: 'sudor' }); }
  if (p.olor) { const n = nubeOlor(); n.scale.setScalar(.6); sc.add(n); extras.push({ g: n, tipo: 'olor' }); }
  let fr = null; if (p.frasco) { fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.36); sc.add(fr); }
  let ob = null; if (p.objeto && OBJETOS[p.objeto]) { ob = OBJETOS[p.objeto](p); const q = p.objetoPos || [2.6, 1.4, -1.5]; ob.position.set(...q); ob.scale.setScalar(p.objetoEscala || 1); sc.add(ob); } // (2026-11-19) objeto de OBJETOS junto a la persona (árbol, etc.)
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1350, cls: p.stickerCls || '' }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); const z0 = p.zoom === 'out' ? 8 : 11, z1 = p.zoom === 'out' ? 11 : 8.6;
    camara(cam, t, 0, d, [p.lado || 0, 2.6, z0], [(p.lado || 0) * .4, 2.5, z1], [0, 1.9, 0]);
    animPersona(pe, t, { accion: p.accion || 'hablar', k: eout(win(t, 0, .5)), hablar: p.hablar ?? .6 }); if (fr) { pe.updateMatrixWorld(true); const v = new THREE.Vector3(); pe.userData.brazos[0].mano.getWorldPosition(v); fr.position.set(v.x, v.y - .05, v.z + .15); fr.rotation.y = .5; animFrasco(fr, t, { expr: 'feliz', bob: 0 }); }
    extras.forEach(x => { if (x.tipo === 'sudor') { const ph = (t * .9 + x.i / 5) % 1; x.g.position.set(.9 + Math.sin(x.i) * .3, 2.9 - ph * 1.2, .4); x.g.scale.setScalar(1 - ph * .4); x.g.rotation.z = Math.PI; } if (x.tipo === 'olor') { x.g.position.set(1.3 + Math.sin(t * 2) * .1, 2.6 + Math.sin(t * 1.5) * .15, .3); x.g.rotation.z = Math.sin(t * 2) * .1; } });
    if (ob) { ob.userData.tick?.(t); ob.rotation.y = Math.sin(t * .4) * .15; } esc.userData.tick?.(t);
    if (st) st.set(win(t, p.stickerT ?? d * .45, (p.stickerT ?? d * .45) + .35)); } };
});
// 5. CONTADOR: número gigante 3D que cuenta (o "3 ERRORES", "5 COSAS") con anillo de pasos
def('contador', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa();
  const grupo = new THREE.Group(); sc.add(grupo); grupo.position.y = 2.3; let num = texto3D(p.desde ?? p.numero ?? 3, { size: p.size || 2.6, depth: .6 }); grupo.add(num);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(2.0, .04, 8, 80), M.neon(PAL.acento)); grupo.add(anillo); const gl = glow(PAL.acento, 7, .3); grupo.add(gl);
  const pal = p.palabra ? el('div', 'palabraGig', cp, p.palabra) : null; const et = p.etiqueta ? sticker(cp, p.etiqueta, { y: p.palabra ? 1650 : 1500, x: 540, rot: -6 }) : null;
  let ultimo = null; const cache = {};
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.4, 15], [0, 2.4, 12.5], [0, 2.1, 0]);
    if (p.hasta !== undefined) { const v = Math.round(lerp(p.desde || 0, p.hasta, eout(win(t, .1, d * .7)))); if (v !== ultimo) { grupo.remove(num); num = cache[v] || (cache[v] = texto3D(p.prefijo ? p.prefijo + v + (p.sufijo || '') : v + (p.sufijo || ''), { size: 2.2, depth: .5 })); grupo.add(num); ultimo = v; } }
    const k = back(win(t, 0, .45)); num.scale.setScalar(Math.max(.01, k)); num.rotation.y = Math.sin(t * 1.5) * .25; anillo.rotation.z = t * .6; anillo.scale.setScalar(.8 + .2 * eout(win(t, 0, .6)));
    if (pal) { const kk = win(t, .25, .6); pal.style.opacity = kk; pal.style.transform = `translate(-50%,0) scale(${.7 + .3 * back(kk)})`; } if (et) et.set(win(t, .5, .85)); } };
});
// 6. PASO: tarjeta de paso N (contador arriba lo maneja el guion) + héroe + título del paso + icono
def('paso', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const H = crearHeroe(p.heroe || 'frasco', p); sc.add(H.obj); H.obj.position.set(p.heroeX ?? 1.3, 0, 0); H.obj.rotation.y = -.3;
  const n = texto3D(p.n || 1, { size: 1.9, depth: .5 }); n.position.set(-1.5, 2.0, -.5); sc.add(n);
  const tt = el('div', 'pasoTit', cp, p.titulo || '');
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [-1.5, 2.4, 13.5], [.4, 2.2, 11.5], [0, 1.6, 0]); H.anim(t, d); n.rotation.y = .3 + Math.sin(t * 1.4) * .15; n.scale.setScalar(Math.max(.01, back(win(t, 0, .4))));
    const k = win(t, .25, .6); tt.style.opacity = k; tt.style.transform = `translate(-50%,0) translateX(${(1 - eout(k)) * -80}px)`; } };
});
// 7. SPLIT antes/después: dos personas, izquierda gris/triste, derecha color/feliz
def('split', (p) => {
  const E = estudio({ fogNear: 20, fogFar: 40 }); const sc = E.sc, cam = E.cam; const cp = capa();
  const izq = persona({ ...(p.persona || {}), ropa: '#6b7280' }), der = persona({ ...(p.persona || {}), ropa: p.ropaDer || PAL.acento });
  izq.position.set(-2.3, 0, 0); der.position.set(2.3, 0, 0); sc.add(izq); sc.add(der); cam.userData.off = .4;
  const linea = new THREE.Mesh(new THREE.PlaneGeometry(.06, 12), M.neon('#ffffff')); linea.position.set(0, 3, .5); sc.add(linea);
  const n = nubeOlor(); n.scale.setScalar(.5); sc.add(n); let fr = null; if (p.frasco !== false) { fr = frasco({ aroma: p.aroma, escala: .55 }); fr.position.set(3.7, 0, .6); fr.rotation.y = -.5; sc.add(fr); }
  const lA = el('div', 'splitLbl izq', cp, p.antes || 'ANTES'), lB = el('div', 'splitLbl der', cp, p.despues || 'DESPUÉS');
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.7, 17.5], [0, 2.6, 15.5], [0, 2.0, 0]);
    animPersona(izq, t, { accion: p.accionIzq || 'asco', k: eout(win(t, 0, .5)), hablar: 0 }); animPersona(der, t, { accion: p.accionDer || 'celebrar', k: 1, fase: 2 });
    n.position.set(-1.2, 2.7 + Math.sin(t * 2) * .1, .4); if (fr) animFrasco(fr, t, { expr: 'feliz', salto: .4 }); const k = win(t, .1, .4); lA.style.opacity = k; lB.style.opacity = win(t, .3, .6); linea.scale.y = eout(win(t, 0, .4)); } };
});
// 8. CELULAR: teléfono 3D flotando con pantalla dibujada (chat, comentarios, pedido) — p.pantalla = 'chat' | 'comentarios' | 'pedido'
def('celular', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const cel = celular({ dibujar: PANTALLAS[p.pantalla || 'chat'](p) }); cel.position.set(0, 2.6, 0); sc.add(cel); const gl = glow(PAL.acento, 6, .25); gl.position.set(0, 2.6, -1); sc.add(gl);
  let pe = null; if (p.persona) { pe = persona(p.persona); pe.position.set(-2.6, 0, -1.2); pe.rotation.y = .5; sc.add(pe); }
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [.9, 2.8, 11], [.25, 2.7, 9.4], [.2, 2.5, 0]); cel.rotation.y = -.25 + Math.sin(t * .8) * .08; cel.rotation.x = -.05; cel.position.y = 2.6 + Math.sin(t * 1.6) * .06;
    redraw(cel.userData.tex, t / d, t); if (pe) animPersona(pe, t, { accion: p.accion || 'sorpresa', k: eout(win(t, 0, .5)) }); } };
});
// 9. RELOJ: reloj de arena (urgencia / tiempo) + calendario o texto
def('reloj', (p) => {
  const E = estudio({ halo: p.color || '#ff9a3d' }); const sc = E.sc, cam = E.cam; const cp = capa();
  const r = relojArena({ color: p.color || PAL.acento }); sc.add(r); const lb = p.etiqueta ? etiqueta(cp, p.etiqueta, {}) : null; const st = p.sticker ? sticker(cp, p.sticker, { x: 760, y: 760, rot: 8 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.2, 12.5], [0, 2, 10.5], [0, 1.6, 0]); r.rotation.y = t * .25; animReloj(r, clamp((p.k0 ?? .2) + (t / d) * .5));
    if (lb) { const [x, y] = proyectar(r, cam, [-1, 1.6, 0]); lb.set(x - 130, y - 40, x, y, win(t, .3, .6)); } if (st) st.set(win(t, .5, .8)); } };
});
// 10. REGALO: caja de regalo se abre y sale el frasco con confeti
def('regalo', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const cj = caja(p.color || '#c0392b', { cinta: p.cinta || '#f2c14e' }); sc.add(cj); const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.75); sc.add(fr);
  const conf = []; for (let i = 0; i < 40; i++) { const m = mesh(new THREE.PlaneGeometry(.12, .2), new THREE.MeshBasicMaterial({ color: col([PAL.acento, PAL.acento2, '#ff6b9a', '#ffffff'][i % 4]), side: THREE.DoubleSide }), 0, 0, 0); m.userData = { a: Math.random() * Math.PI * 2, v: 2 + Math.random() * 3, r: Math.random() }; sc.add(m); conf.push(m); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: 1380 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 3.4, 13], [0, 3, 10.8], [0, 1.5, 0]); const ab = win(t, d * .25, d * .25 + .5);
    cj.userData.tapa.rotation.x = -2.2 * back(ab); cj.position.y = Math.sin(t * 20) * .03 * (1 - ab); fr.position.y = .2 + 1.4 * back(win(t, d * .3, d * .3 + .6)); fr.rotation.y = t; animFrasco(fr, t, { expr: 'feliz', brazosArriba: ab > .8 });
    const tc = t - d * .3; conf.forEach(m => { const u = m.userData; if (tc < 0) { m.visible = false; return; } m.visible = true; m.position.set(Math.cos(u.a) * u.v * tc * .6, 2 + u.v * tc - 2.4 * tc * tc, Math.sin(u.a) * u.v * tc * .4); m.rotation.set(tc * 5 * u.r, tc * 7, tc * 3); });
    if (st) st.set(win(t, d * .55, d * .55 + .35)); } };
});
// 11. ENTREGA: domiciliario en moto llega a la casa; sticker "PAGAS AL RECIBIR"
def('entrega', (p) => {
  const E = estudio({ fogNear: 20, fogFar: 45 }); const sc = E.sc, cam = E.cam; const cp = capa();
  cam.userData.off = .5; const cs = casa({}); cs.position.set(-1.5, 0, -1.5); sc.add(cs); const mt = moto(PAL.acento); sc.add(mt); const rep = persona({ ropa: '#f2c14e', tono: 3, peinado: 'corto', pelo: '#e04b3b' }); rep.scale.setScalar(.7); sc.add(rep);
  const cl = persona(p.cliente || { ropa: '#7c3aed', peinado: 'largo', tono: 1 }); cl.scale.setScalar(.75); cl.position.set(-1.6, 0, -.6); sc.add(cl);
  const st = sticker(cp, p.sticker || 'PAGAS AL RECIBIR', { y: 1330, cls: 'grande' });
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [3, 3.6, 16], [1.2, 3.2, 13.5], [0, 1.8, 0]); const k = eout(win(t, 0, d * .45)); mt.position.set(lerp(7, 1.8, k), 0, .8); mt.rotation.y = 0; rep.position.set(mt.position.x, .5, .8);
    animPersona(rep, t, { accion: k > .95 ? 'señalar' : 'idle' }); cs.userData.puerta.rotation.y = -1.3 * eout(win(t, d * .35, d * .55)); animPersona(cl, t, { accion: t > d * .55 ? 'celebrar' : 'idle', fase: 1 }); st.set(win(t, d * .55, d * .55 + .35)); } };
});
// 12. COMENTARIO (cierre/CTA): barra de comentario que escribe la palabra clave + héroe pequeño
def('comentario', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const H = crearHeroe(p.heroe || 'frasco', p); sc.add(H.obj); H.obj.position.x = 0; H.obj.position.z = 0; cam.userData.off = -.2;
  const bar = el('div', 'combar', cp, `<div class="av"></div><div class="txt"></div><div class="send">➤</div>`); const tx = bar.querySelector('.txt'); const pal = p.palabra || 'LAVANDA';
  const pre = p.encima ? el('div', 'comentaEncima', cp, p.encima) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.6, 12.5], [0, 2.4, 10.5], [0, 1.0, 0]); H.anim(t, d);
    const kb = win(t, 0, .35); bar.style.opacity = kb; bar.style.transform = `translate(-50%,-50%) scale(${.8 + .2 * back(kb)})`; const n = Math.floor(clamp((t - .4) / (d * .5)) * pal.length); tx.innerHTML = pal.slice(0, n) + '<span class="cur">|</span>';
    if (pre) pre.style.opacity = win(t, .1, .4); } };
});
// 13. INGREDIENTES: botánicos orbitando alrededor del frasco (lavanda, manzanilla, hojas)
def('ingredientes', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const fr = frasco({ aroma: p.aroma }); sc.add(fr); const orb = new THREE.Group(); orb.position.y = 1.4; sc.add(orb);
  const lista = p.aroma === 'citronela' ? ['hoja', 'hoja2', 'hoja', 'hoja2', 'gota'] : ['lav', 'man', 'lav', 'man', 'gota'];
  lista.forEach((k, i) => { let o; if (k === 'lav') { o = lavanda(3); o.scale.setScalar(.6); } else if (k === 'man') o = manzanilla(1.1); else if (k === 'hoja') o = hoja('#3f9a4b', 1.1); else if (k === 'hoja2') o = hoja('#9bcf53', .9); else o = gota('#ffe08a', .2); const a = i / lista.length * Math.PI * 2; o.userData.a = a; orb.add(o); });
  const labs = (p.chips || []).map((c, i) => chip(cp, c, i % 2 ? 770 : 310, 1450 + Math.floor(i / 2) * 100));
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 3.0, 13], [0, 2.4, 11], [0, 1.3, 0]); animFrasco(fr, t, { expr: 'feliz' }); fr.rotation.y = Math.sin(t * .7) * .3;
    orb.children.forEach((o, i) => { const a = o.userData.a + t * .9; o.position.set(Math.cos(a) * 3.1, Math.sin(a * 2) * .6 + .6, Math.sin(a) * 2.3); o.rotation.set(t + i, t * 1.3, i); o.scale.setScalar(1.6); });
    labs.forEach((c, i) => c.set(win(t, .3 + i * .45, .65 + i * .45))); } };
});
// 14. SELLO: MITO / REALIDAD / VERDAD que cae sobre la escena con un objeto
def('sello', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa(); const H = crearHeroe(p.heroe || 'nube', p); sc.add(H.obj);
  const st = sticker(cp, p.texto || 'MITO', { y: 1150, cls: (p.tipo || 'mito') + ' sello', rot: -12 }); const fr = p.frase ? el('div', 'fraseSello', cp, p.frase) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.4, 13], [0, 2.2, 11], [0, 1.6, 0]); H.anim(t, d); const k = win(t, d * .35, d * .35 + .3); st.set(k); if (k > 0 && k < 1) cam.position.x += Math.sin(t * 80) * .06 * (1 - k); if (fr) fr.style.opacity = win(t, .1, .4); } };
});
// 15. DATO: objeto libre del dato curioso (frutas, plantas, cuerpo…) — p.objeto = nombre en OBJETOS o 'custom' con p.js
def('dato', (p) => {
  const E = estudio({ rejilla: !!p.rejilla }); const sc = E.sc, cam = E.cam; const cp = capa();
  const o = (OBJETOS[p.objeto] || OBJETOS.hoja)(p); sc.add(o); o.position.y = p.y ?? 1.6; const ped = p.pedestal ? pedestal() : null; if (ped) sc.add(ped);
  const big = p.grande ? el('div', 'palabraGig', cp, p.grande) : null; const lab = p.etiqueta ? etiqueta(cp, p.etiqueta, {}) : null;
  const chips = (p.chips || []).map((c, i) => chip(cp, c, 540, 1200 + i * 120));
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [p.cx ?? 0, 2.4, 12.5], [-(p.cx ?? 0) * .5, 2.2, 10.2], [0, 1.6, 0]); o.userData.tick?.(t); o.rotation.y = t * (p.giro ?? .6); o.position.y = (p.y ?? 1.6) + Math.sin(t * 1.8) * .1; o.scale.setScalar((p.escala || 1) * back(win(t, 0, .45)));
    if (big) { const k = win(t, .2, .5); big.style.opacity = k; big.style.transform = `translate(-50%,0) scale(${.7 + .3 * back(k)})`; } if (lab) { const [x, y] = proyectar(o, cam, [.6, .8, 0]); lab.set(x + 160, y - 170, x, y, win(t, .4, .7)); } chips.forEach((c, i) => c.set(win(t, .5 + i * .4, .8 + i * .4))); } };
});
// 16. QUIZ (mejora 2026-11-17): pregunta tipo encuesta de historias + 2–3 opciones que entran una por una;
// a mitad de escena se "revela" la correcta (se pinta del acento con ✓, las demás se apagan con ✗) con golpe de cámara.
// p = {pregunta (html), opciones:[...], correcta: índice, heroe, revela: segundo opcional, etiqueta}
def('quiz', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa();
  const H = crearHeroe(p.heroe || 'frasco', p); sc.add(H.obj); H.obj.position.set(0, 0, 0); cam.userData.off = .2;
  const gl = glow(PAL.acento, 6, .28); gl.position.set(0, 2, -1.5); sc.add(gl);
  const preg = el('div', 'quizPreg', cp, `<span class="qi">?</span>${p.pregunta || '¿Tú qué crees?'}`);
  const ops = (p.opciones || ['A', 'B']).map((o, i) => { const e = el('div', 'quizOp', cp, `<span class="ql">${'ABC'[i]}</span><span class="qt">${o}</span><span class="qm"></span>`); e.style.top = (1230 + i * 132) + 'px'; return e; });
  return { sc, cam, cp, upd(t, d) { E.tick(t); const rv = p.revela ?? d * .55; const kr = win(t, rv, rv + .25);
    camara(cam, t, 0, d, [0, 2.5, 13.5], [0, 2.3, 11.2], [0, 1.4, 0]); if (kr > 0 && kr < 1) { cam.position.z -= Math.sin(kr * Math.PI) * .9; cam.position.x += Math.sin(t * 70) * .05; }
    H.anim(t, d); H.obj.rotation.y = Math.sin(t * 1.2) * .35;
    const kp = win(t, 0, .3); preg.style.opacity = kp; preg.style.transform = `translate(-50%,0) scale(${.8 + .2 * back(kp)}) rotate(-1.5deg)`;
    ops.forEach((e, i) => { const k = win(t, .25 + i * .22, .55 + i * .22); const ok = i === (p.correcta ?? 0);
      e.style.opacity = kr > 0 && !ok ? 1 - .55 * kr : k; e.style.transform = `translate(-50%,0) translateX(${(1 - eout(k)) * (i % 2 ? 120 : -120)}px) scale(${kr > 0 && ok ? 1 + .08 * Math.sin(kr * Math.PI) + .04 : 1})`;
      e.classList.toggle('ok', kr > 0 && ok); e.classList.toggle('no', kr > 0 && !ok); e.querySelector('.qm').textContent = kr > 0 ? (ok ? '✓' : '✗') : ''; }); } };
});

// 17. MAPA (mejora 2026-11-18): mapa 3D de Colombia (relieve con borde neón) + pines que caen ciudad por ciudad con
// rutas que salen de un centro y se dibujan solas + nombres con etiqueta. Cierre "envíos a toda Colombia".
// p = {ciudades:[nombres de CIUDADES], centro:'Bogotá', sticker, frasco:true, aroma, titulo (html arriba)}
export const COLOMBIA = [[-71.67,12.46],[-71.1,12.1],[-71.33,11.85],[-72.2,11.1],[-72.7,10.4],[-73.0,9.3],[-72.8,8.6],[-72.45,7.9],[-72.0,7.0],[-70.9,7.05],[-70.1,6.95],[-69.4,6.1],[-67.5,6.2],[-67.6,5.4],[-67.85,4.4],[-67.3,3.4],[-67.85,2.8],[-67.2,2.3],[-66.9,1.2],[-67.6,2.0],[-68.2,1.7],[-69.8,1.7],[-69.2,1.0],[-70.05,0.6],[-70.05,-0.15],[-69.4,-1.1],[-69.95,-4.2],[-70.7,-3.8],[-72.0,-2.4],[-72.9,-2.4],[-73.6,-1.2],[-74.8,-0.2],[-75.6,0.0],[-77.4,0.4],[-78.1,0.9],[-78.85,1.45],[-78.6,2.6],[-77.4,3.9],[-77.4,5.5],[-77.5,6.6],[-77.9,7.2],[-77.4,8.7],[-76.8,8.0],[-76.8,8.9],[-76.3,9.4],[-75.6,10.3],[-74.8,11.05],[-74.2,11.25],[-73.3,11.3],[-72.9,11.55],[-72.2,12.2]];
export const CIUDADES = { 'Bogotá': [-74.07, 4.71], 'Medellín': [-75.57, 6.24], 'Cali': [-76.53, 3.45], 'Barranquilla': [-74.8, 10.96], 'Cartagena': [-75.51, 10.39], 'Bucaramanga': [-73.12, 7.12], 'Pasto': [-77.28, 1.21], 'Leticia': [-69.94, -4.2], 'Pereira': [-75.69, 4.81], 'Cúcuta': [-72.5, 7.89], 'Villavicencio': [-73.63, 4.14], 'Santa Marta': [-74.2, 11.24], 'Neiva': [-75.28, 2.93] };
const geoXY = ([lo, la], s = .3) => [(lo + 73.5) * s, (la - 4) * s];
def('mapa', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const S = p.escalaMapa || .3; const mapa = new THREE.Group(); mapa.position.set(0, .05, 0); sc.add(mapa);
  const sh = new THREE.Shape(); COLOMBIA.forEach((c, i) => { const [x, y] = geoXY(c, S); i ? sh.lineTo(x, -y) : sh.moveTo(x, -y); }); sh.closePath();
  const tierra = mesh(new THREE.ExtrudeGeometry(sh, { depth: .28, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3 }), M.std(p.colorMapa || '#1f3a2c', .55, .15)); tierra.rotation.x = Math.PI / 2; tierra.position.y = .33; mapa.add(tierra);
  const pts = COLOMBIA.map(c => { const [x, y] = geoXY(c, S); return new THREE.Vector3(x, .4, -y); }); pts.push(pts[0].clone());
  const borde = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .1), 400, .035, 6, false), M.neon(PAL.acento)); mapa.add(borde); const glB = glow(PAL.acento, 9, .22); glB.position.y = .3; mapa.add(glB);
  const lista = p.ciudades || ['Barranquilla', 'Medellín', 'Bucaramanga', 'Cali', 'Pasto', 'Leticia']; const cen = CIUDADES[p.centro || 'Bogotá'];
  let [cx, cy] = geoXY(cen, S); cy = -cy; const hub = mesh(new THREE.CylinderGeometry(.22, .22, .1, 24), M.neon(PAL.acento2), cx, .45, cy); mapa.add(hub); const hubG = glow(PAL.acento2, 1.6, .7); hubG.position.set(cx, .6, cy); mapa.add(hubG);
  const pinM = M.std(PAL.acento, .3, .1, PAL.acento);
  const pines = lista.map((n, i) => { let [x, y] = geoXY(CIUDADES[n] || cen, S); y = -y; const pin = new THREE.Group(); pin.add(mesh(new THREE.ConeGeometry(.11, .45, 16), pinM, 0, .22, 0)).children[0].rotation.x = Math.PI; pin.add(mesh(new THREE.SphereGeometry(.16, 16, 12), pinM, 0, .5, 0)); pin.add(mesh(new THREE.SphereGeometry(.06, 10, 8), M.neon('#ffffff'), 0, .5, .13)); pin.position.set(x, .42, y); mapa.add(pin);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.12, .17, 32), new THREE.MeshBasicMaterial({ color: col(PAL.acento), transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .44, y); mapa.add(ring);
    const mid = new THREE.Vector3((x + cx) / 2, 1.2 + Math.hypot(x - cx, y - cy) * .35, (y + cy) / 2); const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(cx, .45, cy), mid, new THREE.Vector3(x, .45, y));
    const ruta = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, .025, 6, false), new THREE.MeshBasicMaterial({ color: col(PAL.acento2), transparent: true, opacity: .9 })); mapa.add(ruta); const total = ruta.geometry.index.count;
    const et = etiqueta(cp, n, { cls: i % 2 ? 'b' : 'a' }); return { pin, ring, ruta, total, et, n }; });
  let fr = null; if (p.frasco !== false) { fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.55); fr.position.set(2.05, 0, 1.3); fr.rotation.y = -.4; fr.rotation.x = -.5; sc.add(fr); }
  const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: 1340, x: 420, cls: 'grande', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); const a = -.08 + t * .06; const R0 = lerp(10.5, 8.6, ease(win(t, 0, d)));
    cam.position.set(Math.sin(a) * R0 * .25, lerp(11.5, 10, ease(win(t, 0, d))), lerp(6.2, 5.2, ease(win(t, 0, d)))); cam.lookAt(0, 0, -.5);
    mapa.scale.setScalar(.6 + .4 * back(win(t, 0, .5))); borde.material.color.set(PAL.acento); glB.material.opacity = .18 + .08 * Math.sin(t * 4);
    cam.updateMatrixWorld(); mapa.updateMatrixWorld(true);
    const paso = (d * .62) / Math.max(1, pines.length);
    pines.forEach((q, i) => { const t0 = .35 + i * paso; const k = win(t, t0, t0 + .35); q.pin.visible = k > 0; q.pin.position.y = .42 + (1 - back(k)) * 2.2; q.pin.scale.setScalar(Math.max(.01, k)); q.pin.rotation.y = t * 2;
      const kr = (t - t0 - .3); q.ring.visible = kr > 0; if (kr > 0) { const ph = (kr * .9) % 1; q.ring.scale.setScalar(1 + ph * 3); q.ring.material.opacity = (1 - ph) * .9; }
      q.ruta.geometry.setDrawRange(0, Math.floor(q.total * eout(win(t, t0 - .25, t0 + .25)) / 3) * 3);
      q.pin.updateMatrixWorld(true); const [x, y] = proyectar(q.pin, cam, [0, .3, 0]); const izq = x < 540; q.et.set(clamp(x + (izq ? -150 : 150), 170, 910), y - 90, x, y, win(t, t0 + .2, t0 + .45)); });
    hub.scale.setScalar(1 + .15 * Math.sin(t * 6)); if (fr) animFrasco(fr, t, { expr: 'feliz', saluda: t > d * .5, salto: t > d * .75 ? .5 : 0 });
    if (tit) { const k = win(t, 0, .3); tit.style.opacity = k; tit.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(k)})`; } if (st) st.set(win(t, d * .72, d * .72 + .3)); } };
});
// 18. LUPA (mejora 2026-11-18): "voltea el empaque": lista de ingredientes en una etiqueta + lupa 3D que la recorre y
// subraya con marcador la palabra clave. p = {lineas:[...], clave: índice de la línea a marcar, titulo, heroe:'aerosol', sticker}
def('lupa', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const lineas = p.lineas || ['INGREDIENTES:', 'Aqua, Alcohol, Parfum,', 'Aluminum Chlorohydrate,', 'Glycerin, Cyclomethicone']; const clave = p.clave ?? 2;
  const tex = canvasTex(900, 1100, (c, w, h, k = 0) => { c.fillStyle = '#f7f3ea'; rr(c, 0, 0, w, h, 40); c.fill(); c.fillStyle = '#d24b4b'; rr(c, 0, 0, w, 150, 40); c.fill(); c.fillRect(0, 100, w, 50);
    c.fillStyle = '#fff'; c.font = '800 64px P'; c.textAlign = 'center'; c.fillText(p.titulo || 'ANTITRANSPIRANTE', w / 2, 100); c.textAlign = 'left';
    lineas.forEach((L, i) => { const y = 260 + i * 120; c.font = (i === 0 ? '800 ' : '500 ') + '50px P'; if (i === clave && k > 0) { const tw = c.measureText(L).width; c.fillStyle = PAL.acento2 === '#ffffff' ? '#ffe14d' : PAL.acento2; c.globalAlpha = .85; rr(c, 50, y - 52, (tw + 30) * k, 72, 12); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = i === clave && k > .9 ? '#111' : '#3a3a3a'; c.fillText(L, 64, y); });
    c.fillStyle = '#9a9a9a'; c.font = '500 34px P'; c.fillText('Uso externo · 150 ml', 64, h - 60); });
  const et = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshStandardMaterial({ map: tex, roughness: .6, envMap: ENV, envMapIntensity: .3 })); et.position.set(0, 2.6, 0); et.castShadow = true; sc.add(et);
  const marco = mesh(rbox(3.75, 4.55, .1, .12), M.std('#15181c', .4, .3), 0, 0, -.12); et.add(marco);
  const lupa = new THREE.Group(); const aroL = mesh(new THREE.TorusGeometry(.75, .09, 16, 48), M.oro()); lupa.add(aroL); const lente = new THREE.Mesh(new THREE.CircleGeometry(.72, 48), M.vidrio()); lupa.add(lente);
  const mango = mesh(new THREE.CylinderGeometry(.1, .12, 1.3, 16), M.std('#3b2a1e', .5), .95, -.95, 0); mango.rotation.z = Math.PI / 4; lupa.add(mango); const glL = glow('#ffffff', 2.2, .25); lupa.add(glL); lupa.position.z = .8; sc.add(lupa);
  let H = null; if (p.heroe) { H = crearHeroe(p.heroe, p); H.obj.scale.setScalar(.5); H.obj.position.set(-2.1, 0, 1.2); H.obj.rotation.y = .4; sc.add(H.obj); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: 1560, x: 560, cls: 'grande', rot: -4 }) : null;
  const yLinea = i => 2.6 + 2.2 - (260 + i * 120 - 18) / 1100 * 4.4;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [.5, 2.8, 11.8], [0, 2.75, 10.2], [0, 2.75, 0]); et.rotation.y = Math.sin(t * .7) * .06;
    const kb = ease(win(t, .1, d * .45)); const yy = lerp(yLinea(0), yLinea(clave), kb); lupa.position.set(lerp(-.6, 2.05, kb) + Math.sin(t * 2) * .1, yy - .35, .8); lupa.rotation.z = Math.sin(t * 1.5) * .08;
    const km = win(t, d * .45, d * .7); redraw(tex, km); const zoom = win(t, d * .45, d * .6); if (zoom > 0 && zoom < 1) cam.position.z -= Math.sin(zoom * Math.PI) * .7;
    if (H) H.anim(t, d); if (st) st.set(win(t, d * .7, d * .7 + .3)); } };
});

// 19. SIGUESOL (mejora 2026-11-18): el sol cruza el cielo en arco (oriente → occidente) con cielo que pasa de amanecer
// a tarde, y un girasol gira la cabeza siguiéndolo (p.adulto = true: se queda mirando al oriente). p = {adulto, sticker, etiqueta}
def('sigueSol', (p) => {
  const E = estudio({ fogNear: 22, fogFar: 50 }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = .6;
  const gi = OBJETOS.girasol({ joven: !p.adulto, alto: 2.8, inclina: .05 }); gi.position.set(0, 1.45, 0); gi.scale.setScalar(p.adulto ? 1.05 : 1.4); sc.add(gi);
  const sol = OBJETOS.sol(); sol.scale.setScalar(.7); sc.add(sol); const luzSol = new THREE.PointLight(col('#ffcc66'), 60, 30, 1.5); sol.add(luzSol);
  const cerro = mesh(new THREE.SphereGeometry(9, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.std('#3d6b35', .9), 0, -7.6, -6); cerro.scale.set(1.6, 1, 1); sc.add(cerro);
  const lO = chip(cp, '☀️ ORIENTE', 230, 1180, ''), lW = chip(cp, 'OCCIDENTE 🌇', 850, 1180, ''); const st = p.sticker ? sticker(cp, p.sticker, { y: 1480, cls: 'grande', rot: -4 }) : null;
  const c0 = col(p.adulto ? '#1d2a44' : '#2b2240'), c1 = col('#3a4f7a'), c2 = col('#5a2d3f'); const cielo = new THREE.Color();
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 3.2, 13.5], [0, 3.0, 11.8], [0, 2.4, 0]);
    const k = ease(win(t, .2, d - .2)); const a = Math.PI * (1 - k); sol.position.set(lerp(-3.3, 3.3, k), 3.0 + Math.sin(a) * 2.2, -2.2); sol.rotation.z = t;
    cielo.copy(c0).lerp(k < .5 ? c1 : c2, k < .5 ? k * 2 : (k - .5) * 2); sc.background = cielo; sc.fog.color = cielo;
    const cab = gi.userData.cab; const yaw = p.adulto ? -1.15 : lerp(-1.0, 1.0, k); cab.rotation.y = yaw; cab.rotation.x = -.15 - (p.adulto ? .25 : Math.sin(Math.PI * k) * .35); gi.rotation.z = Math.sin(t * 1.4) * .02;
    lO.set(win(t, .1, .4)); lW.set(win(t, .3, .6)); if (st) st.set(win(t, d * .5, d * .5 + .3)); } };
});

// 20. EMPAQUE (mejora 2026-11-19): caja de envío de cartón abierta; el frasco cae adentro (rebota), las 4 solapas se
// cierran una por una, la cinta se pega de lado a lado y la guía de envío cae con golpe ("PAGO CONTRA ENTREGA").
// Cierre de promo. p = {ciudad, guia: 'PAGO CONTRA ENTREGA', aroma, sticker, titulo (html abajo), colorCaja}
export function cajaEnvio(o = {}) {
  const w = 2.4, h = 1.5, d = 1.8, e = .06; const g = new THREE.Group(); const carton = M.std(o.color || '#c8955a', .85), dentro = M.std('#9c6b38', .9);
  const lado = canvasTex(512, 320, (c, W_, H_) => { c.fillStyle = o.color || '#c8955a'; c.fillRect(0, 0, W_, H_); c.globalAlpha = .18; for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? '#7a4f22' : '#e2b27a'; c.fillRect(0, i * 8, W_, 3); } c.globalAlpha = .75; c.fillStyle = '#5a3a18'; c.font = '800 44px P'; c.fillText('↑↑', 30, 70); c.font = '700 30px P'; c.fillText('ESTE LADO ARRIBA', 100, 64); c.font = '800 54px P'; c.fillText('EcoVital', 30, H_ - 40); });
  const caraM = new THREE.MeshStandardMaterial({ map: lado, roughness: .85, envMap: ENV, envMapIntensity: .3 });
  g.add(mesh(rbox(w, e, d, .02), dentro, 0, e / 2, 0));
  const fr = mesh(rbox(w, h, e, .02), [carton, carton, carton, carton, caraM, dentro], 0, h / 2, d / 2); g.add(fr); g.add(mesh(rbox(w, h, e, .02), carton, 0, h / 2, -d / 2));
  [-1, 1].forEach(s => g.add(mesh(rbox(e, h, d, .02), carton, s * w / 2, h / 2, 0)));
  const piv = (x, y, z) => { const q = new THREE.Group(); q.position.set(x, y, z); return q; };
  const solapa = (pv, geo, pos) => { const m = mesh(geo, carton, ...pos); pv.add(m); g.add(pv); return pv; };
  const izq = solapa(piv(-w / 2, h, 0), rbox(w / 2, .04, d, .015), [w / 4, 0, 0]);
  const der = solapa(piv(w / 2, h, 0), rbox(w / 2, .04, d, .015), [-w / 4, 0, 0]);
  const fre = solapa(piv(0, h + .045, d / 2), rbox(w, .04, d / 2, .015), [0, 0, -d / 4]);
  const atr = solapa(piv(0, h + .045, -d / 2), rbox(w, .04, d / 2, .015), [0, 0, d / 4]);
  const L = w + .16; const cg = new THREE.BoxGeometry(L, .03, .42); cg.translate(L / 2, 0, 0); const cinta = mesh(cg, new THREE.MeshPhysicalMaterial({ color: col('#d8b47a'), roughness: .25, transparent: true, opacity: .8, clearcoat: 1 }), -L / 2, h + .09, 0); cinta.scale.x = .001; g.add(cinta);
  const cinta2 = mesh(new THREE.BoxGeometry(.42, h * .55, .03), cinta.material, 0, h - h * .275 + .02, d / 2 + .045); cinta2.scale.y = .001; g.add(cinta2);
  g.userData = { izq, der, fre, atr, cinta, cinta2, w, h, d, abrir(k) { izq.rotation.z = 2.07 * k; der.rotation.z = -2.07 * k; fre.rotation.x = 2.07 * k; atr.rotation.x = -2.07 * k; } };
  g.userData.abrir(1); return g;
}
def('empaque', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const cj = cajaEnvio({ color: p.colorCaja }); cj.rotation.y = -.35; sc.add(cj); const u = cj.userData;
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.75); sc.add(fr);
  const hojas = [0, 1, 2, 3, 4].map(i => { const hh = i % 2 ? hoja('#9bcf53', .5) : (p.aroma === 'citronela' ? hoja('#3f9a4b', .5) : manzanilla(.5)); sc.add(hh); return hh; });
  const guiaTex = canvasTex(600, 400, (c, w, h) => { c.fillStyle = '#ffffff'; rr(c, 0, 0, w, h, 18); c.fill(); c.fillStyle = PAL.acento; rr(c, 0, 0, w, 96, 18); c.fill(); c.fillRect(0, 60, w, 36);
    c.fillStyle = '#0b0f0c'; c.font = '800 46px P'; c.textAlign = 'center'; c.fillText('ENVÍO · ' + (p.ciudad || 'COLOMBIA').toUpperCase(), w / 2, 66);
    c.fillStyle = '#111'; c.font = '900 52px P'; (p.guia || 'PAGO CONTRA|ENTREGA').split('|').forEach((l, i) => c.fillText(l, w / 2, 170 + i * 60));
    c.textAlign = 'left'; for (let i = 0; i < 46; i++) { c.fillStyle = '#111'; c.fillRect(40 + i * 11, 290, i % 3 ? 4 : 8, 74); } c.font = '600 26px P'; c.fillStyle = '#555'; c.fillText('EcoVital · 60 g', 40, 388); });
  const guia = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .9), new THREE.MeshStandardMaterial({ map: guiaTex, roughness: .6, transparent: true, envMap: ENV, envMapIntensity: .3 })); guia.position.set(.42, u.h * .47, u.d / 2 + .04); cj.add(guia);
  const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: 1380, x: 560, cls: 'grande', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [3.2, 5.6, 9.6], [1.6, 4.4, 7.6], [0, .9, 0]);
    // 1) el frasco cae dentro con rebote
    const kc = win(t, 0, d * .22); const yb = kc < 1 ? lerp(3.4, .1, kc * kc) : .1 + Math.abs(Math.sin(win(t, d * .22, d * .22 + .35) * Math.PI)) * .25 * (1 - win(t, d * .22, d * .22 + .35));
    const duck = ease(win(t, d * .33, d * .42)); fr.scale.set(.75 * (1 - .3 * duck), .75 * (1 - .4 * duck), .75 * (1 - .3 * duck));
    fr.position.set(0, yb, 0); fr.rotation.y = -.35 + Math.sin(t * 2) * .2; fr.visible = t < d * .62; animFrasco(fr, t, { expr: kc < 1 ? 'sorpresa' : 'feliz', saluda: kc >= 1, bob: 0 });
    hojas.forEach((hh, i) => { const k = win(t, d * .12 + i * .08, d * .32 + i * .08); hh.position.set(Math.sin(i * 2.1) * .7, lerp(5 + i * .3, .9 + i * .05, eout(k)), Math.cos(i * 2.1) * .45); hh.rotation.set(t * 2 + i, i, t + i); hh.visible = k > 0 && t < d * .62; });
    // 2) solapas se cierran (laterales primero), 3) cinta, 4) guía con golpe
    const k1 = ease(win(t, d * .36, d * .46)), k2 = ease(win(t, d * .44, d * .56));
    u.izq.rotation.z = 2.07 * (1 - k1); u.der.rotation.z = -2.07 * (1 - k1); u.fre.rotation.x = 2.07 * (1 - k2); u.atr.rotation.x = -2.07 * (1 - k2);
    const kt = eout(win(t, d * .56, d * .66)); u.cinta.scale.x = Math.max(.001, kt); u.cinta2.scale.y = Math.max(.001, eout(win(t, d * .62, d * .68)));
    const kg = win(t, d * .66, d * .72); guia.material.opacity = kg; guia.scale.setScalar(lerp(1.5, .8, eout(kg))); guia.rotation.z = lerp(-.4, -.06, eout(kg));
    if (kg > 0 && kg < 1) { cam.position.x += Math.sin(t * 80) * .05; cam.position.y += Math.sin(t * 65) * .04; }
    cj.position.y = t > d * .8 ? Math.abs(Math.sin((t - d * .8) * 9)) * .12 * (1 - win(t, d * .8, d)) : 0; cj.scale.y = 1 - (kc > .97 && kc < 1 ? .04 : 0);
    if (tit) { const k = win(t, 0, .3); tit.style.opacity = k; tit.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(k)})`; } if (st) st.set(win(t, d * .76, d * .76 + .3)); } };
});
// sonidos por plantilla (mejora 2026-11-19): SFX[plantilla] = (inicio, duración, p) => [{t, tipo}] — también desde "custom"
export const SFX = {
  empaque: (st, d, p) => [{ t: st + d * .22, tipo: 'pop' }, { t: st + d * .45, tipo: 'whoosh' }, { t: st + d * .6, tipo: 'teclas', d: d * .08 }, { t: st + d * .67, tipo: 'golpe' }, ...(p.sticker ? [{ t: st + d * .78, tipo: 'pop' }] : [])],
  celular: (st, d, p) => p.pantalla === 'rastreo' ? [0, 1, 2, 3].map(i => ({ t: st + d * (.12 + i * .2), tipo: 'pop' })) : [],
};

// héroes reutilizables
export function crearHeroe(tipo, p = {}) {
  if (tipo === 'frasco') { const f = frasco({ aroma: p.aroma }); return { obj: f, anim: (t, d) => animFrasco(f, t, { expr: p.expr || 'feliz', hablar: p.hablar ?? .5, saluda: p.saluda, salto: p.salto, brazosArriba: p.brazosArriba }) }; }
  if (tipo === 'frasco2') { const g = new THREE.Group(); const a = frasco({ aroma: 'lavanda' }), b = frasco({ aroma: 'citronela' }); a.position.x = -1.2; b.position.x = 1.2; a.rotation.y = .3; b.rotation.y = -.3; g.add(a); g.add(b); return { obj: g, anim: (t) => { animFrasco(a, t, { expr: 'feliz', hablar: .3 }); animFrasco(b, t, { expr: 'guiño', fase: 1.5 }); } }; }
  if (tipo === 'aerosol') { const a = aerosol(); return { obj: a, anim: (t) => { a.rotation.z = Math.sin(t * 2) * .04; a.position.y = Math.abs(Math.sin(t * 2.5)) * .08; a.userData.cejas.forEach((c, i) => c.rotation.z = (i ? .4 : -.4) + Math.sin(t * 6) * .05); } }; }
  if (tipo === 'nube') { const n = nubeOlor(); n.position.y = 1.6; return { obj: n, anim: (t) => { n.position.y = 1.6 + Math.sin(t * 2) * .12; n.rotation.z = Math.sin(t * 1.6) * .08; } }; }
  if (tipo === 'reloj') { const r = relojArena({ color: PAL.acento }); return { obj: r, anim: (t, d) => { r.rotation.y = t * .3; animReloj(r, clamp(.2 + t / d * .5)); } }; }
  if (tipo === 'persona') { const pe = persona(p.persona || {}); return { obj: pe, anim: (t) => animPersona(pe, t, { accion: p.accion || 'hablar' }) }; }
  if (OBJETOS[tipo]) { const o = OBJETOS[tipo](p); o.position.y = 1.4; if (p.escalaHeroe) o.scale.setScalar(p.escalaHeroe); return { obj: o, anim: (t) => { o.userData.tick?.(t); o.rotation.y = t * (p.giroHeroe ?? .6); } }; }
  const f = frasco({}); return { obj: f, anim: t => animFrasco(f, t, {}) };
}
// objetos para datos curiosos (añadir más cada día según el tema)
export const OBJETOS = {
  hoja: p => hoja(p.color || '#3f9a4b', 2),
  lavanda: () => lavanda(9),
  manzanilla: () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const f = manzanilla(.9); f.position.set((i - 2) * .7, Math.sin(i) * .4, (i % 2) * .4); g.add(f); } return g; },
  gota: () => gota('#6cc4ff', .8),
  limon: () => { const g = new THREE.Group(); const m = mesh(new THREE.SphereGeometry(.9, 32, 24), M.std('#f5d636', .45)); m.scale.set(1.25, 1, 1); g.add(m); [-1, 1].forEach(s => g.add(mesh(new THREE.SphereGeometry(.2, 12, 12), M.std('#f5d636', .45), s * 1.12, 0, 0))); return g; },
  manzana: () => { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.9, 32, 24), M.std('#d93a3a', .35))); g.add(mesh(new THREE.CylinderGeometry(.04, .05, .4, 8), M.std('#5b3a1e', .7), 0, .95, 0)); const h = hoja('#4caf50', .5); h.position.set(.25, 1.05, 0); h.rotation.z = -.8; g.add(h); return g; },
  cerebro: () => { const g = new THREE.Group(); const m = M.std('#f4a6b8', .6); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = .55; g.add(mesh(new THREE.SphereGeometry(.38, 14, 12), m, Math.cos(a) * r, Math.sin(i * 1.7) * .35, Math.sin(a) * r * .8)); } return g; },
  corazon: () => { const sh = new THREE.Shape(); sh.moveTo(0, -.9); sh.bezierCurveTo(-1.6, .2, -.6, 1.2, 0, .45); sh.bezierCurveTo(.6, 1.2, 1.6, .2, 0, -.9); const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: .4, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 4 }), M.std('#e8455a', .35)); m.geometry.center(); return m; },
  sol: () => { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.8, 32, 24), M.std('#ffcc4d', .5, 0, '#ffb000'))); for (let i = 0; i < 12; i++) { const r = mesh(new THREE.ConeGeometry(.12, .5, 8), M.std('#ffcc4d', .5, 0, '#ffb000')); const a = i / 12 * Math.PI * 2; r.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0); r.rotation.z = a - Math.PI / 2; g.add(r); } g.add(glow('#ffcc4d', 5, .4)); return g; },
  frasco: p => { const f = frasco({ aroma: p.aroma }); f.position.y = -1.2; const g = new THREE.Group(); g.add(f); return g; },
  // (2026-11-17) camiseta blanca con mancha amarilla en la axila (p.mancha=false la deja limpia; p.color cambia la tela)
  camiseta: p => { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-.75, -1.1); sh.lineTo(.75, -1.1); sh.lineTo(.75, .35); sh.lineTo(1.25, .05); sh.lineTo(1.55, .55); sh.lineTo(.85, 1.05); sh.quadraticCurveTo(.3, 1.15, .28, 1.0); sh.quadraticCurveTo(0, .72, -.28, 1.0); sh.quadraticCurveTo(-.3, 1.15, -.85, 1.05); sh.lineTo(-1.55, .55); sh.lineTo(-1.25, .05); sh.lineTo(-.75, .35); sh.closePath();
    const tela = mesh(new THREE.ExtrudeGeometry(sh, { depth: .18, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3 }), M.std(p.color || '#f7f7f4', .85)); tela.position.z = -.09; g.add(tela);
    const cuello = mesh(new THREE.TorusGeometry(.29, .045, 8, 24, Math.PI), M.std('#e4e4de', .8), 0, 1.0, .16); cuello.rotation.z = Math.PI; g.add(cuello);
    if (p.mancha !== false) { const mt = new THREE.MeshBasicMaterial({ color: col('#d4a72c'), transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide }); [-1, 1].forEach(s => [.2, -.2].forEach(z => { [[.0, 0, .34], [.14, -.16, .26], [-.1, -.2, .2]].forEach(([dx, dy, r]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mt); m.position.set(s * (.74 + dx), .18 + dy, z); g.add(m); }); })); }
    g.children.forEach(c => c.position.y += .5); return g; },
  // (2026-11-17) zanahoria con color (naranja por defecto; '#5b2a6e' morada, '#f2c14e' amarilla, '#f3eedf' blanca)
  zanahoria: p => { const g = new THREE.Group(); const c = p.color || '#f07f22'; const raiz = mesh(new THREE.ConeGeometry(.42, 2.4, 24), M.std(c, .55)); raiz.rotation.z = Math.PI; g.add(raiz);
    for (let i = 0; i < 6; i++) { const r = mesh(new THREE.TorusGeometry(.42 - i * .06, .015, 6, 24), M.std(c, .7), 0, .8 - i * .32, 0); r.rotation.x = Math.PI / 2; r.scale.setScalar(.98); g.add(r); }
    for (let i = 0; i < 5; i++) { const h = hoja('#4f9d3a', .55); h.scale.set(.4, 1.5, .4); h.position.set(Math.sin(i * 1.3) * .12, 1.55, Math.cos(i * 1.3) * .12); h.rotation.set(Math.sin(i * 2) * .5, i * 1.2, Math.cos(i * 2) * .45); g.add(h); } return g; },
  // (2026-11-18) girasol: tallo, hojas, cabeza con semillas en espiral (filotaxis) y 2 coronas de pétalos. p.joven = botón pequeño; p.inclina = inclinación de la cabeza
  girasol: p => { const g = new THREE.Group(); const verde = M.std('#4f8f3a', .6); const alto = p.alto || 2.6; g.add(mesh(new THREE.CylinderGeometry(.07, .1, alto, 10), verde, 0, alto / 2 - 1.2, 0));
    [[-1, .3], [1, .9], [-1, 1.4]].forEach(([s, y]) => { const h = hoja('#4f9d3a', .9); h.scale.set(.8, 1, .8); h.position.set(s * .38, y - 1.2, 0); h.rotation.z = s * -1.0; g.add(h); });
    const cab = new THREE.Group(); cab.position.set(0, alto - 1.15, .08); cab.rotation.x = -(p.inclina ?? .15); g.add(cab); const R0 = p.joven ? .32 : .6;
    const sem = canvasTex(512, 512, (c, w) => { c.fillStyle = '#4a2a12'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill(); for (let i = 0; i < 520; i++) { const r = Math.sqrt(i) * 10.5, a = i * 2.39996; c.fillStyle = i % 3 ? '#2e1a0b' : '#6b4320'; c.beginPath(); c.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 5.2, 0, 7); c.fill(); } });
    const disco = mesh(new THREE.CylinderGeometry(R0, R0, .18, 40), [M.std('#3a2410', .8), new THREE.MeshStandardMaterial({ map: sem, roughness: .9 }), M.std('#3a2410', .8)]); disco.rotation.x = Math.PI / 2; cab.add(disco);
    if (!p.joven) { [[22, 1, 0], [22, .86, Math.PI / 22]].forEach(([n, sc2, off], capa2) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + off; const pt = mesh(new THREE.CapsuleGeometry(.09, .42, 4, 8), M.std(capa2 ? '#f7b500' : '#ffd21f', .5)); pt.scale.set(1.3 * sc2, sc2, .35); pt.position.set(Math.cos(a) * (R0 + .2), Math.sin(a) * (R0 + .2), -.02 - capa2 * .04); pt.rotation.z = a - Math.PI / 2; cab.add(pt); } }); }
    else { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const s2 = mesh(new THREE.ConeGeometry(.12, .4, 8), verde); s2.position.set(Math.cos(a) * .3, Math.sin(a) * .3, -.05); s2.rotation.z = a - Math.PI / 2; cab.add(s2); } }
    g.userData.cab = cab; return g; },
  // (2026-11-18) bacteria simpática (grupo de 3 si p.grupo) y abeja con alas
  bacteria: p => { const g = new THREE.Group(); const una = (c, s) => { const b = new THREE.Group(); const cu = mesh(new THREE.CapsuleGeometry(.45, .7, 8, 20), M.std(c, .45, 0, c)); cu.material.emissiveIntensity = .15; cu.rotation.z = Math.PI / 2; b.add(cu);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const ci = mesh(new THREE.CylinderGeometry(.025, .025, .3, 6), M.std(c, .6), Math.cos(a) * .95, Math.sin(a) * .5, 0); ci.rotation.z = a - Math.PI / 2; b.add(ci); }
      const om = M.std('#14140f', .3); [-1, 1].forEach(s2 => { const e = mesh(new THREE.SphereGeometry(.09, 12, 10), om, s2 * .2, .1, .42); e.scale.z = .5; b.add(e); b.add(mesh(new THREE.SphereGeometry(.03, 8, 8), M.neon('#fff'), s2 * .2 + .03, .14, .47)); });
      const bo = mesh(new THREE.TorusGeometry(.13, .03, 8, 16, Math.PI), om, 0, -.12, .43); bo.rotation.z = Math.PI; b.add(bo); b.scale.setScalar(s); return b; };
    g.add(una(p.color || '#8bd450', 1)); if (p.grupo !== false) { const b2 = una('#e9c46a', .6); b2.position.set(-1.3, .8, -.4); g.add(b2); const b3 = una('#7fd1ff', .5); b3.position.set(1.3, -.6, -.3); g.add(b3); } return g; },
  abeja: p => { const g = new THREE.Group(); const tex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1712'; for (let i = 0; i < 3; i++) c.fillRect(70 + i * 55, 0, 26, h); });
    const cu = mesh(new THREE.CapsuleGeometry(.5, .8, 8, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: .5 })); cu.rotation.z = Math.PI / 2; g.add(cu);
    const om = M.std('#1b1712', .3); [-1, 1].forEach(s => { g.add(mesh(new THREE.SphereGeometry(.09, 10, 10), om, -.75, .15, s * .3)); const an = mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), om, -.85, .6, s * .15); an.rotation.z = .5; g.add(an); });
    const alaM = new THREE.MeshPhysicalMaterial({ color: col('#e8f6ff'), transparent: true, opacity: .55, roughness: .1, side: THREE.DoubleSide, depthWrite: false }); g.userData.alas = [-1, 1].map(s => { const a = new THREE.Mesh(new THREE.CircleGeometry(.45, 24), alaM); a.scale.set(1.3, .7, 1); a.position.set(0, .55, s * .15); a.rotation.x = -Math.PI / 2 + s * .5; g.add(a); return a; });
    g.add(mesh(new THREE.ConeGeometry(.08, .25, 8), om, 1.0, 0, 0)).children.at(-1).rotation.z = -Math.PI / 2; g.rotation.y = -.5; return g; },
  // (2026-11-19) árbol frondoso (tronco con ramas + copa de esferas facetadas en 3 verdes) que "suda": vapor que sube de la copa (p.vapor=false lo apaga)
  arbol: p => { const g = new THREE.Group(); const cor = M.std('#6b4a2e', .8); const tr = mesh(new THREE.CylinderGeometry(.22, .36, 2.2, 12), cor, 0, -.3, 0); g.add(tr);
    [[-1, .35, .9], [1, .5, -.8]].forEach(([s2, y, rz]) => { const r = mesh(new THREE.CylinderGeometry(.07, .12, 1.1, 8), cor, s2 * .32, y, 0); r.rotation.z = rz; g.add(r); });
    const verdes = ['#2f7d3a', '#3f9a4b', '#5bb35a']; const copa = new THREE.Group(); copa.position.y = 1.35; g.add(copa);
    [[0, .5, 0, 1.05], [-.85, .1, .2, .8], [.85, .15, .1, .82], [-.4, .95, -.2, .75], [.45, 1.0, .1, .72], [0, -.2, .6, .7], [-.6, -.25, -.4, .65], [.6, -.2, -.45, .66], [0, 1.4, 0, .55]].forEach(([x, y, z, r], i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: col(verdes[i % 3]), roughness: .7, flatShading: true, envMap: ENV, envMapIntensity: .5 })); m.position.set(x, y, z); m.castShadow = true; copa.add(m); });
    const vap = []; if (p.vapor !== false) for (let i = 0; i < 16; i++) { const s2 = glow('#d9f2ff', .7 + (i % 4) * .15, .5); s2.userData = { x: Math.sin(i * 2.4) * 1.1, z: Math.cos(i * 2.4) * .7, f: i / 16 }; g.add(s2); vap.push(s2); }
    g.userData.tick = t => { copa.rotation.z = Math.sin(t * 1.3) * .03; vap.forEach(v => { const ph = (t * .35 + v.userData.f) % 1; v.position.set(v.userData.x + Math.sin(t + v.userData.f * 9) * .15, 2.0 + ph * 2.6, v.userData.z); v.material.opacity = Math.sin(ph * Math.PI) * .45; }); };
    return g; },
  // (2026-11-19) hoja vista de cerca con estomas (poros con 2 células "labio") que se abren y cierran + vapor que sale de ellos
  estomas: p => { const g = new THREE.Group(); const tex = canvasTex(768, 1024, (c, w, h, ab = 1) => { c.save(); c.beginPath(); c.moveTo(w / 2, 20); c.bezierCurveTo(w * 1.05, h * .3, w * .9, h * .8, w / 2, h - 20); c.bezierCurveTo(w * .1, h * .8, -w * .05, h * .3, w / 2, 20); c.closePath(); c.clip();
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5fbf5a'); gr.addColorStop(1, '#2f7d3a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(220,255,200,.55)'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 20); c.stroke(); c.lineWidth = 5; for (let i = 1; i < 7; i++) { const y = i * h / 7.5; [-1, 1].forEach(s2 => { c.beginPath(); c.moveTo(w / 2, y + 40); c.quadraticCurveTo(w / 2 + s2 * 140, y, w / 2 + s2 * 300, y - 70); c.stroke(); }); }
      for (let i = 0; i < 14; i++) { const x = w / 2 + ((i % 2 ? 1 : -1) * (90 + (i * 53) % 170)), y = 170 + i * 52; c.fillStyle = '#9fe08a'; [-1, 1].forEach(s2 => { c.beginPath(); c.ellipse(x + s2 * (12 + 9 * ab), y, 14, 34, 0, 0, 7); c.fill(); }); c.fillStyle = '#123b18'; c.beginPath(); c.ellipse(x, y, 3 + 9 * ab, 26 * (.4 + .6 * ab), 0, 0, 7); c.fill(); }
      c.restore(); });
    const hj = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.47), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .55, envMap: ENV, envMapIntensity: .4 })); hj.castShadow = true; g.add(hj);
    const vap = []; for (let i = 0; i < 10; i++) { const s2 = glow('#e6f7ff', .5, .5); s2.userData = { x: ((i % 2 ? 1 : -1) * (90 + (i * 53) % 170)) / 768 * 2.6, y: 1.73 - (170 + i * 52) / 1024 * 3.47, f: i / 10 }; g.add(s2); vap.push(s2); }
    g.userData.tick = t => { const ab = .5 + .5 * Math.sin(t * 2.2); redraw(tex, ab); vap.forEach(v => { const ph = (t * .6 + v.userData.f) % 1; v.position.set(v.userData.x, v.userData.y + ph * .3, .1 + ph * 1.4); v.material.opacity = Math.sin(ph * Math.PI) * .55 * ab; }); };
    return g; },
  // (2026-11-19) caja de envío cerrada con cinta (para escenas de envío)
  cajaEnvio: p => { const g = new THREE.Group(); const c = cajaEnvio({ color: p.colorCaja }); c.userData.abrir(0); c.userData.cinta.scale.x = 1; c.userData.cinta2.scale.y = 1; c.position.y = -.75; g.add(c); return g; },
  zanahorias: p => { const g = new THREE.Group(); (p.colores || ['#5b2a6e', '#f2c14e', '#f07f22']).forEach((c, i, a) => { const z = OBJETOS.zanahoria({ color: c }); z.position.set((i - (a.length - 1) / 2) * 1.25, 0, i === 1 ? .4 : 0); z.rotation.z = (i - 1) * -.18; g.add(z); }); return g; },
};
// pantallas del celular
export const PANTALLAS = {
  chat: p => (c, w, h, k = 0) => { c.fillStyle = '#ece5dd'; c.fillRect(0, 0, w, h); c.fillStyle = '#075e54'; c.fillRect(0, 0, w, 120); c.fillStyle = '#fff'; c.font = '700 36px P'; c.fillText(p.contacto || 'EcoVital', 110, 75); c.beginPath(); c.arc(60, 62, 34, 0, 7); c.fillStyle = '#9be15d'; c.fill();
    (p.mensajes || [['c', 'Hola! ¿Hacen envíos?'], ['e', '¡Sí! A toda Colombia 🇨🇴'], ['e', 'Y pagas al recibir']]).forEach((m, i) => { const kk = clamp((k - i * .22) * 5); if (kk <= 0) return; const yo = m[0] === 'c'; c.globalAlpha = kk; c.font = '600 36px P'; const tw = c.measureText(m[1]).width + 56; const x = yo ? w - tw - 20 : 20, y = 170 + i * 128 + (1 - kk) * 30;
      c.fillStyle = yo ? '#dcf8c6' : '#fff'; rr(c, x, y, tw, 96, 24); c.fill(); c.fillStyle = '#111'; c.fillText(m[1], x + 28, y + 61); c.globalAlpha = 1; }); },
  comentarios: p => (c, w, h, k = 0) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 34px P'; c.textAlign = 'center'; c.fillText('Comentarios', w / 2, 80); c.textAlign = 'left';
    (p.coments || ['¡Me encantó la lavanda! 💜', 'Ya no vuelvo al de aluminio', '¿Hacen envíos a Cali?', 'Llegó rapidísimo 🙌']).forEach((m, i) => { const kk = clamp((k - i * .18) * 5); if (kk <= 0) return; c.globalAlpha = kk; const y = 150 + i * 150; c.beginPath(); c.arc(60, y + 30, 30, 0, 7); c.fillStyle = ['#b98cff', '#9be15d', '#ff8a3d', '#7fd1ff'][i % 4]; c.fill();
      c.fillStyle = '#aaa'; c.font = '600 24px P'; c.fillText(['@laura.m', '@andres_r', '@cami.co', '@julian23'][i % 4], 110, y + 18); c.fillStyle = '#fff'; c.font = '500 28px P'; c.fillText(m, 110, y + 58); c.fillStyle = '#ff4d6d'; c.fillText('♥', w - 60, y + 40); c.globalAlpha = 1; }); },
  // (2026-11-19) rastreo del pedido: pasos con línea que se llena y moto que avanza; al final "Pagas al recibir"
  rastreo: p => (c, w, h, k = 0) => { c.fillStyle = '#f6f7f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#10261a'; c.fillRect(0, 0, w, 150); c.fillStyle = '#fff'; c.font = '800 40px P'; c.fillText(p.titulo || 'Tu pedido', 40, 80); c.font = '500 26px P'; c.globalAlpha = .7; c.fillText(p.sub || 'EcoVital · Pedido #2611', 40, 122); c.globalAlpha = 1;
    const pasos = p.pasos || ['Pedido confirmado', 'Empacado 📦', 'En camino 🛵', 'Entregado 🏠']; const y0 = 250, dy = 165, x0 = 80; const kk = clamp(k * 1.15);
    c.strokeStyle = '#d9ddd6'; c.lineWidth = 12; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y0 + dy * (pasos.length - 1)); c.stroke();
    c.strokeStyle = '#2fbf71'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y0 + dy * (pasos.length - 1) * eout(kk)); c.stroke();
    pasos.forEach((s2, i) => { const on = kk >= i / (pasos.length - 1) - .001; const y = y0 + i * dy; c.fillStyle = on ? '#2fbf71' : '#d9ddd6'; c.beginPath(); c.arc(x0, y, on ? 30 : 24, 0, 7); c.fill(); if (on) { c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0 - 12, y); c.lineTo(x0 - 3, y + 10); c.lineTo(x0 + 13, y - 9); c.stroke(); }
      c.fillStyle = on ? '#111' : '#9aa09a'; c.font = (on ? '800 ' : '600 ') + '44px P'; c.fillText(s2, x0 + 56, y + 15); });
    if (kk > .78) { const a = clamp((kk - .78) * 6); c.globalAlpha = a; c.fillStyle = '#2fbf71'; rr(c, 30, 900, w - 60, 140, 28); c.fill(); c.fillStyle = '#fff'; c.font = '900 46px P'; c.textAlign = 'center'; c.fillText(p.final || 'Pagas al recibir 💵', w / 2, 987); c.textAlign = 'left'; c.globalAlpha = 1; } },
  pedido: p => (c, w, h, k = 0) => { c.fillStyle = '#0f1a14'; c.fillRect(0, 0, w, h); c.fillStyle = '#9be15d'; c.beginPath(); c.arc(w / 2, 330, 110 * eout(clamp(k * 3)), 0, 7); c.fill(); c.strokeStyle = '#0f1a14'; c.lineWidth = 18; c.lineCap = 'round'; const kk = clamp(k * 3 - .5); if (kk > 0) { c.beginPath(); c.moveTo(w / 2 - 50, 330); c.lineTo(w / 2 - 10, 370); c.lineTo(w / 2 + 55, 290); c.stroke(); }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 46px P'; c.fillText(p.titulo || '¡Pedido listo!', w / 2, 540); c.font = '500 30px P'; c.fillStyle = '#cfe9d2'; (p.lineas || ['Envío a toda Colombia', 'Pagas al recibir']).forEach((l, i) => c.fillText(l, w / 2, 620 + i * 54)); c.textAlign = 'left'; },
};

// ===================== MEJORA 2026-11-20 =====================
// Plantillas `botones` (concurso ¿MITO o REALIDAD? con 2 botones 3D que se presionan), `maleta` (formato "¿qué hay en mi
// maleta?": maleta de gimnasio 3D que se abre y saca un objeto, o lo guarda y se cierra con cremallera) y `pago` (cierre de
// promo: billetes que caen junto a la caja + sello PAGAS AL RECIBIR). Objetos: aguacate, aguacateAbierto, aguacatero,
// banano, bolsaPapel (truco del etileno), toalla, botella.
const perfilAguacate = (n = 26) => { const pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector2(Math.max(.001, Math.pow(Math.sin(Math.PI * k), .7) * (.9 - .42 * k)), k * 2.1)); } return pts; };
function texCascara(c1 = '#2f4a1f', c2 = '#466b2c') { return canvasTex(512, 512, (c, w, h) => { c.fillStyle = c1; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = i % 2 ? c2 : 'rgba(0,0,0,.25)'; c.beginPath(); c.arc((i * 97) % w, (i * 57 + (i * i) % 31) % h, 3 + (i % 4), 0, 7); c.fill(); } }); }
export function aguacate(o = {}) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ map: texCascara(o.c1, o.c2), roughness: .78, envMap: ENV, envMapIntensity: .5 });
  const cu = mesh(new THREE.LatheGeometry(perfilAguacate(), 40), m, 0, -1.05, 0); g.add(cu); g.add(mesh(new THREE.CylinderGeometry(.04, .06, .25, 8), M.std('#5b3a1e', .8), 0, 1.12, 0)); return g; }
export function aguacateAbierto(o = {}) { const g = new THREE.Group(); const pts = perfilAguacate();
  const casc = mesh(new THREE.LatheGeometry(pts, 32, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: texCascara(), roughness: .78, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .5 }), 0, -1.05, 0); g.add(casc);
  const forma = s => { const sh = new THREE.Shape(); pts.forEach((v, i) => i ? sh.lineTo(v.x * s, v.y * s + (1 - s) * 1.05 - 1.05) : sh.moveTo(v.x * s, v.y * s + (1 - s) * 1.05 - 1.05)); [...pts].reverse().forEach(v => sh.lineTo(-v.x * s, v.y * s + (1 - s) * 1.05 - 1.05)); return sh; };
  g.add(mesh(new THREE.ShapeGeometry(forma(.985)), M.std('#9cc44a', .6), 0, 0, .001)); g.add(mesh(new THREE.ShapeGeometry(forma(.8)), M.std('#e6e27a', .55), 0, -.06, .01));
  const sem = mesh(new THREE.SphereGeometry(.36, 24, 18), M.std('#8a5a2b', .35), 0, -.28, .02); sem.scale.z = .55; g.add(sem); return g; }
export function banano(o = {}) { const g = new THREE.Group(); const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1, .35, 0), new THREE.Vector3(0, -.45, 0), new THREE.Vector3(1, .35, 0));
  const tubo = mesh(new THREE.TubeGeometry(curva, 30, .2, 8, false), M.std(o.color || '#f6d23c', .5)); tubo.geometry.computeVertexNormals(); g.add(tubo);
  [[-1, .35], [1, .35]].forEach(([x, y], i) => { const p2 = mesh(new THREE.SphereGeometry(i ? .2 : .2, 10, 8), M.std(i ? '#f6d23c' : '#5b3a1e', .6), x, y, 0); g.add(p2); }); g.add(mesh(new THREE.CylinderGeometry(.07, .09, .3, 8), M.std('#7a8a2a', .6), 1.08, .55, 0)).children.at(-1).rotation.z = -.5; return g; }
export function bolsaPapel(o = {}) { const g = new THREE.Group(); const pap = M.std('#c9a06a', .9); const w = 1.7, h = 1.9, dp = 1.1;
  const cara = (ww, x, z, ry) => { const m = mesh(new THREE.PlaneGeometry(ww, h), pap, x, h / 2, z); m.rotation.y = ry; m.material.side = THREE.DoubleSide; g.add(m); };
  cara(w, 0, dp / 2, 0); cara(w, 0, -dp / 2, 0); cara(dp, w / 2, 0, Math.PI / 2); cara(dp, -w / 2, 0, Math.PI / 2); g.add(mesh(new THREE.BoxGeometry(w, .03, dp), pap, 0, .02, 0));
  g.add(mesh(new THREE.BoxGeometry(w + .04, .12, .04), M.std('#b38652', .9), 0, h - .06, dp / 2 + .01));
  const ag = aguacate(); ag.scale.setScalar(.5); ag.position.set(-.35, h - .05, 0); ag.rotation.z = .25; g.add(ag); const bn = banano(); bn.scale.setScalar(.48); bn.position.set(.35, h + .05, .05); bn.rotation.z = -.9; g.add(bn);
  const gas = []; for (let i = 0; i < 12; i++) { const s = glow('#d8ff8a', .55, .5); s.userData.f = i / 12; g.add(s); gas.push(s); }
  g.userData.tick = t => gas.forEach((s, i) => { const ph = (t * .45 + s.userData.f) % 1; s.position.set(Math.sin(i * 2.3 + t) * .55, h + .2 + ph * 1.6, Math.cos(i * 1.7) * .3); s.material.opacity = Math.sin(ph * Math.PI) * .6; }); g.position.y = -1; return g; }
export function toalla(o = {}) { const g = new THREE.Group(); const c = o.color || '#7fd1ff';
  const esp = canvasTex(256, 256, (cx, w) => { cx.fillStyle = c; cx.fillRect(0, 0, w, w); cx.strokeStyle = 'rgba(0,0,0,.22)'; cx.lineWidth = 5; cx.beginPath(); for (let a = 0; a < 26; a += .1) { const r = 4 + a * 4.6; cx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } cx.stroke(); });
  const lado = canvasTex(256, 128, (cx, w, h) => { cx.fillStyle = c; cx.fillRect(0, 0, w, h); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillRect(0, h * .72, w, 10); cx.fillRect(0, h * .82, w, 6); });
  const ro = mesh(new THREE.CylinderGeometry(.6, .6, 1.8, 36), [new THREE.MeshStandardMaterial({ map: lado, roughness: .95 }), new THREE.MeshStandardMaterial({ map: esp, roughness: .95 }), new THREE.MeshStandardMaterial({ map: esp, roughness: .95 })]); ro.rotation.z = Math.PI / 2; g.add(ro); return g; }
export function botella(o = {}) { const g = new THREE.Group(); const pts = [[.0, 0], [.45, 0], [.5, .1], [.5, 1.6], [.42, 1.85], [.25, 2.05], [.25, 2.2], [.001, 2.2]].map(([x, y]) => new THREE.Vector2(x, y));
  const vid = mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshPhysicalMaterial({ color: col('#dff4ff'), roughness: .08, transparent: true, opacity: .4, clearcoat: 1, envMap: ENV, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false }), 0, -1.1, 0); g.add(vid);
  g.add(mesh(new THREE.CylinderGeometry(.46, .46, 1.2, 32), new THREE.MeshPhysicalMaterial({ color: col('#59b8ff'), transparent: true, opacity: .55, roughness: .1, envMap: ENV }), 0, -.45, 0));
  g.add(mesh(new THREE.CylinderGeometry(.29, .29, .38, 24), M.std(o.tapa || PAL.acento, .4), 0, 1.25, 0)); return g; }
export function maletaGym(o = {}) { const g = new THREE.Group(); const c = o.color || '#262b36', ac = o.acento || PAL.acento; const L = 3.4, A = 1.7, H0 = 1.0;
  const base = mesh(rbox(L, H0, A, .25), M.std(c, .7), 0, H0 / 2, 0); g.add(base); g.add(mesh(new THREE.BoxGeometry(L - .5, .02, A - .3), M.std('#0c0d10', 1), 0, H0 - .02, 0));
  [-1, 1].forEach(s => g.add(mesh(rbox(.18, .9, A + .04, .06), M.std(ac, .5), s * (L / 2 - .5), .5, 0)));
  const tapa = new THREE.Group(); tapa.position.set(0, H0, -A / 2); g.add(tapa);
  const arco = mesh(new THREE.CylinderGeometry(A / 2, A / 2, L - .08, 32, 1, false, -Math.PI / 2, Math.PI), M.std(c, .7), 0, 0, A / 2); arco.rotation.z = Math.PI / 2; arco.scale.set(1, 1, 1); arco.material.side = THREE.DoubleSide; tapa.add(arco);
  [-1, 1].forEach(s => { const tp = mesh(new THREE.CircleGeometry(A / 2, 32, 0, Math.PI), M.std(c, .7), s * (L / 2 - .04), 0, A / 2); tp.rotation.y = s * Math.PI / 2; tp.material.side = THREE.DoubleSide; tapa.add(tp); });
  [-1, 1].forEach(s => { const as = mesh(new THREE.TorusGeometry(.42, .07, 10, 24, Math.PI), M.std('#15171c', .5), s * .55, A / 2 - .05, A / 2); as.rotation.y = Math.PI / 2; tapa.add(as); });
  const cierre = mesh(new THREE.BoxGeometry(L - .3, .05, .06), M.std('#c9ccd3', .3, .8), 0, H0 + .01, A / 2 - .02); g.add(cierre);
  const tirador = mesh(rbox(.16, .3, .08, .03), M.oro(), 0, H0 - .12, A / 2 + .05); g.add(tirador);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), M.neon(ac)); logo.position.set(0, .5, A / 2 + .01); g.add(logo);
  g.userData = { tapa, tirador, L, H0, A, abrir(k) { tapa.rotation.x = -1.9 * k; } }; return g; }
Object.assign(OBJETOS, {
  aguacate: p => aguacate(p), aguacateAbierto: p => aguacateAbierto(p), banano: p => banano(p), bolsaPapel: p => bolsaPapel(p), toalla: p => toalla(p), botella: p => botella(p),
  aguacates: p => { const g = new THREE.Group(); const a = aguacate(); a.position.set(-.75, 0, 0); a.rotation.z = .15; const b = aguacateAbierto(); b.position.set(.8, 0, .2); b.rotation.z = -.1; g.add(a); g.add(b); return g; },
  aguacatero: p => { const g = OBJETOS.arbol({ vapor: false }); [[-.75, 1.55, .95], [.55, 1.45, 1.0], [.05, 1.1, 1.15], [.95, 2.1, .7], [-.35, 2.25, .9], [-1.15, 1.9, .5]].forEach(([x, y, z], i) => { const a = aguacate(); a.scale.setScalar(.3); a.position.set(x, y, z); a.rotation.z = Math.sin(i) * .2; a.userData.f = i; g.add(a); g.userData.ag = (g.userData.ag || []).concat(a); });
    const tk = g.userData.tick; g.userData.tick = t => { tk?.(t); (g.userData.ag || []).forEach(a => a.rotation.z = Math.sin(t * 2 + a.userData.f) * .12); }; return g; },
});
// 21. BOTONES: concurso ¿MITO o REALIDAD? — consola con 2 botones 3D; a mitad de escena se presiona el correcto (luz, golpe)
// p = {frase (html), a:'MITO', b:'REALIDAD', correcta: 0|1, heroe (opcional, detrás), resultado: texto del sello, revela: s}
def('botones', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const cons = new THREE.Group(); sc.add(cons); cons.add(mesh(rbox(5.4, .7, 2.4, .2), M.std('#16191f', .35, .5), 0, .35, 0));
  const borde = new THREE.Mesh(new THREE.BoxGeometry(5.42, .04, 2.42), M.neon(PAL.acento)); borde.position.y = .72; cons.add(borde);
  const cols = [p.colorA || '#ff5a5a', p.colorB || PAL.acento]; const textos = [p.a || 'MITO', p.b || 'REALIDAD'];
  const bts = [-1, 1].map((s, i) => { const b = new THREE.Group(); b.position.set(s * 1.35, .7, .1); cons.add(b); b.add(mesh(new THREE.CylinderGeometry(.95, 1.0, .18, 40), M.std('#2a2e36', .4, .6), 0, .09, 0));
    const mat = new THREE.MeshStandardMaterial({ color: col(cols[i]), roughness: .3, metalness: .1, emissive: col(cols[i]), emissiveIntensity: .15, envMap: ENV }); const cap = mesh(new THREE.CylinderGeometry(.78, .82, .38, 40), mat, 0, .35, 0); b.add(cap);
    const lab = new THREE.Mesh(new THREE.CircleGeometry(.74, 40), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (c, w) => { c.fillStyle = i ? '#0b0f0c' : '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${textos[i].length > 5 ? 96 : 130}px P`; c.fillText(textos[i], w / 2, w / 2); }), transparent: true, toneMapped: false })); lab.rotation.x = -Math.PI / 2; lab.position.y = .2; cap.add(lab);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(.7, .95, 4.2, 32, 1, true), new THREE.MeshBasicMaterial({ color: col(cols[i]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); haz.position.y = 2.4; b.add(haz);
    const gl = glow(cols[i], 4, 0); gl.position.y = .8; b.add(gl); return { b, cap, mat, haz, gl }; });
  let H = null; if (p.heroe) { H = crearHeroe(p.heroe, p); H.obj.scale.multiplyScalar(.75); H.obj.position.set(0, 0, -2.4); sc.add(H.obj); }
  const fr = el('div', 'quizPreg', cp, `<span class="qi">?</span>${p.frase || ''}`); fr.style.whiteSpace = 'normal'; fr.style.width = '940px'; fr.style.top = (p.fraseY || 1330) + 'px'; fr.style.fontSize = '58px';
  const ok = p.correcta ?? 0; const st = sticker(cp, p.resultado || textos[ok], { y: p.resY || 760, cls: (ok ? 'realidad' : 'mito') + ' sello', rot: -9 });
  return { sc, cam, cp, upd(t, d) { E.tick(t); const rv = p.revela ?? d * .5; const kr = win(t, rv, rv + .22);
    camara(cam, t, 0, d, [0, 7.4, 12.6], [0, 6.6, 10.8], [0, .5, -.4]); if (kr > 0 && kr < 1) { cam.position.x += Math.sin(t * 75) * .06; cam.position.y += Math.sin(t * 60) * .05; }
    if (H) { H.anim(t, d); H.obj.rotation.y = Math.sin(t * 1.1) * .25; }
    bts.forEach((B, i) => { const el2 = back(win(t, .05 + i * .15, .4 + i * .15)); B.b.scale.setScalar(Math.max(.01, el2)); const esOk = i === ok;
      const pres = esOk ? Math.sin(Math.PI * kr) : 0; B.cap.position.y = .35 - .2 * pres; B.mat.emissiveIntensity = esOk ? .15 + .9 * kr : .15 * (1 - .8 * kr) + .05 * Math.sin(t * 6 + i);
      if (!esOk) B.mat.color.lerpColors(col(cols[i]), col('#4a4d55'), kr); B.haz.material.opacity = esOk ? .14 * kr * (.85 + .15 * Math.sin(t * 9)) : 0; B.gl.material.opacity = esOk ? .6 * kr : .15 * (1 - kr); });
    const kf = win(t, 0, .3); fr.style.opacity = kf; fr.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(kf)}) rotate(-1.2deg)`; st.set(win(t, rv + .08, rv + .4)); } };
});
// 22. MALETA (formato "¿qué hay en mi maleta?"): p = {modo:'sacar'|'guardar', item: clave de héroe/OBJETOS (frasco, toalla, botella…), aroma,
//     etiqueta (texto pegado al objeto), sticker, escalaItem, colorMaleta}
def('maleta', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const mg = maletaGym({ color: p.colorMaleta }); mg.rotation.y = -.25; sc.add(mg); const u = mg.userData; const guardar = p.modo === 'guardar';
  const I = crearHeroe(p.item || 'frasco', { ...p, giroHeroe: 0 }); const esc = p.escalaItem || (p.item === 'frasco' || !p.item ? .62 : .7); I.obj.scale.setScalar(esc); sc.add(I.obj);
  const chis = []; for (let i = 0; i < 14; i++) { const s = glow(i % 2 ? '#ffffff' : PAL.acento, .35, 0); s.userData.a = i / 14 * Math.PI * 2; sc.add(s); chis.push(s); }
  const lab = p.etiqueta ? etiqueta(cp, p.etiqueta, {}) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1400, cls: 'grande', rot: -5 }) : null;
  const yIn = .25, yOut = 2.3;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [2.6, 4.9, 13.4], [1.3, 4.4, 11.4], [0, 1.75, 0]); I.anim(t, d);
    let ab, ky;
    if (!guardar) { ab = back(win(t, d * .08, d * .3)); ky = back(win(t, d * .25, d * .55)); } else { ky = 1 - ease(win(t, d * .12, d * .42)); ab = 1 - ease(win(t, d * .42, d * .58)); }
    u.abrir(Math.max(0, ab)); const y = lerp(yIn, yOut, ky); I.obj.position.set(0, (p.item && p.item !== 'frasco' ? y + .9 * esc : y), .05); I.obj.visible = ky > .02 || !guardar && t > d * .2;
    if (p.item && p.item !== 'frasco') I.obj.rotation.y = Math.sin(t * 1.4) * .5; else I.obj.rotation.y = -.25 + Math.sin(t * 1.2) * .2;
    const kz = guardar ? eout(win(t, d * .58, d * .74)) : 1 - eout(win(t, d * .02, d * .14)); u.tirador.position.x = lerp(-u.L / 2 + .3, u.L / 2 - .3, kz) * (guardar ? 1 : -1);
    mg.position.y = guardar && t > d * .58 ? Math.abs(Math.sin((t - d * .58) * 10)) * .1 * (1 - win(t, d * .58, d * .9)) : 0;
    const tb = guardar ? t - d * .74 : t - d * .32; chis.forEach((s, i) => { const k = clamp(tb / .7); s.material.opacity = tb > 0 ? (1 - k) * .9 : 0; const r = .6 + k * 2.2; s.position.set(Math.cos(s.userData.a) * r, (guardar ? 1.4 : 2.2) + Math.sin(s.userData.a) * r * .6, .6); });
    if (lab) { cam.updateMatrixWorld(); const [x, yy] = proyectar(I.obj, cam, [.5, .3, 0]); lab.set(Math.min(790, x + 250), yy - 40, x, yy, guardar ? win(t, .1, .4) * (1 - win(t, d * .3, d * .4)) : win(t, d * .45, d * .6)); }
    if (st) st.set(win(t, guardar ? d * .72 : d * .62, (guardar ? d * .72 : d * .62) + .3)); } };
});
// 23. PAGO (cierre de promo): caja de envío cerrada + billetes genéricos que caen revoloteando y se apilan + sello "PAGAS AL RECIBIR"
// p = {sticker, titulo (html abajo), aroma, colorCaja}
def('pago', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const cj = cajaEnvio({ color: p.colorCaja }); cj.userData.abrir(0); cj.userData.cinta.scale.x = 1; cj.userData.cinta2.scale.y = 1; cj.position.set(.2, 0, -.4); cj.rotation.y = -.3; sc.add(cj);
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.55); fr.position.set(1.75, 0, 1.3); fr.rotation.y = -.5; sc.add(fr);
  const bill = (i) => canvasTex(512, 256, (c, w, h) => { const cc = ['#8fd19e', '#f4a3c4', '#9cc9f0'][i % 3]; c.fillStyle = cc; rr(c, 0, 0, w, h, 18); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 8; rr(c, 16, 16, w - 32, h - 32, 12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.arc(w * .72, h / 2, 74, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.6)'; c.font = '900 110px P'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', w * .72, h / 2 + 6); c.font = '800 46px P'; c.fillText('PAGO', w * .3, h / 2); });
  const billetes = []; for (let i = 0; i < 10; i++) { const m = mesh(new THREE.PlaneGeometry(1.5, .75), new THREE.MeshStandardMaterial({ map: bill(i), roughness: .7, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .3 })); m.userData = { f: i, rz: Math.sin(i * 3.1) * .6 }; sc.add(m); billetes.push(m); }
  const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null; const st = sticker(cp, p.sticker || 'PAGAS AL RECIBIR ✓', { y: p.stickerY || 1400, x: 540, cls: 'grande', rot: -6 });
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [-.4, 5.2, 12.6], [0, 4.4, 10.6], [0, 1.0, .3]);
    animFrasco(fr, t, { expr: t > d * .62 ? 'guiño' : 'feliz', brazosArriba: t > d * .62, salto: t > d * .62 ? .3 : 0 });
    billetes.forEach((b, i) => { const t0 = d * .08 + i * d * .045, k = win(t, t0, t0 + .75); const x0 = -1.35 + Math.sin(i * 1.7) * .12, z0 = 1.7 + Math.cos(i * 2.3) * .1;
      b.visible = k > 0; b.position.set(x0 + Math.sin(k * 9 + i) * .45 * (1 - k), lerp(6.5, .03 + i * .022, eout(k)), z0 + Math.cos(k * 7 + i) * .3 * (1 - k));
      b.rotation.set(lerp(-.2, -Math.PI / 2, eout(k)) + Math.sin(k * 11 + i) * .8 * (1 - k), 0, b.userData.rz + (1 - k) * Math.sin(k * 8) * 1.2); });
    const ks = win(t, d * .62, d * .62 + .3); st.set(ks); if (ks > 0 && ks < 1) { cam.position.x += Math.sin(t * 80) * .05; }
    if (tit) { const k = win(t, .1, .4); tit.style.opacity = k; tit.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(k)})`; } } };
});
Object.assign(SFX, {
  botones: (st, d, p) => [{ t: st + .1, tipo: 'pop' }, { t: st + .25, tipo: 'pop' }, { t: st + (p.revela ?? d * .5), tipo: 'golpe' }],
  maleta: (st, d, p) => p.modo === 'guardar' ? [{ t: st + d * .2, tipo: 'whoosh' }, { t: st + d * .58, tipo: 'teclas', d: d * .15 }, ...(p.sticker ? [{ t: st + d * .72, tipo: 'golpe' }] : [])] : [{ t: st + d * .1, tipo: 'teclas', d: d * .12 }, { t: st + d * .32, tipo: 'pop' }, ...(p.sticker ? [{ t: st + d * .62, tipo: 'golpe' }] : [])],
  pago: (st, d, p) => [...[0, 2, 4, 6, 8].map(i => ({ t: st + d * .08 + i * d * .045 + .6, tipo: 'pop' })), { t: st + d * .62, tipo: 'golpe' }],
});

// ===================== MEJORA 2026-11-21 =====================
// Plantillas `calendario` (calendario de escritorio 3D: la hoja de ayer se arranca y vuela, aparece el día nuevo y un marcador
// lo encierra en un círculo; modo entrega: cae la caja de envío al lado = "el día que te llega") y `respuesta` (formato
// "respondo tus comentarios": burbuja de comentario estilo TikTok que entra con rebote sobre la escena + modo `fijado`:
// comentario fijado por @ecovital_7 con corazón que late). Objetos de café: taza (con vapor), cafeto (rama con cerezas
// que se mece), cerezaCafe, cerezaAbierta (se abre y muestra las 2 semillas), granoCafe {tostado}, caracolCafe (grano redondo).
function paginaCal(p, txt, sub, colHead) { return canvasTex(640, 760, (c, w, h, k = 0) => {
  c.fillStyle = '#fbf8f1'; rr(c, 0, 0, w, h, 26); c.fill(); c.fillStyle = colHead; rr(c, 0, 0, w, 170, 26); c.fill(); c.fillRect(0, 120, w, 50);
  c.fillStyle = '#ffffff'; c.font = '800 66px P'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.mes || 'MI SEMANA', w / 2, 92);
  const [a, b] = String(txt).split('|'); c.fillStyle = '#1b1712';
  if (b !== undefined) { c.font = '700 70px P'; c.globalAlpha = .55; c.fillText(a, w / 2, 260); c.globalAlpha = 1; c.font = `900 ${b.length > 3 ? 118 : 290}px P`; c.fillText(b, w / 2, b.length > 3 ? 450 : 470); }
  else { c.font = `900 ${a.length > 5 ? 120 : 170}px P`; c.fillText(a, w / 2, 420); }
  if (sub) { c.font = '700 50px P'; c.fillStyle = '#4b4136'; c.fillText(sub, w / 2, 676); }
  if (k > 0) { c.strokeStyle = p.colorMarca || '#e63946'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.ellipse(w / 2, 462, 236, 168, -.08, -Math.PI * .6, -Math.PI * .6 + Math.PI * 2.15 * k); c.stroke(); }
}); }
def('calendario', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const cal = new THREE.Group(); const cx = p.entrega ? -1.05 : (p.heroe ? -1.0 : 0); cal.position.set(cx, 0, 0); cal.rotation.y = p.entrega || p.heroe ? .18 : 0; sc.add(cal);
  const head = p.color || PAL.acento; const W0 = 2.6, H0 = 3.1, top = 3.75;
  cal.add(mesh(rbox(3.3, .32, 1.7, .1), M.std('#1d2027', .35, .4), 0, .16, -.2));
  const cuerpo = new THREE.Group(); cuerpo.position.set(0, .32, 0); cuerpo.rotation.x = -.13; cal.add(cuerpo);
  cuerpo.add(mesh(rbox(W0 + .2, H0 + .25, .34, .06), M.std('#f1ebe0', .9), 0, (top - .32) - H0 / 2 - .05, -.2));
  for (let i = 0; i < 6; i++) cuerpo.add(mesh(rbox(W0 + .08, .03, .3, .01), M.std(i % 2 ? '#e6dfd2' : '#f6f1e8', .9), 0, (top - .32) - H0 - .02 + i * .05, -.18));
  const mkPlano = (tex) => new THREE.Mesh(new THREE.PlaneGeometry(W0, H0 * 760 / 760).translate(0, -H0 / 2, 0), new THREE.MeshStandardMaterial({ map: tex, roughness: .8, envMap: ENV, envMapIntensity: .25, side: THREE.FrontSide }));
  const texN = paginaCal(p, p.dia || 'DÍA|1', p.sub, head); const nueva = mkPlano(texN); nueva.position.set(0, top - .32 + .02, .0); cuerpo.add(nueva);
  let piv = null; if (p.desde) { piv = new THREE.Group(); piv.position.set(0, top - .32 + .02, .02); cuerpo.add(piv); const vieja = mkPlano(paginaCal(p, p.desde, p.subDesde, head)); piv.add(vieja);
    const dorso = new THREE.Mesh(new THREE.PlaneGeometry(W0, H0).translate(0, -H0 / 2, 0), M.std('#efe9dd', .9)); dorso.rotation.y = Math.PI; dorso.position.z = -.002; piv.add(dorso); }
  for (let i = 0; i < 5; i++) { const an = mesh(new THREE.TorusGeometry(.13, .035, 8, 20), M.oro(), -1.0 + i * .5, top - .32 + .05, .02); an.rotation.y = Math.PI / 2; cuerpo.add(an); }
  const gl = glow(head, 6, .25); gl.position.set(cx, 2.2, -1.2); sc.add(gl);
  let cj = null; if (p.entrega) { cj = cajaEnvio({ color: p.colorCaja }); cj.userData.abrir(0); cj.userData.cinta.scale.x = 1; cj.userData.cinta2.scale.y = 1; cj.scale.setScalar(.72); cj.rotation.y = -.35; sc.add(cj); }
  let H = null; if (p.heroe) { H = crearHeroe(p.heroe, p); H.obj.scale.multiplyScalar(p.escalaHeroe || .62); H.obj.position.set(p.heroeX ?? 1.5, p.heroeY ?? 0, .9); H.obj.rotation.y = -.4; sc.add(H.obj); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1690, cls: p.stickerCls || 'grande', rot: -5 }) : null;
  const lab = p.etiqueta ? etiqueta(cp, p.etiqueta, {}) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); const lejos = p.entrega || p.heroe; camara(cam, t, 0, d, lejos ? [.5, 3.6, 14] : [1.4, 3.4, 11.2], lejos ? [.1, 3.4, 12.4] : [.5, 3.2, 9.6], [lejos ? .15 : cx * .35, 2.45, 0]);
    const f0 = p.desde ? (typeof p.flip === 'number' ? p.flip : d * .22) : 0;
    if (piv) { const k = win(t, f0, f0 + .55); piv.rotation.x = -Math.PI * 1.05 * ease(k); piv.position.y = top - .32 + .02 + (k > .6 ? (k - .6) * 3 : 0); piv.position.z = .02 + Math.sin(k * Math.PI) * .9; piv.rotation.z = k * .5; piv.visible = k < .98; }
    const km = win(t, f0 + (p.desde ? .55 : .25), f0 + (p.desde ? 1.25 : .95)); if (p.marcar !== false && km > 0) redraw(texN, eout(km));
    cuerpo.position.y = .32 + (p.desde && t > f0 + .5 ? Math.abs(Math.sin((t - f0 - .5) * 9)) * .05 * (1 - win(t, f0 + .5, f0 + 1.2)) : 0);
    if (cj) { const kc = win(t, d * .42, d * .42 + .45); cj.visible = kc > 0; cj.position.set(1.55, lerp(5.5, 0, eout(kc)) + (kc >= 1 ? Math.abs(Math.sin((t - d * .42 - .45) * 10)) * .12 * (1 - win(t, d * .42 + .45, d * .42 + 1.1)) : 0), .7); }
    if (H) { H.anim(t, d); }
    if (lab) { cam.updateMatrixWorld(); const tgt = cj || H?.obj || nueva; const [x, y] = proyectar(tgt, cam, [0, cj ? 1.1 : 1.6, 0]); lab.set(Math.min(800, x + 120), y - 150, x, y, win(t, d * .55, d * .55 + .3)); }
    if (st) st.set(win(t, p.stickerT ?? d * .6, (p.stickerT ?? d * .6) + .3)); } };
});
// RESPUESTA (formato "respondo tus comentarios"): burbuja tipo TikTok "Respuesta a …" con la pregunta + persona en escenario o héroe 3D.
// p = {pregunta, de ('Pregunta frecuente'), escenario+persona+accion | heroe, aroma, sticker, stickerY, fijado:true (comentario fijado por la marca: p.texto), cardY}
def('respuesta', (p) => {
  const E = estudio({ rejilla: !p.escenario, fogNear: p.escenario ? 18 : 14, fogFar: p.escenario ? 40 : 34 }); const sc = E.sc, cam = E.cam; const cp = capa();
  let pe = null, H = null, fr = null;
  if (p.escenario) { escenario(sc, p.escenario); pe = persona(p.persona || {}); sc.add(pe); cam.userData.off = .35; if (p.frasco) { fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.36); sc.add(fr); } }
  else { H = crearHeroe(p.heroe || 'frasco', p); sc.add(H.obj); if (p.escalaHeroe && !OBJETOS[p.heroe]) H.obj.scale.setScalar(p.escalaHeroe); cam.userData.off = .1; }
  const card = el('div', '', cp); const fij = !!p.fijado;
  Object.assign(card.style, { position: 'absolute', left: '540px', top: (p.cardY || (fij ? 1240 : (p.escenario ? 1210 : 1330))) + 'px', width: '900px', boxSizing: 'border-box', background: fij ? '#14161c' : '#ffffff', color: fij ? '#fff' : '#14110a', borderRadius: '38px', padding: '30px 40px 34px 150px', boxShadow: '0 24px 70px rgba(0,0,0,.5)', border: fij ? '4px solid var(--acento)' : '0', transformOrigin: '20% 100%' });
  card.innerHTML = `<div style="position:absolute;left:34px;top:34px;width:88px;height:88px;border-radius:50%;background:var(--acento);display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:900;color:#0b0f0c">${fij ? '🌿' : '?'}</div>`
    + `<div style="font-size:34px;font-weight:600;opacity:.6;margin-bottom:8px">${fij ? '📌 Fijado por <b style="opacity:1">@ecovital_7</b>' : 'Respuesta a <b>' + (p.de || 'Pregunta frecuente') + '</b>'}</div>`
    + `<div style="font-size:${fij ? 52 : 60}px;font-weight:800;line-height:1.1">${fij ? (p.texto || '') : (p.pregunta || '')}</div>`
    + `<div class="cola" style="position:absolute;left:70px;bottom:-26px;width:0;height:0;border-left:26px solid transparent;border-right:26px solid transparent;border-top:30px solid ${fij ? 'var(--acento)' : '#ffffff'}"></div>`
    + (fij ? '<div class="cor" style="position:absolute;right:30px;bottom:24px;font-size:64px;opacity:0">❤️</div>' : '');
  const cor = card.querySelector('.cor');
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || (fij ? 1620 : 1560), cls: p.stickerCls || '', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t);
    if (pe) { camara(cam, t, 0, d, [p.lado || 0, 2.7, 10.5], [(p.lado || 0) * .4, 2.6, 8.4], [0, 2.2, 0]); animPersona(pe, t, { accion: p.accion || 'hablar', k: eout(win(t, 0, .5)), hablar: p.hablar ?? .7 });
      if (fr) { pe.updateMatrixWorld(true); const v = new THREE.Vector3(); pe.userData.brazos[0].mano.getWorldPosition(v); fr.position.set(v.x, v.y - .05, v.z + .15); fr.rotation.y = .5; animFrasco(fr, t, { expr: 'feliz', bob: 0 }); } }
    else { camara(cam, t, 0, d, [0, 2.6, 13], [0, 2.4, 10.8], [0, 1.7, 0]); H.anim(t, d); H.obj.rotation.y = Math.sin(t * 1.1) * .3; }
    const k = win(t, .05, .45); card.style.opacity = clamp(k * 2.5); card.style.transform = `translate(-50%,0) rotate(${-2 + 2 * eout(k)}deg) scale(${Math.max(.01, back(k))})`;
    if (cor) { const kc = win(t, d * .5, d * .5 + .3); cor.style.opacity = kc; cor.style.transform = `scale(${kc > 0 ? 1.6 - .6 * back(kc) + .08 * Math.sin(t * 9) : 0})`; }
    if (st) st.set(win(t, p.stickerT ?? d * .58, (p.stickerT ?? d * .58) + .3)); } };
});
// --- objetos del café ---
const cafeM = { cereza: c => new THREE.MeshPhysicalMaterial({ color: col(c), roughness: .28, clearcoat: .8, clearcoatRoughness: .2, envMap: ENV, envMapIntensity: 1 }) };
function grano(o = {}) { const g = new THREE.Group(); const c = o.tostado ? '#4a2a17' : '#a9b57e'; const m = M.std(c, o.tostado ? .45 : .7);
  const b = mesh(new THREE.SphereGeometry(.5, 28, 20), m); if (o.redondo) b.scale.set(.92, .92, .85); else b.scale.set(.78, 1.08, .5); g.add(b);
  const surco = new THREE.CatmullRomCurve3([[-.02, -.42, 0], [.06, -.2, 0], [-.06, 0, 0], [.06, .2, 0], [-.02, .42, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const sm = mesh(new THREE.TubeGeometry(surco, 30, .045, 6), M.std(o.tostado ? '#2a170c' : '#6f7a4c', .8)); sm.position.z = o.redondo ? .42 : .245; sm.scale.set(1, o.redondo ? .85 : 1.05, 1); g.add(sm); return g; }
function cereza(c = '#c8102e', s = 1) { const g = new THREE.Group(); const m = mesh(new THREE.SphereGeometry(.42 * s, 24, 18), cafeM.cereza(c)); m.scale.set(1, 1.12, 1); g.add(m); g.add(mesh(new THREE.CylinderGeometry(.08 * s, .05 * s, .05 * s, 12), M.std('#3a2a1a', .8), 0, .46 * s, 0)); return g; }
Object.assign(OBJETOS, {
  taza: p => { const g = new THREE.Group(); const blanca = M.std(p.colorTaza || '#f7f4ee', .25); const pts = [[0, 0], [.62, 0], [.68, .06], [.82, 1.1], [.86, 1.2], [.8, 1.2], [.76, 1.12], [.6, .14], [0, .14]].map(([x, y]) => new THREE.Vector2(x, y));
    const cu = mesh(new THREE.LatheGeometry(pts, 48), blanca); cu.material.side = THREE.DoubleSide; g.add(cu); const asa = mesh(new THREE.TorusGeometry(.3, .07, 10, 24, Math.PI * 1.2), blanca, .9, .62, 0); asa.rotation.z = -Math.PI * .6; g.add(asa);
    const cafe = mesh(new THREE.CircleGeometry(.77, 40), M.std('#3b2112', .2)); cafe.rotation.x = -Math.PI / 2; cafe.position.y = 1.05; g.add(cafe); const crema = mesh(new THREE.RingGeometry(.5, .76, 40), M.std('#a0683a', .4)); crema.rotation.x = -Math.PI / 2; crema.position.y = 1.055; g.add(crema);
    const plato = mesh(new THREE.CylinderGeometry(1.25, 1.1, .08, 48), blanca, 0, -.04, 0); g.add(plato);
    const vap = []; for (let i = 0; i < 9; i++) { const s = glow('#ffffff', .55 + (i % 3) * .15, .4); s.userData.f = i / 9; g.add(s); vap.push(s); }
    g.userData.tick = t => vap.forEach((v, i) => { const ph = (t * .45 + v.userData.f) % 1; v.position.set(Math.sin(t * 1.5 + i) * .25 * ph, 1.25 + ph * 2.0, Math.cos(i) * .2); v.material.opacity = Math.sin(ph * Math.PI) * .38; });
    g.position.y = -.6; const w = new THREE.Group(); const inc = new THREE.Group(); inc.rotation.x = p.inclinaTaza ?? .32; inc.add(g); w.add(inc); w.userData.tick = g.userData.tick; return w; },
  cafeto: p => { const g = new THREE.Group(); const cor = M.std('#6b4a2e', .8); const rama = mesh(new THREE.CylinderGeometry(.05, .09, 4.2, 10), cor); rama.rotation.z = Math.PI / 2 - .15; g.add(rama);
    const hojaC = (x, s2) => { const h = hoja('#1f6b33', 1.25); h.position.set(x, s2 * .5, 0); h.rotation.set(s2 * .5, 0, s2 * 1.3 - .15); h.traverse(m => { if (m.material) { m.material = new THREE.MeshPhysicalMaterial({ color: col('#24733a'), roughness: .35, clearcoat: .6, side: THREE.DoubleSide, envMap: ENV }); } }); return h; };
    [-1.6, -.5, .6, 1.6].forEach((x, i) => { g.add(hojaC(x + .15, 1)); g.add(hojaC(x - .05, -1)); });
    const colores = p.colores || ['#c8102e', '#b30f2a', '#d9342b', '#e0a526', '#7da23a', '#c8102e', '#9c0d22', '#d9342b'];
    const racimos = []; [-1.1, 0, 1.1].forEach((x, j) => { const r = new THREE.Group(); r.position.set(x, -.18 + x * .15 * -.15, .1); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const ce = cereza(colores[(i + j * 3) % colores.length], .72); ce.position.set(Math.cos(a) * .32, -.15 + Math.sin(a * 2) * .06, Math.sin(a) * .3); ce.rotation.z = Math.cos(a) * .4; r.add(ce); } g.add(r); racimos.push(r); });
    g.userData.tick = t => { g.rotation.z = Math.sin(t * 1.2) * .04; racimos.forEach((r, i) => r.rotation.x = Math.sin(t * 2 + i) * .06); }; return g; },
  cerezaCafe: p => { const g = cereza(p.color || '#c8102e', 2.2); return g; },
  cerezaAbierta: p => { const g = new THREE.Group(); const R0 = .95; const piel = cafeM.cereza('#c8102e'); const pulpa = M.std('#f3e3b0', .5);
    const mitad = s => { const h = new THREE.Group(); const cas = mesh(new THREE.SphereGeometry(R0, 32, 24, 0, Math.PI), piel); cas.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; cas.material.side = THREE.DoubleSide; h.add(cas);
      const cara = mesh(new THREE.CircleGeometry(R0 * .97, 40), pulpa); cara.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; h.add(cara); return h; };
    const A = mitad(1), B = mitad(-1); g.add(A); g.add(B);
    const sem = [1, -1].map(s => { const gr = grano({}); gr.scale.setScalar(1.05); g.add(gr); return gr; });
    g.add(mesh(new THREE.CylinderGeometry(.12, .08, .25, 12), M.std('#3a2a1a', .8), 0, R0 + .05, 0));
    g.userData.tick = t => { const k = eout(clamp((t - .35) / 1.1)); A.position.x = k * 1.25; B.position.x = -k * 1.25; A.rotation.z = -k * .25; B.rotation.z = k * .25; sem[0].position.set(.17 + k * .55, 0, 0); sem[1].position.set(-.17 - k * .55, 0, 0); sem.forEach((s2, i) => s2.rotation.y = (i ? Math.PI / 2 : -Math.PI / 2) * (1 - k * .75)); };
    g.rotation.y = 0; return g; },
  granoCafe: p => { const g = new THREE.Group(); const gr = grano({ tostado: p.tostado }); gr.scale.setScalar(2.2); gr.rotation.z = p.ladeo ?? .45; g.add(gr); return g; },
  granoTostado: p => OBJETOS.granoCafe({ ...p, tostado: true }),
  granos: p => { const g = new THREE.Group(); [[-1.3, 0, false], [1.3, 0, true]].forEach(([x, y, tos]) => { const gr = grano({ tostado: tos }); gr.scale.setScalar(1.8); gr.position.set(x, y, 0); g.add(gr); }); return g; },
  caracolCafe: p => { const g = new THREE.Group(); const gr = grano({ redondo: true, tostado: p.tostado }); gr.scale.setScalar(2.2); g.add(gr); return g; },
});
Object.assign(SFX, {
  calendario: (st, d, p) => [...(p.desde ? [{ t: st + (typeof p.flip === 'number' ? p.flip : d * .22), tipo: 'whoosh' }] : []), { t: st + (p.desde ? (typeof p.flip === 'number' ? p.flip : d * .22) + .6 : .3), tipo: 'teclas', d: .45 }, ...(p.entrega ? [{ t: st + d * .42 + .45, tipo: 'golpe' }] : []), ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .6), tipo: 'pop' }] : [])],
  respuesta: (st, d, p) => [{ t: st + .12, tipo: 'pop' }, ...(p.fijado ? [{ t: st + d * .5, tipo: 'pop' }] : []), ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .58), tipo: 'golpe' }] : [])],
});


// ======================= MEJORA 2026-11-22 =======================
// Objetos de vainilla: orquídea (flor que abre un día), vainas verdes, vainas curadas negras y atado de vainas.
function vaina(c = '#5c8f2e', largo = 2.2, curva = .25, r = .085, rough = .6) { const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(new THREE.Vector3(Math.sin(k * Math.PI) * curva, -k * largo, 0)); }
  const g = new THREE.Group(); const m = M.std(c, rough); const tubo = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10, false), m); g.add(tubo);
  g.add(mesh(new THREE.SphereGeometry(r, 10, 8), m, pts[0].x, pts[0].y, 0)); const fin = mesh(new THREE.ConeGeometry(r, r * 2.2, 10), m, pts[12].x, pts[12].y - r, 0); fin.rotation.z = Math.PI; g.add(fin); return g; }
function florVainilla(s = 1) { const g = new THREE.Group(); const crema = '#efe8a6', amar = '#f2d65a';
  [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2 + Math.PI / 2; const piv = new THREE.Group(); piv.rotation.z = a - Math.PI / 2; const h = hoja(i < 3 ? '#e4e39a' : crema, .78); h.scale.set(.5, 1, .5); h.position.y = .48; piv.add(h); g.add(piv); });
  const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector2(.07 + Math.pow(k, 1.6) * .3 + (k > .85 ? Math.sin(k * 40) * .015 : 0), k * .62)); }
  const lab = mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshStandardMaterial({ color: col(amar), roughness: .55, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .5 })); lab.rotation.x = Math.PI / 2; lab.position.z = .02; g.add(lab);
  g.add(mesh(new THREE.CylinderGeometry(.035, .045, .5, 8), M.std('#f8f4d8', .5), 0, .05, .25)).children; g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  g.scale.setScalar(s); return g; }
function orquidea(p = {}) { const g = new THREE.Group(); const tallo = M.std('#4f8a3a', .6);
  const pts = [[-1.6, -1.6, 0], [-.8, -.6, .1], [0, -.2, 0], [.8, .3, -.1], [1.5, 1.2, 0]].map(a => new THREE.Vector3(...a)); g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .07, 8, false), tallo));
  [[-1.1, -1.0, .8], [.4, .05, -.9], [1.2, .85, .7]].forEach(([x, y, r]) => { const h = hoja('#3f8f46', 1.1); h.scale.set(.9, 1, 2.2); h.position.set(x, y, .12); h.rotation.set(.3, 0, r); g.add(h); });
  const flores = []; [[.1, .15, .5, 1], [-.75, -.42, .25, .78]].slice(0, p.flores || 2).forEach(([x, y, z, s]) => { const f = florVainilla(s); f.position.set(x, y + .35, z); f.rotation.set(-.15, .25, 0); g.add(f); flores.push(f); });
  const vns = []; if (p.vainas) for (let i = 0; i < 4; i++) { const v = vaina('#5c8f2e', 1.5, .1, .06); v.position.set(.9 + i * .14, .6, .2 + i * .05); v.rotation.z = -.1 + i * .06; g.add(v); vns.push(v); }
  g.userData.tick = t => { g.rotation.z = Math.sin(t * .9) * .04; flores.forEach((f, i) => { const k = p.abre === undefined ? 1 : clamp((t - (p.abre || 0)) / 1.0); f.scale.setScalar((i ? .78 : 1) * (.25 + .75 * eout(k))); f.rotation.z = Math.sin(t * 1.4 + i) * .06; }); vns.forEach((v, i) => v.rotation.z = -.1 + i * .06 + Math.sin(t * 1.2 + i) * .05); };
  return g; }
Object.assign(OBJETOS, {
  orquidea: p => orquidea(p),
  florVainilla: () => { const f = florVainilla(2.1); const g = new THREE.Group(); g.add(f); g.userData.tick = t => { f.rotation.z = Math.sin(t * 1.2) * .08; f.rotation.y = .45 + Math.sin(t * .7) * .2; f.rotation.x = -.2; }; return g; },
  vainaVerde: () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const v = vaina('#5c8f2e', 2.4 - (i % 2) * .3, .18, .1); v.position.set((i - 2) * .32, 1.3, Math.sin(i) * .15); v.rotation.z = (i - 2) * .08; g.add(v); } g.add(mesh(new THREE.TorusGeometry(.5, .07, 8, 20, Math.PI), M.std('#4f8a3a', .6), 0, 1.3, 0)); g.position.y = -.2; return g; },
  vainaNegra: () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const v = vaina('#2a1a10', 2.4, .3, .085, .32); v.scale.z = .65; v.position.set((i - 1) * .3, 1.2, 0); v.rotation.z = (i - 1) * .12; g.add(v); } return g; },
  vainas: () => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const v = vaina('#2a1a10', 2.6, .05, .075, .32); v.scale.z = .7; v.position.set((i - 3) * .16, 1.3, Math.sin(i * 2) * .1); g.add(v); }
    const lazo = mesh(new THREE.TorusGeometry(.62, .05, 8, 28), M.std('#c9a36a', .8), 0, .1, 0); lazo.scale.set(1, .22, 1); lazo.rotation.x = .1; g.add(lazo); g.rotation.z = -.5; return g; },
});
// NOTA (2026-11-22): nota adhesiva (post-it) que vuela y se pega en el frasco, con texto escrito a mano que se va escribiendo.
// p = {notas:[{texto, color, aroma}] (1 o 2 frascos), sticker, stickerY, titulo (html abajo), celebra:true}
function notaTex(texto, color) { return canvasTex(512, 512, (c, w, h, k = 0) => { c.fillStyle = color || '#ffe066'; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(.18, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  c.save(); c.beginPath(); c.rect(0, 0, w * k, h); c.clip(); c.fillStyle = '#1f2a6b'; c.textAlign = 'center'; c.textBaseline = 'middle'; const ls = String(texto).split('|'); ls.forEach((l, i) => { let fs = ls.length > 1 ? 110 : 140; c.font = `900 ${fs}px P`; const mw = c.measureText(l).width; if (mw > 420) { fs = Math.floor(fs * 420 / mw); c.font = `900 ${fs}px P`; } c.save(); c.translate(w / 2, h / 2 + (i - (ls.length - 1) / 2) * 125); c.rotate(-.05); c.transform(1, 0, -.18, 1, 0, 0); c.fillText(l, 0, 0); c.restore(); });
  if (k > .95) { c.strokeStyle = '#c62828'; c.lineWidth = 12; c.beginPath(); c.moveTo(70, h - 90); c.quadraticCurveTo(w / 2, h - 60, w - 70, h - 100); c.stroke(); } c.restore(); }); }
def('nota', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const ns = p.notas || [{ texto: p.texto || 'NO|TOCAR', aroma: p.aroma }]; const doble = ns.length > 1;
  const items = ns.map((n, i) => { const f = frasco({ aroma: n.aroma || (i ? 'citronela' : 'lavanda') }); const s = doble ? .82 : 1.05; f.scale.setScalar(s); f.position.set(doble ? (i ? 1.25 : -1.25) : 0, 0, 0); f.rotation.y = doble ? (i ? -.22 : .22) : 0; sc.add(f);
    const tex = notaTex(n.texto, n.color); const nt = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshStandardMaterial({ map: tex, roughness: .9, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .3 })); nt.castShadow = true; f.userData.rig.add(nt);
    return { f, nt, tex, t0: (doble ? .25 + i * .9 : .35), rot: (i ? .1 : -.09) }; });
  const gl = glow(PAL.acento, 7, .22); gl.position.set(0, 2, -1.5); sc.add(gl);
  const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1330, cls: 'grande', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, doble ? [0, 2.6, 12.6] : [.6, 2.5, 11], doble ? [0, 2.3, 10.6] : [0, 2.2, 8.6], [0, 1.15, 0]);
    let shake = 0; items.forEach((it, i) => { const k = win(t, it.t0, it.t0 + .45); const ap = .95 * Math.cos(Math.PI / 6);
      const tx = 0, ty = .74, tz = ap + .05; it.nt.position.set(lerp(1.8 * (i ? 1 : -1), tx, eout(k)), lerp(3.6, ty, eout(k)), lerp(3.2, tz, eout(k))); it.nt.rotation.set(lerp(-1.2, 0, eout(k)), lerp(2.4, 0, eout(k)), lerp(1.6, it.rot, eout(k)));
      const sq = win(t, it.t0 + .45, it.t0 + .7); it.nt.scale.set(1 + Math.sin(sq * Math.PI) * .12, 1 - Math.sin(sq * Math.PI) * .1, 1); it.nt.visible = k > 0;
      if (k > .98 && sq < 1) shake = Math.max(shake, 1 - sq); const kw = win(t, it.t0 + .55, it.t0 + 1.25); if (kw > 0 && (kw < 1 || !it.done)) { redraw(it.tex, kw); if (kw >= 1) it.done = true; }
      animFrasco(it.f, t, { expr: k > 0 && k < 1 ? 'sorpresa' : (i ? 'guiño' : 'feliz'), hablar: .25, fase: i, brazosArriba: p.celebra && t > d * .7, salto: p.celebra && t > d * .7 ? .4 : 0 }); });
    if (shake > 0) { cam.position.x += Math.sin(t * 80) * .05 * shake; cam.position.y += Math.sin(t * 67) * .04 * shake; }
    if (tit) { const k = win(t, .1, .4); tit.style.opacity = k; tit.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(k)})`; } if (st) st.set(win(t, p.stickerT ?? d * .66, (p.stickerT ?? d * .66) + .3)); } };
});
// ABRIR (2026-11-22, formato unboxing): caja de envío cerrada que tiembla, la cinta se corta, las solapas se abren con luz y el frasco sube con chispas.
// p = {aroma, cerrada:true (solo tiembla y se asoma la luz: gancho), etiqueta, sticker, stickerY, colorCaja}
def('abrir', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const cj = cajaEnvio({ color: p.colorCaja }); cj.rotation.y = -.35; sc.add(cj); const u = cj.userData; u.abrir(0); u.cinta.scale.x = 1; u.cinta2.scale.y = 1;
  const luz = glow('#fff2b0', 4, 0); luz.position.set(0, u.h + .3, 0); cj.add(luz); const rayos = new THREE.Group(); for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(.35, 4, 12, 1, true), new THREE.MeshBasicMaterial({ color: col('#fff3c0'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.position.y = 2; r.rotation.set(Math.sin(i * 2.1) * .35, 0, Math.cos(i * 1.7) * .35); r.geometry.rotateX(Math.PI); rayos.add(r); } rayos.position.y = u.h; cj.add(rayos);
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.72); sc.add(fr); fr.visible = false;
  const chispas = []; for (let i = 0; i < 18; i++) { const s = glow(i % 3 ? '#ffe28a' : PAL.acento, .3, .9); sc.add(s); chispas.push(s); }
  const lab = p.etiqueta ? etiqueta(cp, p.etiqueta, {}) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1360, cls: 'grande', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, p.cerrada ? [2.8, 5.2, 10] : [3.2, 5.8, 12.4], p.cerrada ? [1.3, 3.8, 7.6] : [1.7, 4.4, 10], [0, p.cerrada ? .9 : 1.7, 0]);
    const a0 = p.cerrada ? 0 : .1, kCut = win(t, d * .2, d * .32), kOp = p.cerrada ? .12 * (.5 + .5 * Math.sin(t * 7)) * win(t, .4, 1) : ease(win(t, d * .3, d * .48));
    const tiembla = p.cerrada ? 1 : 1 - win(t, d * .18, d * .24); cj.rotation.z = Math.sin(t * 28) * .03 * tiembla; cj.position.y = Math.abs(Math.sin(t * 9)) * .08 * tiembla;
    if (!p.cerrada) { u.cinta.scale.x = Math.max(.001, 1 - eout(kCut)); u.cinta.position.x = -u.w / 2 - .08 + (u.w + .16) * eout(kCut); u.cinta2.scale.y = Math.max(.001, 1 - kCut); } u.abrir(kOp);
    luz.material.opacity = p.cerrada ? .5 * win(t, .4, 1) : .9 * win(t, d * .32, d * .45); luz.scale.setScalar(3 + 2 * Math.sin(t * 4) * .2); rayos.children.forEach((r, i) => { r.material.opacity = (p.cerrada ? .1 : .22) * (p.cerrada ? win(t, .4, 1) : win(t, d * .35, d * .5)) * (1 - (p.cerrada ? 0 : win(t, d * .85, d))); }); rayos.rotation.y = t * .5;
    if (!p.cerrada) { const kf = win(t, d * .42, d * .62); fr.visible = kf > 0; fr.position.set(lerp(-.05, -.05, kf), lerp(-.6, 1.65, back(kf)), .05); fr.rotation.y = -.35 + (1 - kf) * 3 + Math.sin(t * 1.5) * .15; animFrasco(fr, t, { expr: kf < 1 ? 'sorpresa' : 'feliz', saluda: kf >= 1, bob: kf >= 1 ? 1 : 0, hablar: .2 });
      chispas.forEach((s, i) => { const k = win(t, d * .45 + (i % 6) * .04, d * .45 + 1.2 + (i % 6) * .04); s.visible = k > 0 && k < 1; const a = i / 18 * Math.PI * 2; s.position.set(Math.cos(a) * 2.2 * eout(k), u.h + .2 + Math.sin(a) * .9 * eout(k) + 2.2 * eout(k) - k * k * 1.6, Math.sin(a) * 1.4 * eout(k)); s.material.opacity = .9 * (1 - k); }); }
    else chispas.forEach(s => s.visible = false);
    if (lab) { cam.updateMatrixWorld(); const [x, y] = proyectar(fr.visible ? fr : cj, cam, [0, fr.visible ? 1.4 : 1.8, 0]); lab.set(Math.min(800, x + 210), y + 60, x + 60, y + 60, win(t, d * .62, d * .62 + .3)); }
    if (st) st.set(win(t, p.stickerT ?? (p.cerrada ? .05 : d * .7), (p.stickerT ?? (p.cerrada ? .05 : d * .7)) + .3)); } };
});
// RULETA (2026-11-22): ruleta 3D LAVANDA/CITRONELA con bombillos que titilan; gira, frena con suspenso en el aroma ganador y sale el frasco de ese aroma con confeti.
// p = {gana:'lavanda'|'citronela', vueltas, titulo, sticker, stickerY}
def('ruleta', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0; const n = 6, R0 = 2.1, cy = 3.3;
  const colores = ['#b98cff', '#5fbf6a']; const nombres = ['LAVANDA', 'CITRONELA'];
  const tex = canvasTex(1024, 1024, (c, w, h) => { const cx = w / 2; for (let i = 0; i < n; i++) { const a0 = (i - .5) / n * Math.PI * 2, a1 = (i + .5) / n * Math.PI * 2; c.beginPath(); c.moveTo(cx, cx); c.arc(cx, cx, cx, a0, a1); c.closePath(); c.fillStyle = colores[i % 2]; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 10; c.stroke();
    c.save(); c.translate(cx, cx); c.rotate(i / n * Math.PI * 2); c.fillStyle = '#fff'; c.font = '900 64px P'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 8; c.fillText(nombres[i % 2], cx * .58, 0); c.font = '400 54px P'; c.fillText(i % 2 ? '🍃' : '💜', cx * .9, 0); c.restore(); }
    c.beginPath(); c.arc(cx, cx, 90, 0, Math.PI * 2); c.fillStyle = '#e8b84a'; c.fill(); });
  const rueda = new THREE.Group(); rueda.position.set(0, cy, 0); sc.add(rueda);
  const disco = new THREE.Mesh(new THREE.CircleGeometry(R0, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: .5, envMap: ENV, envMapIntensity: .4 })); disco.position.z = .13; rueda.add(disco);
  const cuerpo = mesh(new THREE.CylinderGeometry(R0 + .02, R0 + .02, .25, 64), M.std('#1d2027', .4, .4)); cuerpo.rotation.x = Math.PI / 2; rueda.add(cuerpo);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(R0 + .08, .12, 12, 64), M.oro()); aro.position.z = .1; sc.add(aro); aro.position.y = cy;
  const focos = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const b = mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: col('#fff3c0') }), Math.cos(a) * (R0 + .08), cy + Math.sin(a) * (R0 + .08), .26); sc.add(b); focos.push(b); }
  const centro = mesh(new THREE.SphereGeometry(.3, 20, 16), M.oro(), 0, cy, .25); sc.add(centro);
  const flecha = mesh(new THREE.ConeGeometry(.32, .7, 3), M.std('#ff4d4d', .35), 0, cy + R0 + .38, .3); flecha.rotation.z = Math.PI; sc.add(flecha);
  sc.add(mesh(rbox(.5, cy - R0 + .2, .4, .08), M.std('#2b2f38', .4, .4), 0, (cy - R0) / 2, -.2)); sc.add(mesh(rbox(2.4, .2, 1.2, .08), M.std('#2b2f38', .4, .4), 0, .1, -.2));
  const gi = p.gana === 'citronela' ? 3 : 2; const vueltas = p.vueltas || 4; const final = Math.PI / 2 + gi / n * Math.PI * 2 - Math.PI * 2 * vueltas;
  const fr = frasco({ aroma: p.gana || 'lavanda' }); fr.scale.setScalar(.6); sc.add(fr);
  const conf = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.12, .2), new THREE.MeshBasicMaterial({ color: col(['#b98cff', '#5fbf6a', '#ffd36e', '#ffffff', '#ff7a9a'][i % 5]), side: THREE.DoubleSide })); sc.add(m); conf.push(m); }
  const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null; const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1250, cls: 'grande', rot: -5 }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [.8, 3.5, 15.2], [0, 3.2, 13.4], [0, 2.5, 0]);
    const tf = d * .58; const k = win(t, .1, tf); const eo = 1 - Math.pow(1 - k, 4); rueda.rotation.z = final * eo + (k >= 1 ? Math.sin((t - tf) * 18) * .03 * Math.exp(-(t - tf) * 5) : 0);
    const vel = k < 1 ? 4 * Math.pow(1 - k, 3) : 0; flecha.rotation.z = Math.PI + Math.sin(t * 40) * .18 * Math.min(1, vel);
    focos.forEach((b, i) => b.material.color.set((Math.floor(t * (k < 1 ? 10 : 4)) + i) % 2 ? '#fff3c0' : (k >= 1 ? colores[gi % 2] : '#8a7a40')));
    const kf = win(t, tf + .1, tf + .55); fr.visible = kf > 0; fr.position.set(1.6, lerp(-1.5, 0, back(kf)), 1.9); fr.rotation.y = -.45; animFrasco(fr, t, { expr: 'feliz', brazosArriba: kf >= 1, salto: kf >= 1 ? .35 : 0, hablar: .2 });
    conf.forEach((m, i) => { const kc = win(t, tf + (i % 8) * .03, tf + 1.8 + (i % 5) * .2); m.visible = kc > 0 && kc < 1; m.position.set(Math.sin(i * 7.3) * 4 * eout(kc) * .7, cy + 1.6 + Math.cos(i * 3.1) * .6 + 2.2 * eout(kc) - kc * kc * 6, 1 + Math.sin(i * 1.9) * 1.2); m.rotation.set(t * 6 + i, t * 4 + i, i); });
    if (kf > 0 && kf < .5) { cam.position.x += Math.sin(t * 80) * .04; }
    if (tit) { const kt = win(t, 0, .3); tit.style.opacity = kt; tit.style.transform = `translate(-50%,0) scale(${.85 + .15 * back(kt)})`; } if (st) st.set(win(t, p.stickerT ?? d * .7, (p.stickerT ?? d * .7) + .3)); } };
});
Object.assign(SFX, {
  nota: (st, d, p) => (p.notas || [0]).flatMap((_, i) => { const t0 = (p.notas || [0]).length > 1 ? .25 + i * .9 : .35; return [{ t: st + t0, tipo: 'whoosh' }, { t: st + t0 + .45, tipo: 'golpe' }, { t: st + t0 + .55, tipo: 'teclas', d: .6 }]; }).concat(p.sticker ? [{ t: st + (p.stickerT ?? d * .66), tipo: 'pop' }] : []),
  abrir: (st, d, p) => p.cerrada ? [{ t: st + .2, tipo: 'golpe' }, ...(p.sticker ? [{ t: st + .1, tipo: 'pop' }] : [])] : [{ t: st + d * .05, tipo: 'golpe' }, { t: st + d * .2, tipo: 'teclas', d: d * .12 }, { t: st + d * .32, tipo: 'whoosh' }, { t: st + d * .5, tipo: 'pop' }, ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .7), tipo: 'golpe' }] : [])],
  ruleta: (st, d, p) => [{ t: st + .1, tipo: 'teclas', d: d * .5 }, { t: st + d * .58, tipo: 'golpe' }, { t: st + d * .58 + .2, tipo: 'pop' }, ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .7), tipo: 'pop' }] : [])],
});

// ===== (2026-11-23) MEJORA DEL DÍA: mata de plátano, pimentones que maduran, naranja, escenario BUS y plantilla TIMBRE =====
// hoja grande de plátano: plano largo que se arquea hacia abajo, con nervio central y rasgaduras
function hojaPlatano(largo = 2.8, ancho = .9, c = '#3f9a4b') {
  const geo = new THREE.PlaneGeometry(largo, ancho, 16, 4); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + largo / 2, y = pos.getY(i); const u = x / largo; const borde = Math.sin(Math.PI * Math.min(1, u * 1.05 + .02)); pos.setY(i, y * (.35 + .65 * borde)); pos.setZ(i, -1.1 * u * u * largo * .45 + Math.abs(y) * .25); pos.setX(i, x); }
  geo.computeVertexNormals();
  const tex = canvasTex(256, 128, (c2, w, h) => { const gr = c2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c); gr.addColorStop(.5, '#6cbf5a'); gr.addColorStop(1, c); c2.fillStyle = gr; c2.fillRect(0, 0, w, h); c2.strokeStyle = 'rgba(20,70,25,.35)'; c2.lineWidth = 2; for (let i = 0; i < w; i += 9) { c2.beginPath(); c2.moveTo(i, h / 2); c2.lineTo(i + 14, 0); c2.moveTo(i, h / 2); c2.lineTo(i + 14, h); c2.stroke(); } c2.clearRect(70, 0, 3, 34); c2.clearRect(150, h - 40, 3, 40); c2.clearRect(200, 0, 3, 28); c2.fillStyle = '#d7e8a0'; c2.fillRect(0, h / 2 - 3, w, 6); });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .6, side: THREE.DoubleSide, alphaTest: .5, transparent: false, envMap: ENV, envMapIntensity: .4 })); m.castShadow = true; return m; }
// un banano (dedo) curvo que apunta hacia ARRIBA
function dedoBanano(c = '#7fb83a', s = 1) { const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(.42 * s, .05 * s, 0), new THREE.Vector3(.5 * s, .55 * s, 0));
  const g = new THREE.Group(); const tubo = mesh(new THREE.TubeGeometry(curva, 14, .085 * s, 7, false), M.std(c, .45)); g.add(tubo); g.add(mesh(new THREE.SphereGeometry(.07 * s, 8, 6), M.std('#3d2a16', .7), .5 * s, .56 * s, 0)); return g; }
// racimo: raquis que cuelga con manos de bananos apuntando hacia arriba y la "bellota" (flor morada) en la punta
export function racimo(o = {}) { const g = new THREE.Group(); const c = o.color || '#7fb83a'; const raq = mesh(new THREE.CylinderGeometry(.07, .08, 2.2, 10), M.std('#6f8a2e', .6), 0, -1.1, 0); g.add(raq);
  const manos = o.manos || 4; for (let m = 0; m < manos; m++) { const y = -.25 - m * .36; const n = 7 - Math.floor(m / 2); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + m * .4; const d = dedoBanano(c, .9 - m * .06); d.position.set(Math.cos(a) * .12, y, Math.sin(a) * .12); d.rotation.y = -a; g.add(d); } }
  const bell = new THREE.Group(); bell.position.y = -2.35; g.add(bell); [0, 1, 2].forEach(i => { const b = mesh(new THREE.ConeGeometry(.24 - i * .05, .7 - i * .12, 14), M.std(['#7a2140', '#8f2a4f', '#a8385e'][i], .45), 0, -.32 - i * .18, 0); b.rotation.x = Math.PI; bell.add(b); });
  g.userData = { bell }; return g; }
// mata de plátano completa: pseudotallo de hojas enrolladas + hojas gigantes que se mecen + racimo + (opcional) colino
export function platanera(o = {}) { const g = new THREE.Group(); const alto = o.alto || 3.2;
  const tt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#7da84a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { c.fillStyle = ['#6b9440', '#93bb5c', '#5c8436', '#a7c46a'][i % 4]; c.fillRect(i * 10 + Math.sin(i) * 4, 0, 4 + (i % 3) * 3, h); } c.globalAlpha = .35; c.fillStyle = '#6a4a2a'; for (let i = 0; i < 18; i++) c.fillRect(Math.random() * w, Math.random() * h, 14, 30); });
  const tallo = mesh(new THREE.CylinderGeometry(.26, .36, alto, 24), new THREE.MeshStandardMaterial({ map: tt, roughness: .75, envMap: ENV, envMapIntensity: .3 }), 0, alto / 2, 0); g.add(tallo);
  const hojas = []; const nh = o.hojas || 8; for (let i = 0; i < nh; i++) { const piv = new THREE.Group(); piv.position.y = alto - .05; piv.rotation.y = i / nh * Math.PI * 2 + .3; const h = hojaPlatano(2.6 + (i % 3) * .3, .85, ['#3f9a4b', '#4aa552', '#368a42'][i % 3]); h.position.x = 1.35; piv.add(h); piv.rotation.z = .55 + (i % 2) * .25; const pec = mesh(new THREE.CylinderGeometry(.04, .06, .6, 6), M.std('#6f9a3c', .6), .2, 0, 0); pec.rotation.z = Math.PI / 2; piv.add(pec); g.add(piv); hojas.push(piv); }
  const top = new THREE.Group(); top.position.y = alto + .15; const hoj = mesh(new THREE.ConeGeometry(.12, .9, 10), M.std('#9fd06a', .55), 0, .4, 0); top.add(hoj); g.add(top);
  let rac = null; if (o.racimo !== false) { const piv = new THREE.Group(); piv.position.set(0, alto - .1, 0); const arco = mesh(new THREE.TorusGeometry(.45, .06, 8, 16, Math.PI * .9), M.std('#6f8a2e', .6), .45, 0, 0); arco.rotation.z = 0; piv.add(arco); rac = racimo({ color: o.colorRacimo }); rac.position.set(.92, -.05, 0); rac.scale.setScalar(.8); piv.add(rac); piv.rotation.y = o.giroRacimo ?? -.6; g.add(piv); }
  if (o.colino) { const co = platanera({ alto: 1.0, hojas: 4, racimo: false }); co.scale.setScalar(.55); co.position.set(-.8, 0, .5); g.add(co); g.userData.colino = co; }
  g.userData.tick = t => { hojas.forEach((h, i) => { h.rotation.z = .55 + (i % 2) * .25 + Math.sin(t * 1.6 + i) * .06; h.rotation.x = Math.sin(t * 1.2 + i * 1.7) * .05; }); g.userData.colino?.userData.tick?.(t + 1); };
  return g; }
// corte del "tronco": anillos de hojas enrolladas (como cebolla) + la capa de afuera que se despega
export function corteTallo(o = {}) { const g = new THREE.Group(); const R = 1.1, h = 1.4;
  const cara = canvasTex(512, 512, (c, w) => { const cx = w / 2; for (let i = 0; i < 9; i++) { const r = cx * (1 - i / 9.5); c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fillStyle = i % 2 ? '#e9f2c9' : '#b9d784'; c.fill(); c.strokeStyle = '#7ea24a'; c.lineWidth = 4; c.stroke(); } c.fillStyle = '#f6f9e4'; c.beginPath(); c.arc(cx, cx, 22, 0, Math.PI * 2); c.fill(); });
  const lado = canvasTex(256, 256, (c, w, hh) => { c.fillStyle = '#7da84a'; c.fillRect(0, 0, w, hh); for (let i = 0; i < 20; i++) { c.fillStyle = i % 2 ? '#6b9440' : '#93bb5c'; c.fillRect(i * 13, 0, 6, hh); } });
  g.add(mesh(new THREE.CylinderGeometry(R, R, h, 48, 1, true), new THREE.MeshStandardMaterial({ map: lado, roughness: .7, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .3 })));
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ map: cara, roughness: .5, envMap: ENV, envMapIntensity: .3 })); tapa.rotation.x = -Math.PI / 2; tapa.position.y = h / 2 + .001; g.add(tapa);
  const capaP = new THREE.Group(); capaP.position.set(R, 0, 0); const vaina = mesh(new THREE.CylinderGeometry(R + .06, R + .06, h * 1.6, 32, 1, true, -Math.PI * .5, Math.PI * .55), new THREE.MeshStandardMaterial({ map: lado, roughness: .7, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .3 }), -R, .25, 0); capaP.add(vaina); g.add(capaP);
  g.rotation.x = .5; g.userData.tick = t => { capaP.rotation.y = -1.0 * ease(clamp((t - .6) / 1.2)); }; return g; }
// pimentón: cuerpo con 4 lóbulos, brillante, con pedúnculo y cáliz verde
export function pimenton(o = {}) { const g = new THREE.Group(); const geo = new THREE.SphereGeometry(.8, 40, 30); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const th = Math.atan2(z, x); const lob = 1 + .13 * Math.cos(4 * th) * (y < .5 ? 1 : .5); const alto = y > 0 ? 1.05 : 1.2; let yy = y * alto; if (y > .55) yy -= (y - .55) * .5; if (y < -.6) yy += Math.cos(4 * th) * .08 * (-.6 - y) * 3; const est = y < 0 ? 1 - (-y) * .12 : 1; pos.setXYZ(i, x * lob * est, yy, z * lob * est); }
  geo.computeVertexNormals(); const mat = new THREE.MeshPhysicalMaterial({ color: col(o.color || '#3f9a2e'), roughness: .22, clearcoat: 1, clearcoatRoughness: .15, envMap: ENV, envMapIntensity: 1.1 });
  const cuerpo = mesh(geo, mat); g.add(cuerpo); const caliz = mesh(new THREE.CylinderGeometry(.24, .3, .1, 5), M.std('#3c7a26', .6), 0, .64, 0); g.add(caliz); const ped = mesh(new THREE.CylinderGeometry(.06, .08, .45, 8), M.std('#3c7a26', .6), .06, .86, 0); ped.rotation.z = -.35; g.add(ped);
  g.userData.mat = mat; return g; }
const COLORES_PIMENTON = ['#3f9a2e', '#d9c22b', '#f08a1c', '#d8261c'];
export function pimentonMadura(o = {}) { const p = pimenton({ color: COLORES_PIMENTON[0] }); const c = new THREE.Color(); const cs = COLORES_PIMENTON.map(x => col(x)); const per = o.ciclo || 2.4; const g0 = glow('#ffe28a', 3.2, 0); p.add(g0);
  p.userData.tick = t => { const k = clamp((t - .5) / per) * 3; const i = Math.min(2, Math.floor(k)), f = k - i; c.copy(cs[i]).lerp(cs[i + 1], ease(clamp(f))); p.userData.mat.color.copy(c); g0.material.opacity = .25 * Math.max(0, Math.sin(f * Math.PI)); }; return p; }
export function pimentones(o = {}) { const g = new THREE.Group(); const lista = o.colores || [COLORES_PIMENTON[0], COLORES_PIMENTON[1], COLORES_PIMENTON[3]]; lista.forEach((c, i) => { const p = pimenton({ color: c }); p.scale.setScalar(.72); p.position.set((i - (lista.length - 1) / 2) * 1.35, Math.abs(i - 1) * -.05, i === 1 ? .3 : 0); p.rotation.y = i * 1.3; g.add(p); });
  g.userData.tick = t => g.children.forEach((p, i) => { p.position.y = Math.sin(t * 2.2 + i * 1.4) * .08; }); return g; }
// naranja con poros (textura de cáscara) y hojita
export function naranja(o = {}) { const g = new THREE.Group(); const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = o.color || '#f39a1e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = i % 2 ? 'rgba(255,200,120,.35)' : 'rgba(170,80,0,.25)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 1.6, 0, 7); c.fill(); } });
  g.add(mesh(new THREE.SphereGeometry(.85, 36, 26), new THREE.MeshStandardMaterial({ map: tex, roughness: .55, envMap: ENV, envMapIntensity: .6 }))); g.add(mesh(new THREE.CylinderGeometry(.05, .06, .12, 8), M.std('#5b7a2a', .6), 0, .86, 0)); const h = hoja('#4caf50', .45); h.position.set(.2, .95, 0); h.rotation.z = -.9; g.add(h); return g; }
Object.assign(OBJETOS, {
  platanera: p => platanera(p), racimo: p => { const r = racimo(p); r.position.y = 1.3; const g = new THREE.Group(); g.add(r); g.userData.tick = t => { r.rotation.z = Math.sin(t * 1.4) * .06; }; return g; },
  colino: p => platanera({ ...p, colino: true }), mataColino: p => { const g = new THREE.Group(); const m = platanera({ ...p, colino: true }); m.scale.setScalar(p.escalaMata || .52); m.position.y = -1.4; g.add(m); g.userData.tick = t => m.userData.tick(t); return g; }, corteTallo: p => corteTallo(p),
  pimenton: p => pimenton(p), pimentonRojo: () => pimenton({ color: '#d8261c' }), pimentonVerde: () => pimenton({ color: '#3f9a2e' }), pimentonMadura: p => pimentonMadura(p), pimentones: p => pimentones(p), naranja: p => naranja(p),
});
// ESCENARIO BUS (2026-11-23): interior de bus urbano con ventanas por donde pasa la ciudad, tubo amarillo, manijas y sillas; el bus se mece.
function escenarioBus(g) {
  const ciudad = canvasTex(2048, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd3f2'); gr.addColorStop(1, '#e8f4fb'); c.fillStyle = gr; c.fillRect(0, 0, w, h); let x = 0, i = 0; while (x < w) { const bw = 120 + (i * 53 % 110), bh = 180 + (i * 97 % 260); c.fillStyle = ['#e7c8a0', '#c9d8c5', '#e8b9a6', '#cfd6e8', '#f2e2b8', '#b9c9d9'][i % 6]; c.fillRect(x, h - bh, bw - 10, bh); c.fillStyle = 'rgba(255,255,255,.55)'; for (let yy = h - bh + 24; yy < h - 30; yy += 52) for (let xx = x + 14; xx < x + bw - 34; xx += 36) c.fillRect(xx, yy, 20, 28); if (i % 4 === 1) { c.fillStyle = '#3f8f46'; c.beginPath(); c.arc(x + bw - 5, h - 70, 60, 0, 7); c.fill(); c.fillStyle = '#6b4a2a'; c.fillRect(x + bw - 12, h - 30, 14, 30); } x += bw; i++; } });
  ciudad.wrapS = THREE.RepeatWrapping; ciudad.repeat.set(.55, 1);
  g.add(mesh(new THREE.PlaneGeometry(16, 12), M.std('#dfe5ea', .8), 0, 5, -4.1));
  const ven = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshBasicMaterial({ map: ciudad, toneMapped: false })); ven.position.set(0, 4.7, -4.05); g.add(ven);
  const marco = M.std('#2b2f36', .4, .5); for (let i = -3; i <= 3; i++) g.add(mesh(rbox(.18, 2.8, .12, .03), marco, i * 2.3, 4.7, -3.98)); g.add(mesh(rbox(14.5, .2, .14, .03), marco, 0, 6.05, -3.98)); g.add(mesh(rbox(14.5, .2, .14, .03), marco, 0, 3.35, -3.98));
  g.add(mesh(rbox(16, 3.2, .1, .02), M.std('#3a7d6b', .6), 0, 1.6, -4.0)); g.add(mesh(rbox(16, .12, .14, .02), M.oro(), 0, 3.2, -3.96));
  [-4.6, 4.6].forEach(x => { g.add(mesh(rbox(2.6, .35, 1.4, .1), M.std('#2f5fa8', .55), x, 1.6, -3.1)); g.add(mesh(rbox(2.6, 1.6, .3, .1), M.std('#2f5fa8', .55), x, 2.5, -3.75)); });
  const amar = M.std('#f2c230', .35, .3); const poste = mesh(new THREE.CylinderGeometry(.07, .07, 8, 12), amar, -2.4, 4, -1.2); g.add(poste); const barra = mesh(new THREE.CylinderGeometry(.06, .06, 14, 12), amar, 0, 7.4, -1.6); barra.rotation.z = Math.PI / 2; g.add(barra);
  const manijas = []; for (let i = -5; i <= 5; i++) { if (i === 0) continue; const m = new THREE.Group(); m.position.set(i * 1.25, 7.4, -1.6); m.add(mesh(new THREE.CylinderGeometry(.03, .03, .55, 6), M.std('#333', .5), 0, -.28, 0)); const aro = mesh(new THREE.TorusGeometry(.16, .035, 8, 18), M.std('#f2f2f2', .4), 0, -.68, 0); m.add(aro); g.add(m); manijas.push(m); }
  const timbre = mesh(rbox(.5, .32, .1, .04), M.std('#d33', .4), -2.4, 3.6, -1.1); g.add(timbre);
  g.userData.tick = t => { ciudad.offset.x = (t * .22) % 1; manijas.forEach((m, i) => m.rotation.z = Math.sin(t * 2.2 + i * .3) * .14); g.rotation.z = Math.sin(t * 1.7) * .006; g.position.y = Math.abs(Math.sin(t * 6)) * .015; };
}
// TIMBRE (2026-11-23, cierre de promo "¡llegó a tu puerta!"): la caja cae en el tapete, el timbre suena (ondas + DING DONG),
// la puerta se abre con luz cálida, la persona sale celebrando y el frasco se asoma de la caja y saluda.
// p = {aroma, cliente:{persona}, sticker, stickerY, stickerT, titulo, colorPuerta, colorPared, ding:'¡DING DONG! 🔔'}
def('timbre', (p) => {
  const E = estudio({ fogNear: 22, fogFar: 46 }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const fachada = new THREE.Group(); fachada.position.z = -1.6; sc.add(fachada);
  fachada.add(mesh(new THREE.PlaneGeometry(16, 12), M.std(p.colorPared || '#efe3cf', .9), 0, 5, -.06));
  const lad = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#c4683f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e9d6c4'; c.lineWidth = 4; for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } } }); lad.wrapS = lad.wrapT = THREE.RepeatWrapping; lad.repeat.set(4, 1);
  fachada.add(mesh(new THREE.PlaneGeometry(16, 1.2), new THREE.MeshStandardMaterial({ map: lad, roughness: .9 }), 0, .6, -.04));
  const W2 = 1.9, H2 = 3.4; const marcoM = M.std('#f7f3ea', .5); fachada.add(mesh(rbox(W2 + .5, .3, .3, .05), marcoM, 0, H2 + .15, 0)); [-1, 1].forEach(s => fachada.add(mesh(rbox(.25, H2, .3, .05), marcoM, s * (W2 / 2 + .12), H2 / 2, 0)));
  const interior = mesh(new THREE.PlaneGeometry(W2, H2), M.neon('#ffd9a0'), 0, H2 / 2, -.05); fachada.add(interior);
  const luzP = glow('#ffcf7a', 7, 0); luzP.position.set(0, H2 / 2, .4); fachada.add(luzP);
  const bisagra = new THREE.Group(); bisagra.position.set(-W2 / 2, 0, .02); fachada.add(bisagra);
  const puertaM = M.std(p.colorPuerta || '#2e5d7b', .5); const hojaP = mesh(rbox(W2, H2, .14, .04), puertaM, W2 / 2, H2 / 2, 0); bisagra.add(hojaP);
  [[.55, 2.5], [.55, 1.0], [1.35, 2.5], [1.35, 1.0]].forEach(([x, y]) => bisagra.add(mesh(rbox(.6, 1.1, .05, .03), M.std('#24506b', .5), x, y, .09)));
  bisagra.add(mesh(new THREE.SphereGeometry(.09, 12, 10), M.oro(), W2 - .22, H2 * .47, .14));
  const numero = cartel([{ t: '23', size: 150, color: '#2b2b2b' }], { w: 256, h: 192, ancho: .6, fondo: '#f2c14e', radio: 30 }); numero.position.set(W2 / 2 + .75, H2 - .3, .02); fachada.add(numero);
  const boton = new THREE.Group(); boton.position.set(W2 / 2 + .62, H2 * .5, .05); fachada.add(boton); boton.add(mesh(rbox(.34, .5, .08, .04), M.std('#d9d4c8', .4, .3))); const bt = mesh(new THREE.CylinderGeometry(.09, .09, .08, 16), M.std('#ffcc33', .3, 0, '#ffaa00'), 0, 0, .06); bt.rotation.x = Math.PI / 2; boton.add(bt);
  const ondas = [0, 1, 2].map(i => { const o2 = new THREE.Mesh(new THREE.TorusGeometry(.3, .03, 8, 32), M.neon('#ffd34d')); o2.material = o2.material.clone(); o2.material.transparent = true; boton.add(o2); return o2; });
  const tapete = cartel([{ t: 'BIENVENIDOS', size: 64, color: '#5a3a18', peso: 900 }], { w: 512, h: 256, ancho: 2.4, fondo: '#b98a4e', radio: 24 }); tapete.rotation.x = -Math.PI / 2; tapete.position.set(.2, .02, .9); sc.add(tapete);
  const lamp = mesh(new THREE.SphereGeometry(.16, 12, 10), M.neon('#ffe9b0'), -W2 / 2 - .7, H2 + .2, .25); fachada.add(lamp); const gl = glow('#ffe9b0', 2.2, .6); gl.position.copy(lamp.position); fachada.add(gl);
  const mat1 = mesh(new THREE.CylinderGeometry(.38, .28, .6, 16), M.std('#b85a33', .8), -W2 / 2 - 1.2, .3, .2); fachada.add(mat1); for (let k = 0; k < 6; k++) { const h2 = hoja(['#3f8f46', '#5fae4f'][k % 2], .6); h2.position.set(-W2 / 2 - 1.2 + Math.sin(k * 2.1) * .2, .9 + (k % 3) * .2, .2 + Math.cos(k * 2.1) * .1); h2.rotation.z = Math.sin(k * 1.3) * .8; fachada.add(h2); }
  const cj = cajaEnvio({}); cj.scale.setScalar(.62); cj.rotation.y = -.3; sc.add(cj); const u = cj.userData; u.abrir(0);
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.42); sc.add(fr); fr.visible = false;
  const cl = persona(p.cliente || { ropa: '#e07a5f', peinado: 'largo', tono: 2, pelo: '#2b1a10' }); cl.scale.setScalar(.78); cl.position.set(-.45, 0, -1.75); sc.add(cl);
  const din = sticker(cp, p.ding || '¡DING DONG! 🔔', { y: p.dingY || 700, x: 720, rot: 8 }); const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1330, cls: 'grande', rot: -5 }) : null; const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [2.6, 3.4, 12.5], [1.0, 2.8, 9.6], [.4, 1.9, -.6]);
    const tc = d * .08, kC = win(t, tc, tc + .45); cj.position.set(1.2, lerp(5, 0, kC * kC) + (kC >= 1 ? Math.abs(Math.sin((t - tc - .45) * 9)) * .25 * Math.exp(-(t - tc - .45) * 5) : 0), .75); if (kC > .95 && kC < 1) cam.position.y += .05;
    const tr = d * .26; const press = win(t, tr, tr + .12) - win(t, tr + .2, tr + .32); bt.position.z = .06 - .04 * press; ondas.forEach((o2, i) => { const k = win(t, tr + i * .18, tr + .9 + i * .18); o2.visible = k > 0 && k < 1; o2.scale.setScalar(1 + 5 * k); o2.material.opacity = 1 - k; }); din.set(win(t, tr + .05, tr + .35) * (1 - win(t, d * .62, d * .7)), 8 + Math.sin(t * 20) * 3 * (1 - win(t, tr + .35, tr + .9)));
    const kP = ease(win(t, d * .42, d * .6)); bisagra.rotation.y = -1.75 * kP; luzP.material.opacity = .8 * kP; interior.material.color.set(kP > 0 ? '#ffd9a0' : '#3a2a20');
    cl.position.z = lerp(-1.95, -.75, ease(win(t, d * .5, d * .7))); animPersona(cl, t, { accion: t > d * .62 ? 'celebrar' : 'idle', fase: 1 });
    const kF = win(t, d * .66, d * .8); u.abrir(ease(win(t, d * .6, d * .72))); fr.visible = kF > 0; cj.updateMatrixWorld(true); fr.position.set(cj.position.x, cj.position.y + lerp(.1, .95, back(kF)), cj.position.z); fr.rotation.y = -.2; animFrasco(fr, t, { expr: 'feliz', saluda: kF >= 1, hablar: .2 });
    if (st) st.set(win(t, p.stickerT ?? d * .74, (p.stickerT ?? d * .74) + .3)); if (tit) tit.style.opacity = win(t, .1, .4); } };
});
SFX.timbre = (st, d, p) => [{ t: st + d * .08 + .45, tipo: 'golpe' }, { t: st + d * .26, tipo: 'pop' }, { t: st + d * .26 + .32, tipo: 'pop' }, { t: st + d * .42, tipo: 'whoosh' }, { t: st + d * .68, tipo: 'pop' }, ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .74), tipo: 'golpe' }] : [])];

// ---------- motor de línea de tiempo ----------
let SPEC = null; const ESC = []; let CAP = null, PASOS = null, MARCA = null;
export async function init(spec) {
  SPEC = spec; setPaleta(spec.paleta || 'bosque'); await Promise.all(['900 60px P','800 60px P','700 60px P','600 60px P','500 60px P','400 60px P'].map(f => document.fonts.load(f))); await document.fonts.ready;
  FONT3D = await new FontLoader().loadAsync('fuentes/helvetiker_bold.typeface.json');
  if (spec.custom) { try { (new Function('API', spec.custom))(API); } catch (e) { console.error('custom', e); } }
  for (const s of spec.scenes) { if (s.paleta) setPaleta(s.paleta); const f = PLANTILLAS[s.plantilla || 'gancho'] || PLANTILLAS.gancho; const o = f(s.p || {}, spec); o.cp.style.display = 'none'; ESC.push({ ...s, ...o }); setPaleta(spec.paleta || 'bosque'); }
  CAP = el('div', 'caps'); if (spec.pasos) { PASOS = el('div', 'pasos'); for (let i = 1; i <= spec.pasos; i++) el('div', 'pd', PASOS, String(i)); }
  if (spec.marca) MARCA = el('div', 'marca', OV, '@ecovital_7');
  window.SFX = sfxEventos(spec); return true;
}
export const API = { THREE, PLANTILLAS, OBJETOS, PANTALLAS, SFX, def, cajaEnvio, estudio, camara, capa, el, etiqueta, sticker, chip, proyectar, frasco, animFrasco, persona, animPersona, aerosol, nubeOlor, gota, lavanda, manzanilla, hoja, caja, celular, pedestal, relojArena, animReloj, moto, casa, texto3D, cartel, escenario, crearHeroe, glow, mesh, rbox, M, canvasTex, redraw, rr, clamp, lerp, ease, eout, back, elastic, win, get PAL() { return PAL; } };
Object.assign(API, { aguacate, aguacateAbierto, banano, bolsaPapel, toalla, botella, maletaGym }); // (2026-11-20)
Object.assign(API, { grano, cereza, paginaCal }); // (2026-11-21)
Object.assign(API, { vaina, florVainilla, orquidea, notaTex }); // (2026-11-22)
Object.assign(API, { platanera, racimo, corteTallo, pimenton, pimentonMadura, pimentones, naranja, hojaPlatano, dedoBanano }); // (2026-11-23)
window.API = API;

function sfxEventos(spec) { const ev = []; spec.scenes.forEach((s, i) => { const st = spec.timeline.scenes[i].start; if (i) ev.push({ t: st - .12, tipo: 'whoosh' }); if (['pedestal', 'ingredientes', 'dato', 'versus'].includes(s.plantilla)) ev.push({ t: st + .4, tipo: 'pop' }); if (['sello', 'entrega', 'regalo', 'persona'].includes(s.plantilla) && (s.p?.sticker || s.plantilla === 'sello' || s.plantilla === 'entrega')) ev.push({ t: st + (s.plantilla === 'sello' ? spec.timeline.scenes[i].d * .35 : spec.timeline.scenes[i].d * .55) + .2, tipo: 'golpe' }); if (s.plantilla === 'comentario') ev.push({ t: st + .4, tipo: 'teclas', d: spec.timeline.scenes[i].d * .5 }); if (s.plantilla === 'contador' || s.plantilla === 'paso') ev.push({ t: st + .05, tipo: 'golpe' }); if (s.plantilla === 'mapa') { const d = spec.timeline.scenes[i].d; const n = (s.p?.ciudades || [0,0,0,0,0,0]).length; for (let j = 0; j < n; j++) ev.push({ t: st + .45 + j * (d * .62) / n, tipo: 'pop' }); if (s.p?.sticker) ev.push({ t: st + d * .72 + .15, tipo: 'golpe' }); } if (s.plantilla === 'lupa') { const d = spec.timeline.scenes[i].d; ev.push({ t: st + d * .45, tipo: 'golpe' }); if (s.p?.sticker) ev.push({ t: st + d * .7 + .15, tipo: 'pop' }); } if (SFX[s.plantilla]) ev.push(...SFX[s.plantilla](st, spec.timeline.scenes[i].d, s.p || {})); if (s.plantilla === 'quiz') { const d = spec.timeline.scenes[i].d; (s.p?.opciones || [0, 0]).forEach((_, j) => ev.push({ t: st + .3 + j * .22, tipo: 'pop' })); ev.push({ t: st + (s.p?.revela ?? d * .55), tipo: 'golpe' }); } }); return ev; }

function drawCaps(t) {
  const tl = SPEC.timeline; const W_ = tl.words; let ci = -1; for (let i = 0; i < tl.chunks.length; i++) { const [a, b] = tl.chunks[i]; const fin = i + 1 < tl.chunks.length ? W_[tl.chunks[i + 1][0]].s : W_[b].e + .6; if (t >= W_[a].s - .08 && t < fin) { ci = i; break; } }
  if (ci < 0) { CAP.innerHTML = ''; return; } const [a, b] = tl.chunks[ci]; const res = (SPEC.resaltar || []).map(x => x.toLowerCase());
  let html = ''; for (let i = a; i <= b; i++) { const w = W_[i]; const limpio = w.w.toLowerCase().replace(/[^\wáéíóúñü]/gi, ''); const act = t >= w.s && t < (i < b ? W_[i + 1].s : w.e + .3); const pas = t >= w.s;
    const cls = ['w', act ? 'act' : '', pas ? 'pas' : '', res.includes(limpio) ? 'res' : ''].join(' '); html += `<span class="${cls}">${w.w}</span> `; }
  if (CAP.dataset.k !== ci + ':' + html.length + ':' + html.split('act').length) { CAP.innerHTML = html; CAP.dataset.k = ci + ':' + html.length + ':' + html.split('act').length; }
  const k = win(t, W_[a].s - .08, W_[a].s + .12); CAP.style.transform = `translate(-50%,0) scale(${.92 + .08 * eout(k)})`; CAP.style.opacity = clamp(k * 1.5);
}
export function renderAt(t) {
  const tl = SPEC.timeline; let i = 0; for (let j = 0; j < tl.scenes.length; j++) if (t >= tl.scenes[j].start) i = j;
  const s = ESC[i], lt = t - tl.scenes[i].start, d = tl.scenes[i].d;
  ESC.forEach((e, j) => e.cp.style.display = j === i ? 'block' : 'none');
  if (s.paleta) setPaleta(s.paleta); else setPaleta(SPEC.paleta || 'bosque');
  s.upd(lt, d);
  // transición tipo "whip": desenfoque + destello al entrar/salir
  const tin = clamp(1 - lt / .18), tout = clamp((lt - (d - .12)) / .12); const bl = Math.max(tin, tout) * 14;
  canvas.style.filter = bl > .3 ? `blur(${bl}px) brightness(${1 + Math.max(tin, tout) * .5})` : 'none'; if (i === 0) canvas.style.filter = 'none';
  s.cam.updateMatrixWorld(); R.render(s.sc, s.cam);
  drawCaps(t);
  if (PASOS) { const actual = s.paso || 0; PASOS.style.opacity = actual ? 1 : 0; [...PASOS.children].forEach((c, j) => { c.className = 'pd' + (j + 1 < actual ? ' hecho' : '') + (j + 1 === actual ? ' act' : ''); }); }
  document.getElementById('grano').style.backgroundPosition = `${(t * 997) % 300}px ${(t * 613) % 300}px`;
}
window.renderAt = renderAt;

// ===================== MEJORA 2026-11-24 =====================
// Objetos de CACAO (cacaotero con flores y mazorcas pegadas al tronco = caulifloría, mazorca con 10 costillas,
// mazorca que se abre en dos y muestra las semillas con pulpa blanca, flor diminuta con mosquito polinizador,
// semillas secas, barra de chocolate) y de MAÍZ (mazorca con hileras PARES de granos, hojas que se abren, pelos que
// se mecen; variante con polen que cae sobre los pelos; variante con huecos de granos sin polinizar).
// Plantilla nueva `paracaidas` (cierre de promo): la caja de envío baja en paracaídas sobre un barrio al atardecer,
// aterriza en la X con rebote, el paracaídas se desinfla y cae a un lado, la caja se abre y sale el frasco saludando.
const texCorteza = (c1 = '#6b4a32', c2 = '#4e3423') => canvasTex(256, 512, (c, w, h) => { c.fillStyle = c1; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { c.strokeStyle = i % 2 ? c2 : 'rgba(255,255,255,.08)'; c.lineWidth = 2 + (i % 3); c.beginPath(); const x = (i * 37) % w; c.moveTo(x, 0); for (let y = 0; y <= h; y += 32) c.lineTo(x + Math.sin(y * .05 + i) * 6, y); c.stroke(); }
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(150,170,110,.28)'; c.beginPath(); c.arc((i * 71) % w, (i * 131) % h, 5 + (i % 5) * 3, 0, 7); c.fill(); } });
// perfil de la mazorca de cacao (ahusada en las dos puntas)
const perfilCacao = (n = 28, L = 2.2, R = .62) => { const pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector2(Math.max(.002, Math.pow(Math.sin(Math.PI * k), .75) * R * (1 - .12 * k)), (k - .5) * L)); } return pts; };
function costillas(geo, n = 10, amp = .08) { const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i); const th = Math.atan2(z, x); const f = 1 + amp * Math.cos(n * th) + .015 * Math.sin(y * 23 + th * 7); pos.setX(i, x * f); pos.setZ(i, z * f); } geo.computeVertexNormals(); return geo; }
const matCacao = c => new THREE.MeshPhysicalMaterial({ color: col(c), roughness: .5, clearcoat: .35, clearcoatRoughness: .4, envMap: ENV, envMapIntensity: .9 });
export function mazorcaCacao(o = {}) { const g = new THREE.Group(); const geo = costillas(new THREE.LatheGeometry(perfilCacao(), 48)); const m = mesh(geo, matCacao(o.color || '#e0a21b')); g.add(m);
  g.add(mesh(new THREE.CylinderGeometry(.06, .08, .35, 8), M.std('#5b4a2a', .8), 0, 1.25, 0)); g.userData.mat = m.material; return g; }
// mazorca abierta: dos mitades que se separan y muestran la columna de semillas con pulpa blanca
export function cacaoAbierto(o = {}) { const g = new THREE.Group(); const prof = perfilCacao(); const mitades = [0, 1].map(s => { const h = new THREE.Group();
    h.add(mesh(costillas(new THREE.LatheGeometry(prof, 24, s * Math.PI, Math.PI)), matCacao(o.color || '#e08a1b')));
    const inn = new THREE.Mesh(new THREE.LatheGeometry(prof.map(v => new THREE.Vector2(v.x * .9, v.y * .97)), 24, s * Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: col('#f3e6c4'), roughness: .7, side: THREE.BackSide, envMap: ENV, envMapIntensity: .4 })); h.add(inn); g.add(h); return h; });
  const col2 = new THREE.Group(); g.add(col2); const pulpa = new THREE.MeshPhysicalMaterial({ color: col('#f7f2e8'), roughness: .3, clearcoat: 1, clearcoatRoughness: .15, envMap: ENV, envMapIntensity: 1 });
  for (let i = 0; i < 30; i++) { const fila = Math.floor(i / 5), a = (i % 5) / 5 * Math.PI * 2 + fila * .6; const y = -.78 + fila * .31; const r = .2 * Math.pow(Math.sin(Math.PI * (y + 1.1) / 2.2), .6); const s = mesh(new THREE.SphereGeometry(.15, 14, 10), pulpa, Math.cos(a) * r, y, Math.sin(a) * r); s.scale.set(.85, 1.25, .75); s.rotation.y = -a; col2.add(s); }
  g.userData.tick = t => { const k = ease(clamp((t - (o.abre ?? .35)) / .9)); mitades[0].position.x = .75 * k; mitades[0].rotation.y = .8 * k; mitades[1].position.x = -.75 * k; mitades[1].rotation.y = -.8 * k; col2.rotation.y = t * .5; }; return g; }
// semillas secas (fermentadas) y barra de chocolate
export function semillasCacao() { const g = new THREE.Group(); for (let i = 0; i < 16; i++) { const a = i * 2.4, r = .25 + .55 * Math.sqrt(i / 16); const b = mesh(new THREE.SphereGeometry(.24, 14, 10), M.std(['#5a3320', '#6e3f26', '#7a4a2c', '#4b2a1a'][i % 4], .55), Math.cos(a) * r, .2 + (1 - r) * .55 + (i % 3) * .05, Math.sin(a) * r); b.scale.set(1, .55, .72); b.rotation.set(Math.sin(i) * .6, a, Math.cos(i * 1.3) * .5); g.add(b); } return g; }
export function chocolate() { const g = new THREE.Group(); const cm = new THREE.MeshPhysicalMaterial({ color: col('#4a2617'), roughness: .35, clearcoat: .6, envMap: ENV, envMapIntensity: .8 });
  g.add(mesh(rbox(2.2, .18, 1.5, .05), cm, 0, 0, 0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.add(mesh(rbox(.48, .14, .42, .06), cm, -.81 + i * .54, .14, -.48 + j * .48));
  const pap = new THREE.Mesh(new THREE.BoxGeometry(1.0, .34, 1.56), new THREE.MeshStandardMaterial({ color: col('#e8b84a'), metalness: 1, roughness: .35, envMap: ENV, envMapIntensity: 1.3 })); pap.position.x = .65; g.add(pap); g.rotation.x = .55; return g; }
// flor diminuta de cacao + mosquito polinizador (1 a 3 mm) volando alrededor
function florCacaoMini(s = 1) { const g = new THREE.Group(); const pet = M.std('#f7e3e8', .5); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const p = mesh(new THREE.CapsuleGeometry(.05 * s, .16 * s, 4, 8), pet, Math.cos(a) * .13 * s, Math.sin(a) * .13 * s, 0); p.rotation.z = a - Math.PI / 2; g.add(p); }
  g.add(mesh(new THREE.SphereGeometry(.07 * s, 10, 8), M.std('#d7708a', .5))); g.add(mesh(new THREE.CylinderGeometry(.015 * s, .015 * s, .22 * s, 5), M.std('#c9b48a', .7), 0, 0, -.1 * s)); return g; }
function mosquito() { const g = new THREE.Group(); const cuerpo = mesh(new THREE.CapsuleGeometry(.05, .16, 4, 8), M.std('#2a2420', .5)); cuerpo.rotation.z = Math.PI / 2; g.add(cuerpo); g.add(mesh(new THREE.SphereGeometry(.05, 8, 8), M.std('#2a2420', .5), .13, 0, 0));
  const alaM = new THREE.MeshStandardMaterial({ color: col('#dfefff'), transparent: true, opacity: .55, side: THREE.DoubleSide, roughness: .2 }); const alas = [-1, 1].map(s => { const a = new THREE.Mesh(new THREE.CircleGeometry(.12, 12), alaM); a.scale.set(1.4, .6, 1); a.position.set(-.02, .06, s * .08); a.rotation.x = Math.PI / 2; g.add(a); return a; }); g.userData.alas = alas; return g; }
export function florCacao(o = {}) { const g = new THREE.Group(); const tronco = mesh(new THREE.CylinderGeometry(.62, .7, 3.2, 28), new THREE.MeshStandardMaterial({ map: texCorteza(), roughness: .85, envMap: ENV, envMapIntensity: .3 }), 0, 0, 0); g.add(tronco);
  const flores = []; [[.2, .5], [-.4, -.2], [.55, -.7], [-.1, .9]].forEach(([a, y], i) => { const cl = new THREE.Group(); cl.position.set(Math.sin(a) * .68, y, Math.cos(a) * .68); cl.rotation.y = a; for (let k = 0; k < 3; k++) { const f = florCacaoMini(1.05); f.position.set(Math.sin(k * 1.7) * .2, Math.cos(k * 2.3) * .18, .12 + (k % 2) * .06); f.rotation.set(Math.sin(k) * .4, Math.cos(k) * .4, k); cl.add(f); flores.push(f); } g.add(cl); });
  const mq = mosquito(); mq.scale.setScalar(1.6); g.add(mq); const gl = glow('#ffe7a8', 1.2, .35); g.add(gl);
  g.userData.tick = t => { const a = t * 1.8; mq.position.set(Math.sin(a) * 1.15, .3 + Math.sin(t * 3.1) * .45, Math.cos(a) * 1.15 + .2); mq.rotation.y = -a + Math.PI; mq.userData.alas.forEach((w, i) => w.rotation.x = Math.PI / 2 + Math.sin(t * 60 + i) * .6); gl.position.copy(mq.position); flores.forEach((f, i) => f.scale.setScalar(1 + .06 * Math.sin(t * 3 + i))); }; return g; }
// árbol de cacao: tronco con corteza, ramas, hojas grandes (las nuevas rojizas) y mazorcas + flores pegadas al TRONCO
export function cacaotero(o = {}) { const g = new THREE.Group(); const alto = o.alto || 3.6; const cort = new THREE.MeshStandardMaterial({ map: texCorteza(), roughness: .85, envMap: ENV, envMapIntensity: .3 });
  g.add(mesh(new THREE.CylinderGeometry(.24, .34, alto, 20), cort, 0, alto / 2, 0)); const ramas = [];
  [[.7, 0], [-.8, 2.1], [.5, 4.0]].forEach(([inc, giro], i) => { const piv = new THREE.Group(); piv.position.y = alto - .2 - i * .25; piv.rotation.set(0, giro, inc); const r = mesh(new THREE.CylinderGeometry(.08, .14, 1.8, 10), cort, 0, .9, 0); piv.add(r);
    for (let k = 0; k < 7; k++) { const h = hoja(k % 4 === 3 ? '#b4573c' : ['#2f6b35', '#3d7d3a', '#4c8a3a'][k % 3], 1.15); h.scale.set(1.25, 1.7, 1); h.position.set(Math.sin(k * 2.2) * .45, 1.0 + k * .16, Math.cos(k * 2.2) * .35); h.rotation.set(Math.cos(k) * .9, k * 1.3, Math.sin(k * 1.7) * 1.2 + .4); piv.add(h); } g.add(piv); ramas.push(piv); });
  const colores = o.colores || ['#e0a21b', '#d9731f', '#9e2f3c', '#7fae3a']; const pods = colores.map((c, i) => { const a = i * 1.9 + .3, y = .7 + i * .62; const piv = new THREE.Group(); piv.position.set(Math.sin(a) * .3, y, Math.cos(a) * .3); piv.rotation.y = a; const m = mazorcaCacao({ color: c }); m.scale.setScalar(.56); m.position.set(0, -.62, .34); m.rotation.x = .25; piv.add(m); g.add(piv); return piv; });
  for (let i = 0; i < 6; i++) { const a = i * 2.7 + 1.1, y = .9 + i * .45; const f = florCacaoMini(.9); f.position.set(Math.sin(a) * .31, y, Math.cos(a) * .31); f.rotation.y = a; g.add(f); }
  g.userData.tick = t => { ramas.forEach((r, i) => r.rotation.x = Math.sin(t * 1.3 + i) * .05); pods.forEach((p, i) => p.rotation.z = Math.sin(t * 1.7 + i * 1.3) * .06); }; return g; }
// MAÍZ: mazorca con hileras pares de granos (instanciadas), tusa, hojas que se abren y pelos que se mecen
export function mazorcaMaiz(o = {}) { const g = new THREE.Group(); const filas = o.filas || 16, porFila = o.porFila || 24, L = 2.3;
  const R = y => .44 * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (y + .1) / 1.25), 3)), .5) * (1 - .1 * Math.max(0, -y - .8));
  g.add(mesh(new THREE.CylinderGeometry(.25, .3, L * .98, 20), M.std('#e8d9a6', .8), 0, 0, 0));
  const geoG = rbox(.17, .12, .14, .04); const matG = new THREE.MeshPhysicalMaterial({ color: col('#ffffff'), roughness: .35, clearcoat: .5, envMap: ENV, envMapIntensity: .9 });
  const n = filas * porFila; const inst = new THREE.InstancedMesh(geoG, matG, n); inst.castShadow = true; const dm = new THREE.Object3D(); const c = new THREE.Color(); let idx = 0; const huecos = [];
  for (let f = 0; f < filas; f++) for (let k = 0; k < porFila; k++) { const y = -L / 2 + .08 + k / (porFila - 1) * (L - .16); const r = Math.max(.12, R(y)) + .03; const a = f / filas * Math.PI * 2 + (k % 2) * .02;
    const hueco = o.huecos && ((k > porFila * .66 && (f * 7 + k * 3) % 5 < 3) || (f * 13 + k * 11) % 9 === 0); dm.position.set(Math.cos(a) * r, y, Math.sin(a) * r); dm.rotation.set(0, -a, 0); dm.scale.setScalar(hueco ? .001 : Math.min(1, r / .3) * (1 + .05 * Math.sin(f * k)));
    dm.updateMatrix(); inst.setMatrixAt(idx, dm.matrix); c.set(o.color || '#f2c230').offsetHSL(.01 * Math.sin(f * 3 + k), 0, .05 * Math.sin(f * 1.7 + k * 2.3)); inst.setColorAt(idx, c); if (hueco) huecos.push(dm.position.clone()); idx++; }
  g.add(inst);
  const hojasT = []; for (let i = 0; i < 5; i++) { const piv = new THREE.Group(); piv.position.y = -L / 2 - .05; piv.rotation.y = i / 5 * Math.PI * 2; const geo = new THREE.PlaneGeometry(.75, 2.4, 1, 8); const pos = geo.attributes.position; for (let j = 0; j < pos.count; j++) { const y = pos.getY(j) + 1.2, x = pos.getX(j); pos.setX(j, x * (1 - y / 2.6)); pos.setZ(j, .35 + y * y * .12); pos.setY(j, y); } geo.computeVertexNormals();
    const h = mesh(geo, new THREE.MeshStandardMaterial({ color: col(['#8fbf5a', '#a3cc6a', '#7fae4a'][i % 3]), roughness: .7, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .4 })); piv.add(h); g.add(piv); hojasT.push(piv); }
  const pelos = new THREE.Group(); pelos.position.y = L / 2 - .05; g.add(pelos); const pm = [M.std('#efd79a', .6), M.std('#d9a35a', .6), M.std('#a85a35', .7)];
  for (let i = 0; i < (o.nPelos || 46); i++) { const a = i * 2.4, sp = .6 + (i % 5) * .25; const pts = [new THREE.Vector3(Math.cos(a) * .05, 0, Math.sin(a) * .05), new THREE.Vector3(Math.cos(a) * .25 * sp, .55, Math.sin(a) * .25 * sp), new THREE.Vector3(Math.cos(a) * .7 * sp, .55 + (i % 3) * .1, Math.sin(a) * .7 * sp), new THREE.Vector3(Math.cos(a) * 1.0 * sp, .1 - (i % 4) * .12, Math.sin(a) * 1.0 * sp)];
    const tubo = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .012, 4, false), pm[i % 7 === 0 ? 2 : i % 2]); pelos.add(tubo); }
  let polen = null; if (o.polen) { polen = []; for (let i = 0; i < 26; i++) { const s = glow('#ffe14d', .16, .9); s.userData = { x: Math.sin(i * 2.1) * 1.1, z: Math.cos(i * 1.3) * .8, v: .6 + (i % 5) * .15, f: i / 26 }; g.add(s); polen.push(s); } }
  g.userData.tick = t => { const k = o.abrir === false ? 0 : ease(clamp((t - .2) / 1.0)); hojasT.forEach((h, i) => h.rotation.x = (.15 + .55 * k) * (i % 2 ? 1 : .8)); hojasT.forEach((h, i) => h.rotation.z = Math.sin(t * 1.2 + i) * .03);
    pelos.rotation.z = Math.sin(t * 1.5) * .07; pelos.rotation.x = Math.cos(t * 1.1) * .05; if (polen) polen.forEach(s => { const ph = (t * s.userData.v * .4 + s.userData.f) % 1; s.position.set(s.userData.x * (1 - ph * .6) + Math.sin(t * 2 + s.userData.f * 9) * .1, L / 2 + 2.4 - ph * 2.3, s.userData.z * (1 - ph * .6)); s.material.opacity = .9 * Math.sin(ph * Math.PI); }); };
  g.userData.huecos = huecos; return g; }
Object.assign(OBJETOS, {
  cacaotero: p => cacaotero(p), mazorcaCacao: p => { const m = mazorcaCacao(p); m.rotation.z = .25; const g = new THREE.Group(); g.add(m); g.userData.tick = t => { m.rotation.z = .25 + Math.sin(t * 1.4) * .08; }; return g; },
  mazorcasCacao: () => { const g = new THREE.Group(); ['#e0a21b', '#9e2f3c', '#7fae3a'].forEach((c, i) => { const m = mazorcaCacao({ color: c }); m.scale.setScalar(.72); m.position.set((i - 1) * 1.3, i === 1 ? .15 : 0, i === 1 ? .3 : 0); m.rotation.z = (i - 1) * -.35; g.add(m); }); g.userData.tick = t => g.children.forEach((m, i) => m.position.y = (i === 1 ? .15 : 0) + Math.sin(t * 2 + i) * .07); return g; },
  cacaoAbierto: p => cacaoAbierto(p), florCacao: p => florCacao(p), semillasCacao: () => semillasCacao(), chocolate: () => chocolate(),
  mazorcaMaiz: p => { const m = mazorcaMaiz(p); m.scale.setScalar(p.escalaMaiz || .95); m.rotation.z = p.ladeoMaiz ?? .18; return m; }, maizPelos: p => { const m = mazorcaMaiz({ ...p, polen: true }); m.scale.setScalar(.9); m.position.y = -.4; const g = new THREE.Group(); g.add(m); g.userData.tick = t => m.userData.tick(t); return g; },
  maizHuecos: p => { const m = mazorcaMaiz({ ...p, huecos: true, abrir: true }); m.scale.setScalar(p.escalaMaiz || .95); m.rotation.z = p.ladeoMaiz ?? .18; return m; },
});
// PARACAÍDAS (cierre de promo): caja que baja en paracaídas sobre un barrio al atardecer y aterriza en la X
// p = {aroma, ciudad:'TU CIUDAD', sticker, stickerY, stickerT, titulo, colorTela}
def('paracaidas', (p) => {
  const E = estudio({ fogNear: 26, fogFar: 60, bg: '#2a2148' }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0; E.halo.visible = false;
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.MeshBasicMaterial({ map: canvasTex(64, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2148'); gr.addColorStop(.45, '#7a4f8f'); gr.addColorStop(.75, '#ff9f7a'); gr.addColorStop(1, '#ffd29a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), fog: false }));
  cielo.position.set(0, 9, -18); sc.add(cielo); const sol = glow('#ffd27a', 9, .7); sol.position.set(4, 3.5, -17); sc.add(sol);
  const nubes = []; for (let i = 0; i < 6; i++) { const n = new THREE.Group(); const nm = new THREE.MeshStandardMaterial({ color: col('#fff3ea'), roughness: 1, emissive: col('#ffb8a0'), emissiveIntensity: .25 }); [[0, 0, .7], [.7, .1, .55], [-.7, .05, .6], [.3, .45, .5]].forEach(([x, y, r]) => n.add(mesh(new THREE.SphereGeometry(r, 14, 10), nm, x, y, 0))); n.position.set(-9 + i * 3.6, 6 + (i % 3) * 1.6, -8 - (i % 2) * 3); n.scale.setScalar(.9 + (i % 3) * .3); sc.add(n); nubes.push(n); }
  const pasto = mesh(new THREE.CircleGeometry(22, 48), M.std('#5f9a4a', .95), 0, .005, 0); pasto.rotation.x = -Math.PI / 2; sc.add(pasto);
  const casas = [[-5, -5, '#e9c8a0', '#b5523b'], [-1.6, -6.5, '#cfe0f0', '#3d5a80'], [2.4, -6, '#f2d3e0', '#8f3d5e'], [5.6, -4.6, '#e3efd2', '#b5523b'], [-6.4, -1.4, '#f5e6b8', '#7a4a2c']].map(([x, z, pa, te]) => { const c = casa({ pared: pa, techo: te }); c.position.set(x, 0, z); c.scale.setScalar(.62); c.rotation.y = -x * .05; sc.add(c); return c; });
  for (let i = 0; i < 7; i++) { const a = new THREE.Group(); a.add(mesh(new THREE.CylinderGeometry(.08, .12, 1, 8), M.std('#6b4a32', .8), 0, .5, 0)); a.add(mesh(new THREE.SphereGeometry(.6, 12, 10), M.std(['#3f8f46', '#2e7a3e', '#5fae4f'][i % 3], .8), 0, 1.3, 0)); a.position.set(-7 + i * 2.3, 0, -3 - (i % 2) * 1.5); if (Math.abs(a.position.x) < 1.6) a.position.x += 3; sc.add(a); }
  const diana = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c, w) => { [1, .72, .44, .18].forEach((r, i) => { c.fillStyle = i % 2 ? '#ffffff' : '#e63946'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 * r, 0, 7); c.fill(); }); }), transparent: true })); diana.rotation.x = -Math.PI / 2; diana.position.set(.6, .02, 1.2); sc.add(diana);
  const letrero = new THREE.Group(); letrero.position.set(-.75, 0, 2.5); sc.add(letrero); letrero.add(mesh(new THREE.CylinderGeometry(.05, .05, 1.3, 8), M.std('#5a3a20', .8), 0, .65, -.04)); const tabla = cartel([{ t: '📍 ' + (p.ciudad || 'TU CIUDAD'), size: 58, color: '#1b1b1b', peso: 900 }], { w: 512, h: 160, ancho: 1.4, fondo: '#f2c14e', radio: 24 }); tabla.position.set(0, 1.5, .03); letrero.add(tabla); letrero.rotation.y = .35;
  const bajada = new THREE.Group(); sc.add(bajada); const cj = cajaEnvio({}); cj.scale.setScalar(.55); cj.userData.abrir(0); if (cj.userData.cinta) cj.userData.cinta.scale.x = 1; if (cj.userData.cinta2) cj.userData.cinta2.scale.y = 1; cj.rotation.y = -.35; bajada.add(cj);
  const tela = canvasTex(512, 128, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : (p.colorTela || PAL.acento); c.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
  const domo = new THREE.Group(); domo.position.y = 3.2; bajada.add(domo); const cup = mesh(new THREE.SphereGeometry(1.7, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ map: tela, roughness: .7, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .4 })); cup.scale.y = .7; domo.add(cup);
  const cuerdasG = new THREE.BufferGeometry(); const cuerdasP = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cuerdasP.push(Math.cos(a) * 1.62, 3.2 + .32, Math.sin(a) * 1.62, Math.cos(a) * .4, .85, Math.sin(a) * .35); } cuerdasG.setAttribute('position', new THREE.Float32BufferAttribute(cuerdasP, 3)); const cuerdas = new THREE.LineSegments(cuerdasG, new THREE.LineBasicMaterial({ color: col('#f4efe6') })); bajada.add(cuerdas);
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.4); sc.add(fr); fr.visible = false; const polvo = []; for (let i = 0; i < 10; i++) { const s = glow('#f5e1c0', .6, 0); sc.add(s); polvo.push(s); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1360, cls: 'grande', rot: -5 }) : null; const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); nubes.forEach((n, i) => n.position.x += .004 * (1 + i % 2)); const tl = d * .5, kB = win(t, d * .04, tl);
    camara(cam, t, 0, d * .55, [0, 7.4, 14], [.6, 3.0, 11.5], [.3, 6.2, 0], [.4, 1.2, .6]); if (t > d * .55) cam.position.z -= (t - d * .55) * .25;
    const y = lerp(10.5, 0, 1 - Math.pow(1 - kB, 1.6)); const swing = Math.sin(t * 2.6) * .22 * (1 - kB); bajada.position.set(diana.position.x + Math.sin(t * 1.3) * .8 * (1 - kB), y, diana.position.z); bajada.rotation.z = swing;
    const kL = win(t, tl, tl + .5); if (kL > 0) { bajada.rotation.z = 0; cj.position.y = Math.abs(Math.sin(kL * Math.PI * 2)) * .3 * (1 - kL); if (kL < .25) cam.position.y += Math.sin(t * 90) * .05; }
    const kD = ease(win(t, tl + .05, tl + .9)); domo.scale.set(1 + .25 * kD, 1 - .95 * kD, 1 + .15 * kD); domo.position.set(2.3 * kD, 3.2 - 3.1 * kD, -.5 * kD); domo.rotation.z = -.5 * Math.sin(kD * Math.PI); cuerdas.visible = kD < .15;
    polvo.forEach((s, i) => { const k = win(t, tl, tl + .9); const a = i / 10 * Math.PI * 2; s.position.set(bajada.position.x + Math.cos(a) * (.4 + 1.4 * k), .2 + .3 * k, bajada.position.z + Math.sin(a) * (.4 + 1.2 * k)); s.material.opacity = k > 0 && k < 1 ? .6 * (1 - k) : 0; });
    const kA = ease(win(t, d * .62, d * .74)); cj.userData.abrir(kA); if (cj.userData.cinta && kA > 0) cj.userData.cinta.scale.x = 1 - kA; const kF = win(t, d * .68, d * .82); fr.visible = kF > 0; cj.updateMatrixWorld(true); const v = new THREE.Vector3(); cj.getWorldPosition(v); fr.position.set(v.x, v.y + lerp(.1, .85, back(kF)), v.z); fr.rotation.y = -.25; animFrasco(fr, t, { expr: 'feliz', saluda: kF >= 1, hablar: .2 });
    if (st) st.set(win(t, p.stickerT ?? d * .76, (p.stickerT ?? d * .76) + .3)); if (tit) { const k = win(t, .1, .4); tit.style.opacity = k; } } };
});
SFX.paracaidas = (st, d, p) => [{ t: st + .15, tipo: 'whoosh' }, { t: st + d * .5, tipo: 'golpe' }, { t: st + d * .55, tipo: 'whoosh' }, { t: st + d * .7, tipo: 'pop' }, ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .76), tipo: 'golpe' }] : [])];
Object.assign(API, { mazorcaCacao, cacaoAbierto, cacaotero, florCacao, semillasCacao, chocolate, mazorcaMaiz, texCorteza }); // (2026-11-24)

// ===================== 2026-11-25: CEBOLLA, PAPA, persona 'llorar' y plantilla NAVIDAD =====================
// --- cebolla: bulbo con cáscara de vetas, raicitas y cuello; corte que muestra los anillos (= hojas) y suelta gas ---
const PERFIL_CEB = [[.02, -.95], [.42, -.86], [.78, -.62], [.97, -.27], [1.0, .05], [.9, .4], [.66, .7], [.36, .95], [.15, 1.12], [.08, 1.3], [.02, 1.36]].map(([x, y]) => new THREE.Vector2(x, y));
function texCebolla(c1, c2) { return canvasTex(512, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, c1); gr.addColorStop(.5, c2); gr.addColorStop(1, c1); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { c.strokeStyle = i % 3 ? 'rgba(70,25,10,.28)' : 'rgba(255,240,210,.35)'; c.lineWidth = 1.5 + (i % 4); const x = i / 46 * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 10, h * .3, x - 10, h * .7, x + 4, h); c.stroke(); } }); }
const CEB = { cabezona: ['#b8743c', '#e3a868', '#ead9b8', '#d9c08f'], morada: ['#6e2246', '#a8456b', '#ecd3e2', '#c27fa6'] };
function raicesCeb(g) { const m = M.std('#e9dcc0', .8); for (let i = 0; i < 12; i++) { const a = i * 2.4, r = .1 + (i % 3) * .05; const pts = [new THREE.Vector3(Math.cos(a) * r, -.9, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * (r + .15), -1.15, Math.sin(a) * (r + .15)), new THREE.Vector3(Math.cos(a) * (r + .1), -1.38 - (i % 4) * .05, Math.sin(a) * (r + .25))]; g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .015, 4), m)); } }
export function cebolla(o = {}) { const cs = (CEB[o.tipo] || CEB.cabezona); const g = new THREE.Group();
  const piel = new THREE.MeshPhysicalMaterial({ map: texCebolla(cs[0], cs[1]), roughness: .55, clearcoat: .4, clearcoatRoughness: .5, envMap: ENV, envMapIntensity: .8 });
  g.add(mesh(new THREE.LatheGeometry(PERFIL_CEB, 48), piel)); raicesCeb(g);
  const cu = mesh(new THREE.ConeGeometry(.09, .45, 8), M.std(cs[0], .8), .04, 1.52, 0); cu.rotation.z = -.25; g.add(cu); return g; }
function anillosTex(cs) { return canvasTex(512, 640, (c, w, h) => { c.clearRect(0, 0, w, h); const X = x => w / 2 + x * w * .48, Y = y => h * .86 - (y + .95) * h * .37 / 1.0;
  for (let k = 0; k < 9; k++) { const s = 1 - k * .105; c.beginPath(); PERFIL_CEB.forEach((v, i) => { const x = v.x * s, y = -.72 + (v.y + .72) * s; i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); }); for (let i = PERFIL_CEB.length - 1; i >= 0; i--) { const v = PERFIL_CEB[i]; c.lineTo(X(-v.x * s), Y(-.72 + (v.y + .72) * s)); } c.closePath();
    c.fillStyle = k === 0 ? cs[0] : (k % 2 ? cs[2] : cs[3]); c.fill(); c.strokeStyle = 'rgba(160,120,90,.45)'; c.lineWidth = 3; c.stroke(); }
  c.fillStyle = '#d8c89a'; c.beginPath(); c.ellipse(w / 2, Y(-.8), 60, 18, 0, 0, 7); c.fill(); }); }
export function cebollaCorte(o = {}) { const cs = (CEB[o.tipo] || CEB.cabezona); const g = new THREE.Group();
  const piel = new THREE.MeshPhysicalMaterial({ map: texCebolla(cs[0], cs[1]), roughness: .55, clearcoat: .4, envMap: ENV, envMapIntensity: .8, side: THREE.DoubleSide });
  g.add(mesh(new THREE.LatheGeometry(PERFIL_CEB, 32, Math.PI / 2, Math.PI), piel)); raicesCeb(g);
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(1 / .48, 1 / .37), new THREE.MeshStandardMaterial({ map: anillosTex(cs), transparent: true, roughness: .75, envMap: ENV, envMapIntensity: .25, side: THREE.DoubleSide })); cara.position.set(0, .023, .005); g.add(cara);
  const gas = []; if (o.gas !== false) for (let i = 0; i < 22; i++) { const s = glow(i % 3 ? '#e9f7a6' : '#fff3b0', .35 + (i % 4) * .12, 0); s.userData = { f: i / 22, x: Math.sin(i * 2.7) * .6, v: .5 + (i % 5) * .12 }; g.add(s); gas.push(s); }
  const brillo = glow('#ffffff', 1.2, .0); brillo.position.set(.3, .2, .2); g.add(brillo);
  g.userData.tick = t => { gas.forEach(s => { const ph = (t * s.userData.v * .45 + s.userData.f) % 1; s.position.set(s.userData.x * (1 - ph * .5) + Math.sin(t * 2.3 + s.userData.f * 20) * .25 * ph, .2 + ph * 3.0, .25 + ph * .6); s.material.opacity = .75 * Math.sin(ph * Math.PI) * clamp(t * 2); }); brillo.material.opacity = .25 + .15 * Math.sin(t * 6); }; return g; }
// capas = hojas: la cebolla se "desarma" en 4 conchas que se separan
export function cebollaCapas(o = {}) { const cs = (CEB[o.tipo] || CEB.cabezona); const g = new THREE.Group(); const capas = [];
  for (let k = 0; k < 4; k++) { const s = 1 - k * .2; const prof = PERFIL_CEB.map(v => new THREE.Vector2(v.x * s, -.72 + (v.y + .72) * s));
    const mat = k === 0 ? new THREE.MeshPhysicalMaterial({ map: texCebolla(cs[0], cs[1]), roughness: .55, clearcoat: .4, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .8 }) : new THREE.MeshPhysicalMaterial({ color: col(k % 2 ? cs[2] : cs[3]), roughness: .3, clearcoat: .8, side: THREE.DoubleSide, envMap: ENV, envMapIntensity: .9, transparent: true, opacity: .97 });
    const m = mesh(new THREE.LatheGeometry(prof, 32, Math.PI / 2 + .25, Math.PI - .5), mat); const piv = new THREE.Group(); piv.add(m); g.add(piv); capas.push(piv); }
  g.userData.tick = t => { const k = ease(clamp((t - (o.abre ?? .4)) / 1.2)); capas.forEach((c, i) => { c.position.set((i - 1.5) * 1.05 * k, Math.sin(t * 2 + i) * .05 * k, -i * .05); c.rotation.y = (i - 1.5) * .25 * k; }); }; return g; }
// cebolla fría (de la nevera): tono azulado, escarcha y copitos que giran
function cebollaFria(o = {}) { const g = new THREE.Group(); const c = cebolla(o); g.add(c); c.traverse(m => { if (m.material && m.material.color) { m.material = m.material.clone(); m.material.color.lerp(col('#bfe3ff'), .35); } });
  const esc = []; for (let i = 0; i < 14; i++) { const s = glow(i % 2 ? '#dff3ff' : '#ffffff', .22 + (i % 3) * .1, .85); s.userData.a = i / 14 * Math.PI * 2; g.add(s); esc.push(s); } const halo = glow('#7fd1ff', 3.6, .35); g.add(halo);
  g.userData.tick = t => esc.forEach((s, i) => { const a = s.userData.a + t * .8; s.position.set(Math.cos(a) * 1.35, Math.sin(a * 2 + i) * .6 + .1, Math.sin(a) * 1.0); }); return g; }
// cuchillo de cocina con brillo que recorre el filo
export function cuchillo() { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(2.3, 0); sh.quadraticCurveTo(2.15, .45, 1.6, .55); sh.lineTo(0, .55); sh.closePath();
  const hoja_ = mesh(new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: true, bevelSize: .015, bevelThickness: .02, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: col('#dfe6ee'), metalness: 1, roughness: .18, envMap: ENV, envMapIntensity: 1.6 })); hoja_.position.set(-.6, -.27, -.015); g.add(hoja_);
  const mango = mesh(rbox(1.25, .42, .2, .1), M.std('#5a3520', .5), -1.25, 0, 0); g.add(mango); [-1.55, -1.0].forEach(x => g.add(mesh(new THREE.CylinderGeometry(.04, .04, .22, 10), M.oro(), x, 0, 0).rotateX(Math.PI / 2)));
  const brillo = glow('#ffffff', .42, .9); g.add(brillo); g.userData.tick = t => { const k = (t * .7) % 1; brillo.position.set(-.55 + 2.7 * k, -.25 + .05 * Math.sin(k * 3), .06); brillo.material.opacity = .9 * Math.sin(k * Math.PI); }; g.rotation.z = .15; return g; }
// ojo gigante: el gas entra, el ojo se entrecierra y aparece una lágrima que rueda
export function ojoLagrima(o = {}) { const g = new THREE.Group(); const escl = mesh(new THREE.SphereGeometry(1, 40, 30), new THREE.MeshPhysicalMaterial({ color: col('#fbf7f4'), roughness: .15, clearcoat: 1, envMap: ENV, envMapIntensity: 1 })); g.add(escl);
  const iris = mesh(new THREE.CircleGeometry(.48, 40), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w) => { const r = c.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2); r.addColorStop(0, '#2b170c'); r.addColorStop(.35, '#6b3b1c'); r.addColorStop(.8, '#8a5a2c'); r.addColorStop(1, '#3a210f'); c.fillStyle = r; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,220,160,.25)'; for (let i = 0; i < 60; i++) { const a = i / 60 * 7; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 40, w / 2 + Math.sin(a) * 40); c.lineTo(w / 2 + Math.cos(a) * 120, w / 2 + Math.sin(a) * 120); c.stroke(); } c.fillStyle = '#0b0b0e'; c.beginPath(); c.arc(w / 2, w / 2, 38, 0, 7); c.fill(); }), roughness: .3 }));
  iris.position.z = 1.0; iris.scale.setScalar(1); g.add(iris); const bri = mesh(new THREE.CircleGeometry(.09, 16), M.neon('#ffffff'), .16, .18, 1.02); g.add(bri);
  const pielM = M.piel(o.piel || '#d9a07a'); const parpS = new THREE.Group(), parpI = new THREE.Group(); g.add(parpS); g.add(parpI);
  parpS.add(mesh(new THREE.SphereGeometry(1.06, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), pielM)); parpI.add(mesh(new THREE.SphereGeometry(1.05, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pielM));
  const pest = M.std('#1b1410', .6); for (let i = 0; i < 9; i++) { const a = -.9 + i * .225; const p_ = mesh(new THREE.CylinderGeometry(.012, .02, .32, 5), pest, Math.sin(a) * 1.02, .0, Math.cos(a) * 1.02); p_.rotation.x = 1.1; p_.rotation.z = -a * .6; parpS.add(p_); }
  const lag = gota('#9fdcff', .14); g.add(lag); const lag2 = gota('#9fdcff', .1); g.add(lag2); const gas = []; for (let i = 0; i < 10; i++) { const s = glow('#e9f7a6', .45, 0); s.userData.f = i / 10; g.add(s); gas.push(s); }
  const rojo = new THREE.Color('#ffd0cc');
  g.userData.tick = t => { const k = clamp((t - .4) / 1.2); const ab = .55 - .4 * ease(k) + .05 * Math.sin(t * 9) * k; parpS.rotation.x = -ab - .05; parpI.rotation.x = ab * .7; escl.material.color.set('#fbf7f4').lerp(rojo, k * .8);
    gas.forEach(s => { const ph = (t * .5 + s.userData.f) % 1; s.position.set(-1.8 + ph * 1.6, -1.6 + ph * 1.4, 1.2); s.material.opacity = .6 * Math.sin(ph * Math.PI) * (1 - k * .5); });
    [lag, lag2].forEach((l, i) => { const ph = clamp(((t - .9 - i * .7) % 1.6) / 1.6); const vis = t > .9 + i * .7; l.visible = vis; const x = i ? -.55 : .45; l.position.set(x, -.75 - ph * 1.3, .95 - ph * .3); l.scale.setScalar(.5 + .7 * clamp(ph * 3)); }); }; return g; }
// --- persona que llora (cortando cebolla): ojos apretados, cejas tristes, se frota los ojos y le caen lágrimas ---
function llorarPersona(u, t, k) { u.ojos.forEach(e => e.scale.set(1.2, .18, .5)); u.cejas[0].rotation.z = -.35; u.cejas[1].rotation.z = .35; u.cejas.forEach(c => c.position.y = .3); u.boca.scale.set(1.0, .55 + Math.abs(Math.sin(t * 7)) * .3, .5);
  const [L, Rr] = u.brazos; const fr = Math.sin(t * 8) * .1; L.piv.rotation.set(-1.05 * k, 0, -.38 * k); L.codo.rotation.set(-2.45 * k + fr, 0, 0); Rr.piv.rotation.set(-1.05 * k, 0, .38 * k); Rr.codo.rotation.set(-2.45 * k - fr, 0, 0); u.cab.rotation.x = .18; u.cuerpo.position.y += Math.sin(t * 10) * .015;
  if (!u.lagr) { u.lagr = [-1, 1, -1, 1].map((s, i) => { const l = gota('#9fdcff', .07); l.userData = { s, f: i * .37 }; u.cab.add(l); return l; }); }
  u.lagr.forEach(l => { const ph = (t * .9 + l.userData.f) % 1; l.visible = true; l.position.set(l.userData.s * (.24 + ph * .05), .0 - ph * .75, .52 - ph * .1); l.scale.setScalar(.6 + ph * .6); }); }
// --- papa: tubérculo = TALLO que se hincha bajo tierra; ojos = yemas ---
function texPapa(c1, c2) { return canvasTex(512, 256, (c, w, h) => { c.fillStyle = c1; c.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { c.fillStyle = i % 3 ? c2 : 'rgba(60,30,10,.25)'; c.globalAlpha = .35 + (i % 5) * .1; c.beginPath(); c.arc((i * 137) % w, (i * 71 + (i * i) % 37) % h, 1 + (i % 3), 0, 7); c.fill(); } c.globalAlpha = 1; }); }
const PAPAS = { pastusa: ['#c99a62', '#a8794a'], morada: ['#4a2147', '#6e3466'], roja: ['#a23b35', '#c25a4a'], criolla: ['#e2b23c', '#c9962a'] };
export function papa(o = {}) { const cs = (PAPAS[o.tipo] || PAPAS.pastusa); const g = new THREE.Group(); const geo = new THREE.SphereGeometry(1, 48, 32); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const n = 1 + .06 * Math.sin(x * 4.1 + y * 2.3) + .05 * Math.sin(z * 5.3 - x * 1.7) + .03 * Math.sin(y * 7 + z * 3); pos.setXYZ(i, x * n, y * n, z * n); } geo.computeVertexNormals();
  const m = mesh(geo, new THREE.MeshPhysicalMaterial({ map: texPapa(cs[0], cs[1]), roughness: .75, clearcoat: .15, envMap: ENV, envMapIntensity: .6 })); const esc = o.tipo === 'criolla' ? [.8, .74, .76] : [1.3, .82, .9]; m.scale.set(...esc); g.add(m);
  const ojosP = []; [[.9, .3, .4], [-.7, .2, .6], [.2, .55, .7], [-.3, -.3, .85], [.6, -.35, .6], [-1.0, -.1, .3], [.1, .1, .95]].forEach(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).normalize(); const p_ = new THREE.Vector3(v.x * esc[0], v.y * esc[1], v.z * esc[2]); const e = mesh(new THREE.SphereGeometry(.07, 10, 8), M.std('#5a3a1e', .8), p_.x * .99, p_.y * .99, p_.z * .99); e.scale.set(1.6, .7, .5); e.lookAt(p_.clone().multiplyScalar(2)); g.add(e); ojosP.push(p_); });
  g.userData.ojos = ojosP; return g; }
export function papaBrote(o = {}) { const g = papa(o); const brotes = []; g.userData.ojos.slice(0, 5).forEach((p_, i) => { const dir = p_.clone().normalize(); const largo = .45 + (i % 3) * .2; const pts = [p_.clone(), p_.clone().add(dir.clone().multiplyScalar(largo * .5)).add(new THREE.Vector3(0, .12, 0)), p_.clone().add(dir.clone().multiplyScalar(largo)).add(new THREE.Vector3(.05, .3, 0))];
    const b = new THREE.Group(); const tubo = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .045, 6), M.std(i % 2 ? '#e9d7f0' : '#d9c1e6', .6)); b.add(tubo); const punta = mesh(new THREE.SphereGeometry(.08, 10, 8), M.std('#9bbf5a', .6)); punta.position.copy(pts[2]); b.add(punta); const h = hoja('#7fb34a', .28); h.position.copy(pts[2]).add(new THREE.Vector3(.08, .06, 0)); h.rotation.z = -.7; b.add(h);
    b.userData.p = p_.clone(); g.add(b); brotes.push(b); });
  g.userData.tick = t => brotes.forEach((b, i) => { const k = back(clamp((t - .3 - i * .18) / .9)); b.scale.setScalar(Math.max(.001, k)); b.position.copy(b.userData.p.clone().multiplyScalar(1 - k)); }); return g; }
function papasColores() { const g = new THREE.Group(); [['morada', -1.25, 0], ['roja', 1.25, 0], ['criolla', 0, .55]].forEach(([tipo, x, z], i) => { const p_ = papa({ tipo }); p_.scale.setScalar(tipo === 'criolla' ? .85 : .75); p_.position.set(x, i === 2 ? -.15 : .1, z); p_.rotation.set(.2, i * 1.3, (i - 1) * .25); g.add(p_); });
  g.userData.tick = t => g.children.forEach((c, i) => { c.position.y = (i === 2 ? -.15 : .1) + Math.sin(t * 2 + i * 1.7) * .08; }); return g; }
// mata de papa en CORTE: arriba hojas y flores; abajo tierra en corte con raíces finas y ESTOLONES con papas en la punta
export function mataPapa(o = {}) { const g = new THREE.Group();
  const tierraTex = canvasTex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6b4528'); gr.addColorStop(1, '#3e2716'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { c.fillStyle = ['#8a6040', '#2e1d10', '#a07a55', '#4d3220'][i % 4]; c.globalAlpha = .5; c.beginPath(); c.ellipse((i * 97) % w, (i * 53 + i % 17) % h, 2 + i % 5, 1.5 + i % 3, i, 0, 7); c.fill(); } c.globalAlpha = 1; });
  const tierra = mesh(rbox(5.4, 2.3, 1.4, .08), new THREE.MeshStandardMaterial({ map: tierraTex, roughness: .95, envMap: ENV, envMapIntensity: .3 }), 0, -1.15, -.55); g.add(tierra);
  const pasto = mesh(rbox(5.5, .12, 1.5, .05), M.std('#5f9a3a', .9), 0, .02, -.55); g.add(pasto);
  const tallo = M.std('#4f8a35', .6); const ramas = []; [[-.25, .1, 2.0], [.2, -.15, 1.8], [0, .25, 2.3]].forEach(([inc, giro, alto], i) => { const piv = new THREE.Group(); piv.rotation.set(0, giro, inc); g.add(piv); piv.add(mesh(new THREE.CylinderGeometry(.05, .08, alto, 8), tallo, 0, alto / 2, 0));
    for (let k = 0; k < 4; k++) { const fol = new THREE.Group(); fol.position.y = .6 + k * .4; fol.rotation.y = k * 2.1 + i; for (let j = 0; j < 5; j++) { const h = hoja(['#3f8a3a', '#4e9a40', '#5aa846'][j % 3], j === 4 ? .5 : .38); h.position.set(.18 + j * .14, j * .03, 0); h.rotation.set(-.3, 0, -1.3 + j * .12); fol.add(h); } piv.add(fol); }
    const fl = new THREE.Group(); fl.position.y = alto + .1; for (let j = 0; j < 3; j++) { const f = new THREE.Group(); for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2; const pe = mesh(new THREE.CircleGeometry(.12, 3), M.std(i === 1 ? '#f4f0ff' : '#c9a6f0', .5), Math.cos(a) * .1, Math.sin(a) * .1, 0); pe.rotation.z = a; f.add(pe); } f.add(mesh(new THREE.ConeGeometry(.05, .12, 6), M.std('#f2c230', .5), 0, 0, .04).rotateX(Math.PI / 2)); f.position.set((j - 1) * .22, Math.sin(j) * .1, .1); f.rotation.x = -.3; fl.add(f); } piv.add(fl); ramas.push(piv); });
  const raizM = M.std('#c9b089', .8); for (let i = 0; i < 9; i++) { const a = (i - 4) * .3; const pts = [new THREE.Vector3(0, -.05, .1), new THREE.Vector3(Math.sin(a) * .4, -.6, .15), new THREE.Vector3(Math.sin(a) * .7, -1.3 - (i % 3) * .2, .12)]; g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .018, 4), raizM)); }
  const estM = M.std('#efe6d2', .6); const papasT = []; [[-1, -1.3, -.6], [1, -1.0, -.4], [-1, -.75, -1.6], [1, -1.55, -1.5], [.3, -1.75, .2]].forEach(([s, y, ext], i) => { const xf = s * (1.0 + Math.abs(ext) * .6); const pts = [new THREE.Vector3(0, -.2, .15), new THREE.Vector3(xf * .45, y * .6, .2), new THREE.Vector3(xf, y, .2)]; g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, .035, 6), estM));
    const p_ = papa({ tipo: o.tipoPapa || (i === 4 ? 'criolla' : 'pastusa') }); p_.position.set(xf, y, .25); p_.rotation.set(i, i * 1.7, i * .5); g.add(p_); papasT.push(p_); });
  g.userData.tick = t => { ramas.forEach((r, i) => r.rotation.x = Math.sin(t * 1.4 + i) * .05); papasT.forEach((p_, i) => p_.scale.setScalar(.28 * (o.crece === false ? 1 : clamp(.35 + back(clamp((t - .3 - i * .15) / 1.0)) * .65)))); }; return g; }
Object.assign(OBJETOS, {
  cebolla: p => { const c = cebolla(p); c.rotation.z = .12; return c; }, cebollaMorada: p => { const c = cebolla({ ...p, tipo: 'morada' }); c.rotation.z = .12; return c; },
  cebollaCorte: p => { const c = cebollaCorte(p); return c; }, cebollaCapas: p => cebollaCapas(p), cebollaFria: p => cebollaFria(p), cuchillo: () => cuchillo(), ojoLagrima: p => ojoLagrima(p),
  tablaCebolla: p => { const g = new THREE.Group(); const tabla = mesh(rbox(3.6, .2, 2.2, .08), M.std('#b98a55', .6), 0, -1.05, 0); g.add(tabla); const c = cebollaCorte(p); c.scale.setScalar(.8); c.position.set(-.5, -.2, 0); g.add(c); const cu = cuchillo(); cu.scale.setScalar(.75); cu.position.set(1.0, -.75, .5); cu.rotation.set(-1.4, .3, 0); g.add(cu); g.userData.tick = t => { c.userData.tick(t); cu.userData.tick(t); }; return g; },
  papa: p => papa(p), papaMorada: p => papa({ ...p, tipo: 'morada' }), papaCriolla: p => papa({ ...p, tipo: 'criolla' }), papaBrote: p => papaBrote(p), papasColores: () => papasColores(), mataPapa: p => mataPapa(p),
});
// --- NAVIDAD (cierre de promo, 2026-11-25): sala de noche con árbol de Navidad 3D, luces que titilan en secuencia,
// estrella que se enciende, el regalo cae bajo el árbol, se abre y sale el frasco saludando entre chispas.
// p = {aroma, color (papel del regalo), cinta, sticker, stickerY, stickerT, titulo, colorPared}
export function arbolNavidad(o = {}) { const g = new THREE.Group(); const verdes = ['#1d5e35', '#237043', '#2b8050', '#1f6a3c'];
  g.add(mesh(new THREE.CylinderGeometry(.6, .5, .7, 20), M.std('#b3262e', .45), 0, .35, 0)); g.add(mesh(new THREE.CylinderGeometry(.16, .2, .6, 10), M.std('#5a3a22', .8), 0, .85, 0));
  const pisos = [[1.45, 1.5, 1.05], [1.15, 1.35, 1.85], [.85, 1.15, 2.6], [.52, .95, 3.25]]; pisos.forEach(([r, h, y], i) => { const geo = new THREE.ConeGeometry(r, h, 28, 3); const pos = geo.attributes.position; for (let j = 0; j < pos.count; j++) { const yy = pos.getY(j); if (yy < -h / 2 + .01) { const a = Math.atan2(pos.getZ(j), pos.getX(j)); const f = 1 + .08 * Math.sin(a * 9); pos.setX(j, pos.getX(j) * f); pos.setZ(j, pos.getZ(j) * f); } } geo.computeVertexNormals(); const c = mesh(geo, M.std(verdes[i], .75), 0, y + h / 2 - .1, 0); c.rotation.y = i * .7; g.add(c); });
  const luces = []; const cols = ['#ffd36e', '#ff5a5a', '#7fd1ff', '#9be15d', '#ff9ad5']; for (let i = 0; i < 46; i++) { const k = i / 46; const y = 1.05 + k * 2.95; const r = 1.42 * (1 - k * .82) + .04; const a = k * Math.PI * 2 * 4.2; const c = cols[i % 5];
    const b = mesh(new THREE.SphereGeometry(.065, 10, 8), new THREE.MeshBasicMaterial({ color: col(c) }), Math.cos(a) * r, y, Math.sin(a) * r); const gl = glow(c, .5, .7); b.add(gl); g.add(b); luces.push({ b, gl, c, i }); }
  const bolas = []; const bc = ['#d4202f', '#e8b84a', '#f2f2f2', '#c0392b', '#e8b84a']; for (let i = 0; i < 16; i++) { const k = (i * .37) % 1; const y = 1.1 + k * 2.4; const r = 1.4 * (1 - k * .8) + .05; const a = i * 2.39; const m = new THREE.MeshPhysicalMaterial({ color: col(bc[i % 5]), metalness: .6, roughness: .12, clearcoat: 1, envMap: ENV, envMapIntensity: 1.5 }); const s = mesh(new THREE.SphereGeometry(.13, 16, 12), m, Math.cos(a) * r, y - .1, Math.sin(a) * r); g.add(s); bolas.push(s); }
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? .17 : .42; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath();
  const estrella = mesh(new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: col('#f7c948'), metalness: .8, roughness: .25, emissive: col('#ffb000'), emissiveIntensity: .2, envMap: ENV, envMapIntensity: 1.4 })); estrella.position.set(0, 4.42, -.05); g.add(estrella); const halo = glow('#ffe08a', 2.6, 0); halo.position.set(0, 4.45, .1); g.add(halo);
  g.userData = { luces, estrella, halo, tick(t, kE = 1) { luces.forEach(l => { const on = .35 + .65 * Math.max(0, Math.sin(t * 5 - l.i * .55)); l.gl.material.opacity = .85 * on; l.b.material.color.set(l.c).multiplyScalar(.5 + .5 * on); }); estrella.rotation.y = Math.sin(t * 1.5) * .35; estrella.material.emissiveIntensity = .2 + 1.4 * kE; halo.material.opacity = .75 * kE * (.85 + .15 * Math.sin(t * 7)); halo.scale.setScalar(2.6 * (1 + .6 * (1 - kE))); } };
  return g; }
def('navidad', (p) => {
  const E = estudio({ fogNear: 22, fogFar: 46, bg: '#130c16', halo: '#ffb36b' }); const sc = E.sc, cam = E.cam; const cp = capa(); cam.userData.off = 0;
  const pared = mesh(new THREE.PlaneGeometry(26, 14), M.std(p.colorPared || '#3a2230', .95), 0, 7, -4.2); sc.add(pared);
  const ven = new THREE.Group(); ven.position.set(2.6, 3.6, -4.15); sc.add(ven); ven.add(mesh(new THREE.PlaneGeometry(2.6, 2.8), new THREE.MeshBasicMaterial({ map: canvasTex(256, 280, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2b2a5a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = i % 4 ? 'rgba(255,255,255,.8)' : '#ffd36e'; c.fillRect((i * 67) % w, (i * 29) % (h * .6), 2, 2); } c.fillStyle = '#141433'; for (let i = 0; i < 7; i++) c.fillRect(i * 38, h - 60 - (i % 3) * 30, 34, 90); c.fillStyle = '#ffd36e'; for (let i = 0; i < 18; i++) c.fillRect(6 + (i * 41) % 240, h - 50 + (i % 3) * 12 - (i % 4) * 14, 6, 6); }), fog: false })));
  [[0, 1.45, 2.8, .1], [0, -1.45, 2.8, .1], [-1.35, 0, .1, 3], [1.35, 0, .1, 3], [0, 0, .08, 2.8]].forEach(([x, y, w_, h_]) => ven.add(mesh(new THREE.BoxGeometry(w_, h_, .08), M.std('#f4efe6', .6), x, y, .04)));
  const guir = []; for (let i = 0; i < 26; i++) { const k = i / 25; const x = -6 + k * 12; const y = 6.3 - Math.sin(k * Math.PI) * .9; const c = ['#ffd36e', '#ff5a5a', '#7fd1ff', '#9be15d'][i % 4]; const s = glow(c, .55, .8); s.position.set(x, y, -4.0); sc.add(s); guir.push(s); }
  const tapete = mesh(new THREE.CircleGeometry(3.2, 40), M.std('#7a1f2b', .95), -.4, .01, .4); tapete.rotation.x = -Math.PI / 2; sc.add(tapete);
  const ar = arbolNavidad(); ar.position.set(-.75, 0, -1.1); sc.add(ar);
  [['#2a9d8f', '#f2c14e', -2.0, .3, .45], ['#f2f2f2', '#d4202f', -.2, -.2, .38], ['#7c3aed', '#ffd36e', -1.6, 1.1, .32]].forEach(([c, ci, x, z, s]) => { const cj = caja(c, { cinta: ci }); cj.scale.setScalar(s); cj.position.set(x, 0, z); cj.rotation.y = x * .4; sc.add(cj); });
  const rg = caja(p.color || '#d4202f', { cinta: p.cinta || '#f2c14e' }); rg.scale.setScalar(.62); sc.add(rg);
  const fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.5); sc.add(fr); fr.visible = false;
  const chis = []; for (let i = 0; i < 24; i++) { const s = glow(['#ffd36e', '#ffffff', PAL.acento][i % 3], .28, 0); s.userData = { a: i / 24 * Math.PI * 2, v: .8 + (i % 5) * .25 }; sc.add(s); chis.push(s); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1380, cls: 'grande', rot: -5 }) : null; const tit = p.titulo ? el('div', 'mapaTit', cp, p.titulo) : null;
  const gx = 1.05, gz = .9;
  return { sc, cam, cp, upd(t, d) { E.tick(t); const tC = d * .3;
    camara(cam, t, 0, d * .42, [-.5, 5.6, 10], [.3, 3.0, 11.6], [-.7, 4.2, -1], [.2, 1.5, 0]); cam.position.x += Math.sin(t * .8) * .15;
    const kE = eout(win(t, .25, .75)); ar.userData.tick(t, kE); guir.forEach((s, i) => s.material.opacity = .4 + .45 * Math.max(0, Math.sin(t * 4 + i * .8)));
    const kC = win(t, d * .08, tC); const y = lerp(7, 0, kC * kC); const kR = win(t, tC, tC + .45); rg.position.set(gx, kC < 1 ? y : Math.abs(Math.sin(kR * Math.PI * 2)) * .35 * (1 - kR), gz); rg.rotation.set(Math.sin(t * 6) * .15 * (1 - kC), -.35 + (1 - kC) * 2.2, Math.cos(t * 5) * .1 * (1 - kC));
    if (kR > 0 && kR < .3) cam.position.y += Math.sin(t * 90) * .05;
    const kA = win(t, d * .5, d * .5 + .45); rg.userData.tapa.rotation.x = -2.1 * back(kA); if (kA <= 0) rg.position.x += Math.sin(t * 30) * .015 * win(t, tC + .5, d * .5);
    const kF = win(t, d * .53, d * .53 + .55); fr.visible = kF > 0; fr.position.set(gx, .25 + 1.15 * back(kF), gz + .05); fr.rotation.y = -.3 + Math.sin(t * 2) * .2; animFrasco(fr, t, { expr: 'feliz', saluda: kF >= 1, hablar: .2 });
    const tc = t - d * .53; chis.forEach(s => { const u = s.userData; if (tc < 0) { s.material.opacity = 0; return; } const r = u.v * tc * 1.3; s.position.set(gx + Math.cos(u.a) * r, 1.2 + Math.sin(u.a * 3) * .5 + tc * .9, gz + Math.sin(u.a) * r * .5); s.material.opacity = .9 * clamp(1 - tc / 1.4); });
    if (st) st.set(win(t, p.stickerT ?? d * .7, (p.stickerT ?? d * .7) + .3)); if (tit) tit.style.opacity = win(t, .1, .4); } };
});
SFX.navidad = (st, d, p) => [{ t: st + .3, tipo: 'pop' }, { t: st + .5, tipo: 'pop' }, { t: st + .7, tipo: 'pop' }, { t: st + d * .3, tipo: 'golpe' }, { t: st + d * .5, tipo: 'whoosh' }, { t: st + d * .55, tipo: 'pop' }, ...(p.sticker ? [{ t: st + (p.stickerT ?? d * .7), tipo: 'golpe' }] : [])];
Object.assign(OBJETOS, { arbolNavidad: () => { const a = arbolNavidad(); a.scale.setScalar(.55); a.position.y = -1; const g = new THREE.Group(); g.add(a); g.userData.tick = t => a.userData.tick(t, 1); return g; } });
Object.assign(API, { cebolla, cebollaCorte, cebollaCapas, cuchillo, ojoLagrima, papa, papaBrote, mataPapa, arbolNavidad }); // (2026-11-25)
