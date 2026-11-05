// Événements de la table : trois 1 et grandes combinaisons, dés brûlants plus spectaculaires, et l’insecte qui traverse le plateau.
// Le réglage « Événements de la table » (clé farkle.evenements) les coupe tous : les dés brûlants gardent alors leurs braises.

import * as THREE from 'three';
import { CONFIG, isCoarse, LOW_POWER, RULES } from './config.js';
import { $, clamp, rand, smoothstep } from './outils.js';
import { canvasTex, camera, canvasEl, layout, roomFx, scene } from './scene.js';
import { generateGlow } from './textures.js';
import { bangTable, blazeCandles, blowCandles, flareCandles, hotFx } from './decor.js';
import { dice } from './des.js';
import { saveWallet, wallet } from './bourse.js';
import { game } from './partie.js';
import { sfxCoins, sfxEvent, sfxSquash } from './sons.js';
import { buzzBang } from './vibreur.js';
import { chooseLine, react, say, talk } from './voix.js';
import { toast } from './ui/hud.js';

export let tableEvents = true;
try { tableEvents = localStorage.getItem('farkle.evenements') !== '0'; } catch { /* activés */ }
export function setTableEvents(on) {
  tableEvents = on;
  try { localStorage.setItem('farkle.evenements', on ? '1' : '0'); } catch { /* stockage indisponible */ }
  if (!on) { active.length = 0; if (bug) removeBug(); }
}
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// ─── Ce que les effets en cours demandent à chaque image (le plus fort l’emporte) ───
const out = { overlay: 0, kind: '', shake: 0, light: 0, lightColor: new THREE.Color(), lightPos: new THREE.Vector3(), dawn: 0, eclipse: 0 };
const active = [];
// enveloppe : monte jusqu’à `a`, tient, redescend à partir de `b` (u de 0 à 1)
const env = (u, a, b) => smoothstep(0, a, u) * (1 - smoothstep(b, 1, u));

let overlayEl, fxLight, glowTex;
export function initEvents() {
  overlayEl = $('fx');
  glowTex = canvasTex(generateGlow('rgba(255,240,210,1)'), true);
  // une seule lumière pour tous les effets, toujours présente (éteinte) : ajouter une lumière en cours de partie
  // obligerait le navigateur à recompiler tous les matériaux
  fxLight = new THREE.PointLight(0xffffff, 0, 40, 1.6);
  scene.add(fxLight);
}

// ─── Particules (sciure qui tombe des poutres) ───
const parts = [], partPool = [];
function emit({ x, y, z, vx = 0, vy = 0, vz = 0, g = 0, life = 2, size = [0.3, 0.3], color = 0xffffff, additive = true, delay = 0, twinkle = 0, sway = 0 }) {
  let s = partPool.pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false })); scene.add(s); }
  const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  if (s.material.blending !== blending) { s.material.blending = blending; s.material.needsUpdate = true; }
  s.material.color.set(color);
  s.visible = false;
  s.position.set(x, y, z);
  s.userData.p = { age: -delay, life, vx, vy, vz, g, size, twinkle, sway, phase: rand(0, 9) };
  parts.push(s);
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const s = parts[i], p = s.userData.p;
    p.age += dt;
    if (p.age < 0) continue;
    const u = p.age / p.life;
    if (u >= 1) { s.visible = false; parts.splice(i, 1); partPool.push(s); continue; }
    s.visible = true;
    p.vy += p.g * dt;
    s.position.x += (p.vx + Math.sin(p.age * 2 + p.phase) * p.sway) * dt;
    s.position.y += p.vy * dt;
    s.position.z += (p.vz + Math.cos(p.age * 1.7 + p.phase) * p.sway) * dt;
    const k = p.size[0] + (p.size[1] - p.size[0]) * u;
    s.scale.set(k, k, 1);
    s.material.opacity = Math.min(1, u * 8) * (1 - u) * (1 - p.twinkle + p.twinkle * (0.5 + 0.5 * Math.sin(p.age * 14 + p.phase)));
  }
}

