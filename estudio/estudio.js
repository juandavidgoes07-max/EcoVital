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
  A.obj.position.set(-1.55, 0, 0); B.obj.position.set(1.55, 0, 0); A.obj.scale.setScalar(.9); B.obj.scale.setScalar(.9); A.obj.rotation.y = .35; B.obj.rotation.y = -.35; sc.add(A.obj); sc.add(B.obj);
  const gA = glow(p.colorA || PAL.acento, 4.5, .35); gA.position.set(-1.9, 1.3, -.8); sc.add(gA); const gB = glow(p.colorB || '#ff5a5a', 4.5, .35); gB.position.set(1.9, 1.3, -.8); sc.add(gB);
  const vs = texto3D('VS', { size: .9, color: '#ffffff' }); vs.position.set(0, 1.3, -1.5); sc.add(vs);
  const eA = etiqueta(cp, p.etA || 'EcoVital', { cls: 'a' }), eB = etiqueta(cp, p.etB || 'Con aluminio', { cls: 'b' });
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.2, 13], [0, 2.0, 11.2], [0, 1.6, 0]); A.anim(t, d); B.anim(t + 1, d);
    vs.rotation.y = Math.sin(t * 2) * .3; vs.scale.setScalar(back(win(t, .1, .5)));
    const [ax, ay] = proyectar(A.obj, cam, [0, 2.6, 0]), [bx, by] = proyectar(B.obj, cam, [0, 2.9, 0]);
    eA.set(Math.max(200, ax - 40), ay - 150, ax, ay, win(t, .3, .6)); eB.set(Math.min(880, bx + 40), by - 150, bx, by, win(t, .5, .8)); } };
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
  const E = estudio({ fogNear: 18, fogFar: 40 }); const sc = E.sc, cam = E.cam; const cp = capa(); escenario(sc, p.escenario || 'baño');
  const pe = persona(p.persona || {}); sc.add(pe); cam.userData.off = .35;
  const extras = [];
  if (p.sudor) for (let i = 0; i < 5; i++) { const g = gota('#7fd1ff', .1); sc.add(g); extras.push({ g, i, tipo: 'sudor' }); }
  if (p.olor) { const n = nubeOlor(); n.scale.setScalar(.6); sc.add(n); extras.push({ g: n, tipo: 'olor' }); }
  let fr = null; if (p.frasco) { fr = frasco({ aroma: p.aroma }); fr.scale.setScalar(.36); sc.add(fr); }
  const st = p.sticker ? sticker(cp, p.sticker, { y: p.stickerY || 1350, cls: p.stickerCls || '' }) : null;
  return { sc, cam, cp, upd(t, d) { E.tick(t); const z0 = p.zoom === 'out' ? 8 : 11, z1 = p.zoom === 'out' ? 11 : 8.6;
    camara(cam, t, 0, d, [p.lado || 0, 2.6, z0], [(p.lado || 0) * .4, 2.5, z1], [0, 1.9, 0]);
    animPersona(pe, t, { accion: p.accion || 'hablar', k: eout(win(t, 0, .5)), hablar: p.hablar ?? .6 }); if (fr) { pe.updateMatrixWorld(true); const v = new THREE.Vector3(); pe.userData.brazos[0].mano.getWorldPosition(v); fr.position.set(v.x, v.y - .05, v.z + .15); fr.rotation.y = .5; animFrasco(fr, t, { expr: 'feliz', bob: 0 }); }
    extras.forEach(x => { if (x.tipo === 'sudor') { const ph = (t * .9 + x.i / 5) % 1; x.g.position.set(.9 + Math.sin(x.i) * .3, 2.9 - ph * 1.2, .4); x.g.scale.setScalar(1 - ph * .4); x.g.rotation.z = Math.PI; } if (x.tipo === 'olor') { x.g.position.set(1.3 + Math.sin(t * 2) * .1, 2.6 + Math.sin(t * 1.5) * .15, .3); x.g.rotation.z = Math.sin(t * 2) * .1; } });
    if (st) st.set(win(t, p.stickerT ?? d * .45, (p.stickerT ?? d * .45) + .35)); } };
});
// 5. CONTADOR: número gigante 3D que cuenta (o "3 ERRORES", "5 COSAS") con anillo de pasos
def('contador', (p) => {
  const E = estudio({ rejilla: true }); const sc = E.sc, cam = E.cam; const cp = capa();
  const grupo = new THREE.Group(); sc.add(grupo); grupo.position.y = 2.3; let num = texto3D(p.desde ?? p.numero ?? 3, { size: 2.6, depth: .6 }); grupo.add(num);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(2.0, .04, 8, 80), M.neon(PAL.acento)); grupo.add(anillo); const gl = glow(PAL.acento, 7, .3); grupo.add(gl);
  const pal = p.palabra ? el('div', 'palabraGig', cp, p.palabra) : null; const et = p.etiqueta ? sticker(cp, p.etiqueta, { y: 1500, x: 540, rot: -6 }) : null;
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
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [0, 2.7, 15], [0, 2.6, 13], [0, 2.0, 0]);
    animPersona(izq, t, { accion: p.accionIzq || 'asco', k: eout(win(t, 0, .5)), hablar: 0 }); animPersona(der, t, { accion: p.accionDer || 'celebrar', k: 1, fase: 2 });
    n.position.set(-1.2, 2.7 + Math.sin(t * 2) * .1, .4); if (fr) animFrasco(fr, t, { expr: 'feliz', salto: .4 }); const k = win(t, .1, .4); lA.style.opacity = k; lB.style.opacity = win(t, .3, .6); linea.scale.y = eout(win(t, 0, .4)); } };
});
// 8. CELULAR: teléfono 3D flotando con pantalla dibujada (chat, comentarios, pedido) — p.pantalla = 'chat' | 'comentarios' | 'pedido'
def('celular', (p) => {
  const E = estudio({}); const sc = E.sc, cam = E.cam; const cp = capa();
  const cel = celular({ dibujar: PANTALLAS[p.pantalla || 'chat'](p) }); cel.position.set(0, 2.6, 0); sc.add(cel); const gl = glow(PAL.acento, 6, .25); gl.position.set(0, 2.6, -1); sc.add(gl);
  let pe = null; if (p.persona) { pe = persona(p.persona); pe.position.set(-2.6, 0, -1.2); pe.rotation.y = .5; sc.add(pe); }
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [1.2, 2.8, 11], [0, 2.7, 9], [0, 2.5, 0]); cel.rotation.y = -.25 + Math.sin(t * .8) * .08; cel.rotation.x = -.05; cel.position.y = 2.6 + Math.sin(t * 1.6) * .06;
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
  return { sc, cam, cp, upd(t, d) { E.tick(t); camara(cam, t, 0, d, [p.cx ?? 0, 2.4, 12.5], [-(p.cx ?? 0) * .5, 2.2, 10.2], [0, 1.6, 0]); o.rotation.y = t * (p.giro ?? .6); o.position.y = (p.y ?? 1.6) + Math.sin(t * 1.8) * .1; o.scale.setScalar((p.escala || 1) * back(win(t, 0, .45)));
    if (big) { const k = win(t, .2, .5); big.style.opacity = k; big.style.transform = `translate(-50%,0) scale(${.7 + .3 * back(k)})`; } if (lab) { const [x, y] = proyectar(o, cam, [.6, .8, 0]); lab.set(x + 160, y - 170, x, y, win(t, .4, .7)); } chips.forEach((c, i) => c.set(win(t, .5 + i * .4, .8 + i * .4))); } };
});

