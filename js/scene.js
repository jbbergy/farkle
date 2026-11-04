// Scène 3D : rendu, caméra, zoom, lumières, et cadrage du plateau selon la place laissée par les panneaux.

import * as THREE from 'three';
import { CONFIG, LOW_POWER } from './config.js';
import { $ } from './outils.js';
import { placeSideProps, reserveMats } from './decor.js';
import { allDice } from './des.js';
import { game, reservePos } from './partie.js';
import { frameDice } from './cadrage.js';
import { fitModal } from './ui/parchemin.js';

export const canvasEl = $('scene');
export const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
// Ordinateur : 2 points de rendu par pixel, même sur un écran ordinaire où l’image, calculée plus grande puis réduite,
// en sort plus fine ; adaptResolution() redescend jusqu’à la définition de l’écran si la carte graphique peine.
// Téléphone : 1,5 au plus, et jusqu’à 1 si besoin.
const MIN_PIXEL_RATIO = LOW_POWER ? 1 : Math.min(devicePixelRatio, 2);
let pixelRatio = LOW_POWER ? Math.min(devicePixelRatio, 1.5) : 2;
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOW_POWER ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
// Sur téléphone, seule la lampe principale (immobile) porte des ombres : on ne recalcule leur carte
// que lorsqu’un dé bouge ou que la mise en page change (shadowsDirty)
renderer.shadowMap.autoUpdate = !LOW_POWER;
let shadowsDirty = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), LOW_POWER ? 4 : 16);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050302);
scene.fog = new THREE.Fog(0x050302, 30, 60);

export const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 150);
// Mise en page : 'desktop', 'compact' (téléphone en paysage) ou 'portrait'.
// En portrait la caméra regarde depuis +x : le joueur est en bas de l’écran, le Tavernier en haut.
export let layout = 'desktop';
export const camTarget = new THREE.Vector3(0, 0, 0.3);
export const camDir = new THREE.Vector3(0, 1, 0.42).normalize();
export let camDist = 24;
export const spawnXs = [13.5, 13.5]; // distance « hors écran » d’où partent les lancers (joueur, Tavernier)
// Zoom du joueur (molette, pincement) : facteur et décalage de la visée sur le plateau, avec leurs cibles lissées
export const ZOOM_MAX = 2.2;
// `ease` : vitesse du lissage (vive au doigt, plus douce pour le cadrage automatique) ; `manual` : le joueur a zoomé lui-même
export const view = { zoom: 1, targetZoom: 1, pan: new THREE.Vector3(), targetPan: new THREE.Vector3(), ease: 10, manual: false };
export function resetView() { view.targetZoom = 1; view.targetPan.set(0, 0, 0); view.ease = 5; }
export const _look = new THREE.Vector3(); // point visé par la caméra, recalculé à chaque image (update)
export let fitLim = null; // zone de l’écran (coordonnées normalisées) où le plateau doit tenir, calculée par fitCamera()

const texLoader = new THREE.TextureLoader();
export function loadTex(url, isColor) {
  const t = texLoader.load(url);
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function canvasTex(canvas, isColor) {
  const t = new THREE.CanvasTexture(canvas);
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
// texture personnalisée si fournie, sinon procédurale
export const pickTex = (url, canvas, isColor) => (url ? loadTex(url, isColor) : canvas ? canvasTex(canvas, isColor) : null);

// Carte d’environnement : une pièce sombre avec des sources chaudes (reflets sur l’os et l’étain)
export function buildEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.03, 0.018), side: THREE.BackSide })));
  const glow = (x, y, z, s, r, g, b) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) }));
    m.position.set(x, y, z); env.add(m);
  };
  glow(-12, 6, -8, 2.2, 6, 3.2, 1.2);
  glow(12, 5, -9, 1.8, 6, 3.0, 1.0);
  glow(0, 25, 4, 6, 1.6, 1.1, 0.7);
  glow(-20, 8, 14, 5, 2.5, 1.0, 0.35);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  return tex;
}