// ─── Les événements ───
// centre des dés lancés, sur le plateau
const center = new THREE.Vector3();
function diceCenter(list) {
  center.set(0, 0, 0);
  for (const d of list) center.add(d.mesh.position);
  if (list.length) center.divideScalar(list.length);
  center.y = 0;
  return center;
}
const EVENTS = {
  // Trois 1 : les trois bougies de la table s’embrasent d’un coup, et la salle acclame
  bougies() {
    blazeCandles();
    flareCandles(0.8); // toute la salle se réchauffe : selon l’écran, on ne voit qu’une ou deux bougies
    sfxEvent('acclamation', 0.6, 2.5);
    return { len: 2.4, update(u) {
      out.light = Math.max(out.light, 140 * env(u, 0.05, 0.4)); out.lightColor.set(0xffa040); out.lightPos.set(0, 7, 0);
    } };
  },
  // Suite 1→6 : l’aube se lève sur la taverne, un coq chante, puis la nuit revient
  aube() {
    sfxEvent('coq', 0.8, 4);
    const side = layout === 'portrait' ? 1 : -1;
    return { len: 5, update(u) {
      const k = env(u, 0.3, 0.6);
      out.overlay = Math.max(out.overlay, k); out.kind = 'aube';
      out.dawn = Math.max(out.dawn, k);
      // la lumière rasante du matin traverse la table, d’un côté à l’autre
      out.light = Math.max(out.light, 420 * k); out.lightColor.set(0xffb48a);
      out.lightPos.set(side * (-14 + 20 * u), 4.5, -6 + 4 * u);
    } };
  },
  // Trois paires : la taverne trinque, les chopes sautent en rythme
  tournee() {
    sfxEvent('tournee', 0.8, 4);
    flareCandles(0.6);
    const tk = game.token;
    [0, 420, 840].forEach((ms, i) => setTimeout(() => { if (tk === game.token && tableEvents) { bangTable(0.55 + 0.2 * i); buzzBang(); } }, ms + 150));
    return { len: 2.4, update(u) {
      out.light = Math.max(out.light, 120 * env(u, 0.2, 0.6)); out.lightColor.set(0xffb060); out.lightPos.set(0, 6, 0);
    } };
  },
  // Quatre, cinq ou six dés pareils : la table tremble ; à cinq, la sciure tombe des poutres ;
  // à six, une éclipse : tout devient rouge sombre un instant
  tremblement(c, n) {
    const big = n >= 6, len = n === 4 ? 1.8 : n === 5 ? 2.6 : 4.4;
    sfxEvent('grondement', n === 4 ? 0.6 : 0.9, len);
    bangTable(n === 4 ? 0.5 : 0.8); buzzBang();
    if (big) blowCandles();
    if (n >= 5) {
      for (let i = 0; i < (LOW_POWER ? 50 : 90); i++) {
        emit({ x: rand(-9, 9), y: rand(8, 12), z: rand(-6, 6), vy: rand(-1, -0.3), g: -1.4, sway: 0.5, life: rand(2, 3),
          size: [rand(0.08, 0.18), rand(0.06, 0.12)], color: 0xb89466, additive: false, delay: rand(0, 1.4) });
      }
    }
    const tk = game.token;
    if (big) setTimeout(() => { if (tk === game.token && tableEvents) flareCandles(0.8); }, len * 800);
    return { len, update(u) {
      out.shake = Math.max(out.shake, (n === 4 ? 0.1 : n === 5 ? 0.17 : 0.2) * env(u, 0.06, 0.45));
      if (big) {
        const k = env(u, 0.25, 0.7);
        out.eclipse = Math.max(out.eclipse, k); out.overlay = Math.max(out.overlay, k); out.kind = 'eclipse';
        out.light = Math.max(out.light, 160 * k); out.lightColor.set(0xff2a10); out.lightPos.set(0, 5, 0);
      }
    } };
  },
  // Dés brûlants : le plateau s’embrase, le bord de l’écran rougeoie, un brasier ronfle
  hot() {
    sfxEvent('brasier', 0.7, 2.5);
    flareCandles(1);
    bangTable(0.35);
    return { len: 2.2, update(u, t) {
      const k = env(u, 0.08, 0.5) * (0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 9));
      out.overlay = Math.max(out.overlay, k); out.kind = 'hot';
      out.light = Math.max(out.light, 380 * k); out.lightColor.set(0xff7a20); out.lightPos.set(0, 3, 0);
      out.shake = Math.max(out.shake, 0.05 * env(u, 0.05, 0.3));
    } };
  },
};
function start(name, ...args) {
  if (!tableEvents || !overlayEl) return;
  active.push({ t: 0, ...EVENTS[name](...args) });
}
// Après un lancer qui marque : l’événement de la plus belle combinaison sortie, s’il y en a une.
// Renvoie vrai si l’événement fait déjà sauter les chopes (pas de coup de genou en plus).
export function rollEvent(counts, list) {
  if (!tableEvents) return false;
  const n = list.length, jokers = counts[0];
  const most = Math.max(...counts.slice(1)) + jokers;
  let missing = 0;
  for (let v = 1; v <= 6; v++) if (!counts[v]) missing++;
  const c = diceCenter(list);
  if (most >= 4) { start('tremblement', c, Math.min(6, most)); return true; }
  if (n === 6 && missing <= jokers) { start('aube'); return false; }
  if (n === 6 && !jokers && counts.filter((k, v) => v && k === 2).length === 3) { start('tournee'); return true; }
  if (counts[1] + jokers >= 3) { start('bougies'); return false; }
  return false;
}
export function hotEvent(list) {
  hotFx(list, tableEvents);
  start('hot');
}