// héroes reutilizables
export function crearHeroe(tipo, p = {}) {
  if (tipo === 'frasco') { const f = frasco({ aroma: p.aroma }); return { obj: f, anim: (t, d) => animFrasco(f, t, { expr: p.expr || 'feliz', hablar: p.hablar ?? .5, saluda: p.saluda, salto: p.salto, brazosArriba: p.brazosArriba }) }; }
  if (tipo === 'frasco2') { const g = new THREE.Group(); const a = frasco({ aroma: 'lavanda' }), b = frasco({ aroma: 'citronela' }); a.position.x = -1.2; b.position.x = 1.2; a.rotation.y = .3; b.rotation.y = -.3; g.add(a); g.add(b); return { obj: g, anim: (t) => { animFrasco(a, t, { expr: 'feliz', hablar: .3 }); animFrasco(b, t, { expr: 'guiño', fase: 1.5 }); } }; }
  if (tipo === 'aerosol') { const a = aerosol(); return { obj: a, anim: (t) => { a.rotation.z = Math.sin(t * 2) * .04; a.position.y = Math.abs(Math.sin(t * 2.5)) * .08; a.userData.cejas.forEach((c, i) => c.rotation.z = (i ? .4 : -.4) + Math.sin(t * 6) * .05); } }; }
  if (tipo === 'nube') { const n = nubeOlor(); n.position.y = 1.6; return { obj: n, anim: (t) => { n.position.y = 1.6 + Math.sin(t * 2) * .12; n.rotation.z = Math.sin(t * 1.6) * .08; } }; }
  if (tipo === 'reloj') { const r = relojArena({ color: PAL.acento }); return { obj: r, anim: (t, d) => { r.rotation.y = t * .3; animReloj(r, clamp(.2 + t / d * .5)); } }; }
  if (tipo === 'persona') { const pe = persona(p.persona || {}); return { obj: pe, anim: (t) => animPersona(pe, t, { accion: p.accion || 'hablar' }) }; }
  if (OBJETOS[tipo]) { const o = OBJETOS[tipo](p); o.position.y = 1.4; return { obj: o, anim: (t) => { o.rotation.y = t * .6; } }; }
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
};
// pantallas del celular
export const PANTALLAS = {
  chat: p => (c, w, h, k = 0) => { c.fillStyle = '#ece5dd'; c.fillRect(0, 0, w, h); c.fillStyle = '#075e54'; c.fillRect(0, 0, w, 120); c.fillStyle = '#fff'; c.font = '700 36px P'; c.fillText(p.contacto || 'EcoVital', 110, 75); c.beginPath(); c.arc(60, 62, 34, 0, 7); c.fillStyle = '#9be15d'; c.fill();
    (p.mensajes || [['c', 'Hola! ¿Hacen envíos?'], ['e', '¡Sí! A toda Colombia 🇨🇴'], ['e', 'Y pagas al recibir']]).forEach((m, i) => { const kk = clamp((k - i * .22) * 5); if (kk <= 0) return; const yo = m[0] === 'c'; c.globalAlpha = kk; c.font = '500 30px P'; const tw = c.measureText(m[1]).width + 50; const x = yo ? w - tw - 24 : 24, y = 170 + i * 110 + (1 - kk) * 30;
      c.fillStyle = yo ? '#dcf8c6' : '#fff'; rr(c, x, y, tw, 80, 20); c.fill(); c.fillStyle = '#111'; c.fillText(m[1], x + 25, y + 51); c.globalAlpha = 1; }); },
  comentarios: p => (c, w, h, k = 0) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 34px P'; c.textAlign = 'center'; c.fillText('Comentarios', w / 2, 80); c.textAlign = 'left';
    (p.coments || ['¡Me encantó la lavanda! 💜', 'Ya no vuelvo al de aluminio', '¿Hacen envíos a Cali?', 'Llegó rapidísimo 🙌']).forEach((m, i) => { const kk = clamp((k - i * .18) * 5); if (kk <= 0) return; c.globalAlpha = kk; const y = 150 + i * 150; c.beginPath(); c.arc(60, y + 30, 30, 0, 7); c.fillStyle = ['#b98cff', '#9be15d', '#ff8a3d', '#7fd1ff'][i % 4]; c.fill();
      c.fillStyle = '#aaa'; c.font = '600 24px P'; c.fillText(['@laura.m', '@andres_r', '@cami.co', '@julian23'][i % 4], 110, y + 18); c.fillStyle = '#fff'; c.font = '500 28px P'; c.fillText(m, 110, y + 58); c.fillStyle = '#ff4d6d'; c.fillText('♥', w - 60, y + 40); c.globalAlpha = 1; }); },
  pedido: p => (c, w, h, k = 0) => { c.fillStyle = '#0f1a14'; c.fillRect(0, 0, w, h); c.fillStyle = '#9be15d'; c.beginPath(); c.arc(w / 2, 330, 110 * eout(clamp(k * 3)), 0, 7); c.fill(); c.strokeStyle = '#0f1a14'; c.lineWidth = 18; c.lineCap = 'round'; const kk = clamp(k * 3 - .5); if (kk > 0) { c.beginPath(); c.moveTo(w / 2 - 50, 330); c.lineTo(w / 2 - 10, 370); c.lineTo(w / 2 + 55, 290); c.stroke(); }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 46px P'; c.fillText(p.titulo || '¡Pedido listo!', w / 2, 540); c.font = '500 30px P'; c.fillStyle = '#cfe9d2'; (p.lineas || ['Envío a toda Colombia', 'Pagas al recibir']).forEach((l, i) => c.fillText(l, w / 2, 620 + i * 54)); c.textAlign = 'left'; },
};

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
export const API = { THREE, PLANTILLAS, OBJETOS, PANTALLAS, def, estudio, camara, capa, el, etiqueta, sticker, chip, proyectar, frasco, animFrasco, persona, animPersona, aerosol, nubeOlor, gota, lavanda, manzanilla, hoja, caja, celular, pedestal, relojArena, animReloj, moto, casa, texto3D, cartel, escenario, crearHeroe, glow, mesh, rbox, M, canvasTex, redraw, rr, clamp, lerp, ease, eout, back, elastic, win, get PAL() { return PAL; } };
window.API = API;

function sfxEventos(spec) { const ev = []; spec.scenes.forEach((s, i) => { const st = spec.timeline.scenes[i].start; if (i) ev.push({ t: st - .12, tipo: 'whoosh' }); if (['pedestal', 'ingredientes', 'dato', 'versus'].includes(s.plantilla)) ev.push({ t: st + .4, tipo: 'pop' }); if (['sello', 'entrega', 'regalo', 'persona'].includes(s.plantilla) && (s.p?.sticker || s.plantilla === 'sello' || s.plantilla === 'entrega')) ev.push({ t: st + (s.plantilla === 'sello' ? spec.timeline.scenes[i].d * .35 : spec.timeline.scenes[i].d * .55) + .2, tipo: 'golpe' }); if (s.plantilla === 'comentario') ev.push({ t: st + .4, tipo: 'teclas', d: spec.timeline.scenes[i].d * .5 }); if (s.plantilla === 'contador' || s.plantilla === 'paso') ev.push({ t: st + .05, tipo: 'golpe' }); }); return ev; }

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