// Lumières : la lampe principale fait un rond de lumière sur le plateau et les tapis, le reste de la table
// reste dans la pénombre des bougies, pour que l’œil aille droit aux dés
const HEMI = 0.32, HEMI_SKY = new THREE.Color(0x8a5a32), HEMI_WARM = new THREE.Color(0xc0702a);
const hemi = new THREE.HemisphereLight(HEMI_SKY, 0x120804, HEMI);
scene.add(hemi);
// La salle suit les bougies (voir updateCandles) : plus chaude et plus claire quand elles s’embrasent (`glow`),
// plus sombre au dernier tour (`dusk`) ; le rond de lumière sur les dés ne change pas
export function setRoomLight({ glow, dusk }) {
  hemi.intensity = HEMI * (1 - 0.55 * dusk) * (1 + 1.1 * glow);
  hemi.color.copy(HEMI_SKY).lerp(HEMI_WARM, glow);
}
const key = new THREE.SpotLight(0xffc48a, 650, 0, 0.56, 0.4, 2);
key.position.set(2.5, 16, 6.5);
key.target.position.set(0, 0, 0.4);
key.castShadow = true;
key.shadow.mapSize.setScalar(LOW_POWER ? 1024 : 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.03;
key.shadow.camera.near = 6;
key.shadow.camera.far = 32;
scene.add(key, key.target);

// Cadrage : on cherche la distance qui fait tenir plateau + réserves dans la zone laissée libre par l’interface
const fitBox = (hx, hz) => {
  const pts = [];
  for (const x of [-hx, hx]) for (const y of [CONFIG.tableY, 1]) for (const z of [-hz, hz]) pts.push(new THREE.Vector3(x, y, z));
  return pts;
};
const FIT_POINTS = { landscape: fitBox(8.3, 6.9), portrait: fitBox(9.45, 5.15) };
const mqPortrait = matchMedia('(orientation: portrait)');
const mqCompact = matchMedia('(orientation: landscape) and (max-height: 560px)'); // mêmes requêtes que le CSS

// Rectangle de l’écran (px) non couvert par les panneaux, ou null pour tout l’écran
function freeRect() {
  const W = innerWidth, H = innerHeight;
  const box = (id) => $(id).getBoundingClientRect();
  let r;
  if (layout === 'portrait') r = { l: 6, r: W - 6, t: Math.max(box('scores').bottom, box('corner').bottom) + 6, b: box('actions').top - 6 };
  else if (layout === 'compact') r = { l: box('scores').right + 6, r: box('actions').left - 6, t: 6, b: H - 6 };
  else r = { l: 10, r: Math.min(box('scores').left, box('actions').left) - 12, t: 10, b: H - 10 }; // colonne à droite
  return r.r - r.l > 120 && r.b - r.t > 120 ? r : null;
}
function fitCamera() {
  const W = innerWidth, H = innerHeight;
  camera.aspect = W / H;
  camera.zoom = 1; // le cadrage se calcule sans le zoom du joueur, réappliqué dans update()
  const fr = freeRect();
  // on décale la projection pour centrer la scène dans la zone libre
  if (fr) camera.setViewOffset(W, H, W / 2 - (fr.l + fr.r) / 2, H / 2 - (fr.t + fr.b) / 2, W, H);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  const lim = fr
    ? { x0: (fr.l / W) * 2 - 1, x1: (fr.r / W) * 2 - 1, y0: 1 - (fr.b / H) * 2, y1: 1 - (fr.t / H) * 2 }
    : { x0: -0.96, x1: 0.96, y0: -0.93, y1: 0.9 };
  fitLim = lim;
  const pts = FIT_POINTS[layout === 'portrait' ? 'portrait' : 'landscape'];
  const v = new THREE.Vector3();
  const place = (d) => { camera.position.copy(camTarget).addScaledVector(camDir, d); camera.lookAt(camTarget); camera.updateMatrixWorld(true); };
  const fits = (d) => {
    place(d);
    return pts.every((p) => { v.copy(p).project(camera); return v.z < 1 && v.x >= lim.x0 && v.x <= lim.x1 && v.y >= lim.y0 && v.y <= lim.y1; });
  };
  let lo = 5, hi = 140;
  for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  camDist = hi;
  place(camDist);
  // point de départ des lancers : juste hors de l’écran, du côté de chaque joueur
  [1, -1].forEach((s, side) => {
    spawnXs[side] = 60;
    for (let x = 9; x < 60; x += 0.5) {
      v.set(s * x, 3.6, 0).project(camera);
      if (Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { spawnXs[side] = Math.max(12.5, x + 0.8); break; }
    }
  });
  scene.fog.near = camDist + 6;
  scene.fog.far = camDist + 34;
  camera.zoom = view.zoom;
  camera.updateProjectionMatrix();
}
export function applyLayout() {
  // portrait étroit en rem (zoom d’accessibilité du téléphone, « A+ ») : l’interface se resserre (CSS html.narrow)
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  document.documentElement.classList.toggle('narrow', mqPortrait.matches && innerWidth / rem < 22);
  document.querySelectorAll('.overlay .modal').forEach(fitModal);
  shadowsDirty = true;
  const next = mqPortrait.matches ? 'portrait' : mqCompact.matches ? 'compact' : 'desktop';
  const turned = next !== layout;
  if (turned) {
    const wasPortrait = layout === 'portrait';
    layout = next;
    const portrait = layout === 'portrait';
    camDir.set(portrait ? 0.42 : 0, 1, portrait ? 0 : 0.42).normalize();
    camTarget.set(portrait ? 0.3 : 0, 0, portrait ? 0 : 0.3);
    reserveMats.forEach((m, i) => {
      const s = i === 0 ? 1 : -1;
      m.rotation.y = portrait ? Math.PI / 2 : 0;
      m.position.set(portrait ? s * CONFIG.reserveX : 0, CONFIG.tableY + 0.025, portrait ? 0 : s * CONFIG.reserveZ);
    });
    // les dés déjà en réserve suivent leur tapis, chopes et bourses restent du côté de leur joueur
    if (portrait !== wasPortrait) for (const d of allDice) if (d.slot >= 0 && !d.tween) d.mesh.position.copy(reservePos(d.side, d.slot));
    placeSideProps();
    resetView();
  }
  renderer.setSize(innerWidth, innerHeight);
  fitCamera();
  if (turned && game.phase === 'choosing') frameDice(); // écran tourné pendant le choix : les dés restent cadrés
}

// Définition adaptative : si les images arrivent en retard de façon durable (moins de 40 par seconde environ
// sur ordinateur), on baisse la définition du rendu d’un cran, jusqu’à MIN_PIXEL_RATIO
const perf = { frames: 0, late: 0, wait: 3000, interval: 0 };
export function adaptResolution(delta, interval) {
  const expected = Math.max(interval, perf.interval); // au passage du repos (30/s) au mouvement (60/s)
  perf.interval = interval;
  if (delta > 250) return; // onglet en arrière-plan, chargement : rien à en déduire
  if (perf.wait > 0) { perf.wait -= delta; return; }
  perf.frames++;
  if (delta > expected * 1.45) perf.late++;
  if (perf.frames < 45) return;
  if (perf.late > perf.frames * 0.5 && pixelRatio > MIN_PIXEL_RATIO) {
    pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    perf.wait = 2000;
  }
  perf.frames = perf.late = 0;
}
// Sur téléphone, la carte des ombres n’est recalculée que si quelque chose bouge ou si la mise en page a changé
export function updateShadowMap(moving) {
  renderer.shadowMap.needsUpdate = shadowsDirty || moving;
  shadowsDirty = false;
}