// ─── L’insecte : un cafard ou un cloporte traverse le plateau, au plus une fois par partie (jamais chez le Tavernier,
// sa taverne est propre). L’écraser rapporte 10 groschens, que le Tavernier donne en criant merci de loin.
export const BUG_REWARD = 10;
let bug = null;
const bugPlan = { wait: 0 };
// Au début (ou à la reprise) d’une partie : l’insecte viendra peut-être, après 25 s à 2 min 30 de jeu
export function armBug() {
  if (bug) removeBug();
  bugPlan.wait = RULES.opponent === 'tavernier' || game.trace.bug ? 0 : rand(25, 150);
}
const BUG_SCALE = 0.95;
function makeBug(type) {
  const roach = type === 'cafard';
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: roach ? 0x6a3416 : 0x57534e, roughness: roach ? 0.28 : 0.55, metalness: 0.15, transparent: true });
  const dark = new THREE.MeshStandardMaterial({ color: roach ? 0x2a140a : 0x3a3733, roughness: 0.6, transparent: true });
  const L = roach ? 1.5 : 1.15;
  if (roach) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), shell);
    body.scale.set(L * 0.42, 0.16, L * 0.22); body.position.set(-0.05, 0.2, 0);
    const pronotum = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), shell);
    pronotum.scale.set(0.2, 0.13, 0.26); pronotum.position.set(L * 0.36, 0.2, 0);
    // la ligne entre les deux ailes
    const seam = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 0.01, 0.025), dark);
    seam.position.set(-0.12, 0.36, 0);
    g.add(body, pronotum, seam);
  } else {
    // le cloporte : une carapace bombée en anneaux
    for (let i = 0; i < 8; i++) {
      const s = 1 - Math.pow((i - 3.5) / 4.2, 2);
      const seg = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell);
      seg.scale.set(0.085, 0.2 * s + 0.05, 0.34 * s + 0.06); // anneaux qui se chevauchent, séparés par un léger creux seg.position.set(-L * 0.42 + i * L * 0.12, 0.08, 0);
      g.add(seg);
    }
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dark);
  head.scale.set(0.1, 0.09, 0.12); head.position.set(L * (roach ? 0.53 : 0.5), 0.16, 0);
  g.add(head);
  // antennes : longues et souples pour le cafard, courtes pour le cloporte
  const antennae = [];
  for (const side of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(L * (roach ? 0.58 : 0.55), 0.18, side * 0.05);
    const len = roach ? 1.2 : 0.35;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, len, 5).rotateZ(-Math.PI / 2).translate(len / 2, 0, 0), dark);
    a.add(m); a.rotation.y = -side * 0.45; a.rotation.z = 0.2;
    g.add(a); antennae.push(a);
  }
  // pattes : trois paires pour le cafard, sept pour le cloporte ; chacune pivote à sa hanche
  const legs = [], pairs = roach ? 3 : 7;
  for (let i = 0; i < pairs; i++) for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(L * (roach ? 0.25 - i * 0.24 : 0.36 - i * 0.12), 0.14, side * (roach ? 0.18 : 0.22));
    const len = roach ? 0.55 + i * 0.12 : 0.24;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, len, 5).translate(0, -len / 2, 0), dark);
    leg.rotation.x = side * (roach ? 1.05 : 1.15);
    hip.add(leg); g.add(hip);
    legs.push({ hip, side, phase: (i + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0, base: roach ? (1 - i) * 0.5 : (3 - i) * 0.12 });
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // à peu près grandeur nature : un cafard fait un peu plus d’un dé, un cloporte à peine un dé
  g.scale.setScalar(BUG_SCALE);
  const root = new THREE.Group();
  root.add(g);
  root.userData = { legs, antennae, mats: [shell, dark], size: L * BUG_SCALE };
  return root;
}
// Hauteur sous l’insecte : le plateau (y = 0), puis la table de chaque côté, avec la pente du bord
const BW = CONFIG.board.w / 2, BD = CONFIG.board.d / 2;
function groundAt(x, z) {
  const out = Math.max(Math.abs(x) - BW, Math.abs(z) - BD, 0);
  return -smoothstep(0, 0.35, out) * -CONFIG.tableY;
}
// Chemin d’un bord à l’autre du plateau (dans le sens où les tapis de réserve ne gênent pas), le plus loin possible des dés
function planPath() {
  const along = layout === 'portrait' ? 'z' : 'x', half = along === 'x' ? BW : BD, across = along === 'x' ? BD : BW;
  const obstacles = dice.filter((d) => d.state === 'table').map((d) => d.mesh.position);
  let best = null;
  for (let tries = 0; tries < 16; tries++) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const pts = [];
    // il arrive de la table, à 1,5 unité du bord, et y repart de l’autre côté
    for (const a of [-(half + 1.5), -0.35 * half, 0.35 * half, half + 1.5]) {
      const w = rand(-across + 1.2, across - 1.2);
      pts.push(along === 'x' ? new THREE.Vector2(dir * a, w) : new THREE.Vector2(w, dir * a));
    }
    let clear = Infinity;
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s <= 12; s++) {
      const p = pts[i].clone().lerp(pts[i + 1], s / 12);
      for (const o of obstacles) clear = Math.min(clear, Math.hypot(p.x - o.x, p.y - o.z));
    }
    if (!best || clear > best.clear) best = { pts, clear };
    if (clear > 1.6) break;
  }
  // lissé en courbe, échantillonné tous les dixièmes d’unité
  const curve = new THREE.SplineCurve(best.pts);
  return curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.1));
}
function launchBug(type = Math.random() < 0.6 ? 'cafard' : 'cloporte') {
  bugPlan.wait = 0;
  game.trace.bug = true;
  const mesh = makeBug(type);
  const path = planPath();
  bug = { mesh, path, type, dist: 0, speed: 0, pause: rand(0.4, 0.9), pauseAt: rand(0.35, 0.6), paused: false, gait: 0, caught: 0, fade: 0, said: false, t: 0 };
  mesh.position.set(path[0].x, groundAt(path[0].x, path[0].y), path[0].y);
  scene.add(mesh);
}
function removeBug() {
  scene.remove(bug.mesh);
  bug.mesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  bug.mesh.userData.mats.forEach((m) => m.dispose());
  bug = null;
}
const _p = new THREE.Vector3();
function updateBug(dt) {
  if (bugPlan.wait > 0 && !bug) {
    // le temps ne compte que pendant la partie, onglet visible ; l’insecte n’entre pas pendant un lancer
    if (['menu', 'over'].includes(game.phase) || document.hidden || !tableEvents) return;
    bugPlan.wait -= dt;
    if (bugPlan.wait <= 0) {
      if (['idle', 'choosing'].includes(game.phase)) launchBug(); else bugPlan.wait = 1;
    }
    return;
  }
  if (!bug) return;
  if (game.phase === 'menu' || game.phase === 'over') { removeBug(); return; }
  const b = bug, m = b.mesh, { legs, antennae, mats } = m.userData;
  b.t += dt;
  if (b.caught) {
    // écrasé : aplati d’un coup, puis il s’efface
    b.caught += dt;
    m.scale.set(1 + 0.25 * Math.min(1, b.caught * 12), Math.max(0.18, 1 - b.caught * 10), 1 + 0.25 * Math.min(1, b.caught * 12));
    const fade = clamp((b.caught - 1.2) / 0.6, 0, 1);
    mats.forEach((mat) => { mat.opacity = 1 - fade; });
    if (fade >= 1) removeBug();
    return;
  }
  // il file par à-coups, s’arrête une fois au milieu en remuant les antennes, et détale si les dés arrivent
  const total = b.path.length - 1, frac = b.dist / (total * 0.1);
  const flee = game.phase === 'rolling';
  let target = flee ? 10 : b.type === 'cafard' ? 5 : 3.2;
  if (!b.paused && !flee && frac > b.pauseAt && b.pause > 0) b.paused = true;
  if (b.paused) { target = 0; b.pause -= dt; if (b.pause <= 0 || flee) b.paused = false; }
  else if (!flee) target *= 0.75 + 0.35 * Math.sin(b.t * 5.3) * Math.sin(b.t * 2.1);
  b.speed += (target - b.speed) * Math.min(1, dt * 8);
  b.dist += b.speed * dt;
  const i = Math.min(total - 1, Math.floor(b.dist / 0.1));
  if (i >= total - 1) { removeBug(); return; }
  const f = b.dist / 0.1 - i, p0 = b.path[i], p1 = b.path[i + 1];
  const x = p0.x + (p1.x - p0.x) * f, z = p0.y + (p1.y - p0.y) * f;
  const y = groundAt(x, z), ahead = groundAt(x + (p1.x - p0.x) * 3, z + (p1.y - p0.y) * 3);
  m.position.set(x, y, z);
  m.rotation.set(0, Math.atan2(-(p1.y - p0.y), p1.x - p0.x), 0);
  m.rotateZ(Math.atan2(ahead - y, 0.3) * 0.8); // il se cabre en montant sur le plateau, pique du nez en descendant
  b.gait += b.speed * dt * (b.type === 'cafard' ? 6 : 9);
  for (const l of legs) l.hip.rotation.y = l.base + Math.sin(b.gait + l.phase) * (b.type === 'cafard' ? 0.45 : 0.3);
  antennae.forEach((a, k) => { a.rotation.z = 0.2 + Math.sin(b.t * (b.paused ? 9 : 4) + k * 2) * (b.paused ? 0.25 : 0.1); });
  // l’adversaire le remarque dès qu’il monte sur le plateau
  if (!b.said && y > -0.05) { b.said = true; setTimeout(() => { if (!b.caught) react('insecte', 1, 0); }, 500); }
}
// Après l’insecte écrasé : l’adversaire salue le coup tout de suite (« Tu l’as eu ! »), quitte à couper son
// « Tu as vu ça ?! », puis le Tavernier crie « Merci ! » de loin, derrière son comptoir, une fois qu’il a fini
async function thankForBug(tk) {
  await talk.ready;
  if (tk !== game.token) return;
  if (RULES.opponent !== 'tavernier') say(chooseLine('ecrase', 'ecrase'));
  await new Promise((r) => setTimeout(r, 300));
  while (talk.current && !talk.current.anecdote && performance.now() < talk.busyUntil) await new Promise((r) => setTimeout(r, 100));
  await new Promise((r) => setTimeout(r, 300)); // un temps de souffle avant le « Merci ! »
  if (tk === game.token) say(['tavernier_merci_1', 'tavernier'], false, 'far');
}
// Le joueur clique ou touche l’écran : a-t-il écrasé l’insecte ?
export function catchBug(clientX, clientY) {
  if (!bug || bug.caught) return false;
  const r = canvasEl.getBoundingClientRect(), v = _p.copy(bug.mesh.position).project(camera);
  const sx = r.left + ((v.x + 1) / 2) * r.width, sy = r.top + ((1 - v.y) / 2) * r.height;
  // la tolérance suit la taille de l’insecte à l’écran (zoom compris), avec un minimum confortable au doigt
  const tip = _p.copy(bug.mesh.position).add(new THREE.Vector3(bug.mesh.userData.size, 0, 0)).project(camera);
  const radius = Math.max(isCoarse ? 46 : 30, Math.hypot((tip.x - v.x) * r.width / 2, (tip.y - v.y) * r.height / 2) * 1.2);
  if (Math.hypot(clientX - sx, clientY - sy) > radius) return false;
  bug.caught = 0.001;
  sfxSquash();
  wallet.purse += BUG_REWARD; saveWallet();
  const tk = game.token;
  setTimeout(() => {
    if (tk !== game.token) return;
    toast(`+${BUG_REWARD} groschens`, 'Le Tavernier te remercie', 'bank', 1800);
    sfxCoins(0.6);
  }, 250);
  bug.said = true;
  thankForBug(tk);
  return true;
}
export const bugUnder = () => !!bug && !bug.caught;

// ─── Chaque image ───
const shakeOffset = new THREE.Vector3();
let elapsed = 0;
export function updateEvents(dt) {
  elapsed += dt;
  out.overlay = out.shake = out.light = out.dawn = out.eclipse = 0;
  for (let i = active.length - 1; i >= 0; i--) {
    const e = active[i];
    e.t += dt;
    if (e.t >= e.len) { active.splice(i, 1); continue; }
    e.update(e.t / e.len, e.t);
  }
  updateParts(dt);
  updateBug(dt);
  if (!overlayEl) return shakeOffset.set(0, 0, 0);
  overlayEl.style.opacity = out.overlay ? out.overlay.toFixed(3) : '';
  if (out.overlay && overlayEl.dataset.fx !== out.kind) overlayEl.dataset.fx = out.kind;
  fxLight.intensity = out.light;
  if (out.light) { fxLight.color.copy(out.lightColor); fxLight.position.copy(out.lightPos); }
  roomFx.dawn = out.dawn; roomFx.eclipse = out.eclipse;
  // la table tremble : la vue tressaute (sauf si le système demande moins de mouvements)
  const a = calm.matches ? 0 : out.shake, t = elapsed;
  return shakeOffset.set(a * (Math.sin(t * 61) + 0.6 * Math.sin(t * 37 + 1)), a * 0.5 * Math.sin(t * 53 + 2), a * (Math.sin(t * 47 + 3) + 0.6 * Math.sin(t * 29)));
}
// pour essayer depuis la console (FarkleDebug.event('bougies'), FarkleDebug.bug())
export function testEvent(name, n = 6) {
  const list = dice.filter((d) => d.state === 'table');
  if (name === 'hot') hotEvent(dice); else start(name, diceCenter(list), n);
}
export function testBug(type) { if (bug) removeBug(); launchBug(type); return bug; }
