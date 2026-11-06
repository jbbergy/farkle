// Commandes du joueur : souris, toucher, pincement, clavier, et bulle du nom des dés spéciaux.

import * as THREE from 'three';
import { CONFIG, isCoarse } from './config.js';
import { $, clamp } from './outils.js';
import { DIE_KINDS, faceValue } from './des-speciaux.js';
import { camera, canvasEl, resetView, scene, view } from './scene.js';
import { allDice, dice } from './des.js';
import { bankAction, canSelect, game, rollAction, toggleDie } from './partie.js';
import { clampPan, groundPointAt, toNdc, zoomAt, zoomCenter } from './cadrage.js';
import { catchBug } from './evenements.js';
import { kindIcon } from './ui/icones.js';
import { el } from './ui/hud.js';
import { closeRules } from './ui/page-regles.js';
import { closeShop } from './ui/echoppe.js';
import { closeCarnet } from './ui/page-carnet.js';
import { closeOnline } from './ui/page-en-ligne.js';
import { settingsPanel, toggleSettings } from './ui/reglages.js';

export const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerInside = false, pointerDirty = false, hovered = null;
function setNdc(e) {
  const r = canvasEl.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function pickDie() {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(allDice.map((d) => d.mesh), false)[0];
  return hit ? hit.object.userData.die : null;
}
const _sv = new THREE.Vector3();
// position d’un dé à l’écran, en px CSS
export function screenOf(d) {
  const v = _sv.copy(d.mesh.position).project(camera), r = canvasEl.getBoundingClientRect();
  return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
}
// Au doigt, les dés sont petits : si le toucher tombe à côté, on prend le dé jouable le plus proche
function nearestSelectable(x, y, radius) {
  let best = null, bestD = radius;
  for (const d of dice) {
    if (!canSelect(d)) continue;
    const [sx, sy] = screenOf(d), dist = Math.hypot(sx - x, sy - y);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

export const touches = new Map();
let pinch = null, lastPinchEnd = 0;
function pinchState() {
  const [a, b] = [...touches.values()];
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, dist: Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])) };
}
function endTouch(e) {
  if (!touches.delete(e.pointerId)) return;
  if (pinch && touches.size < 2) { pinch = null; lastPinchEnd = performance.now(); }
}
let cursorShown = '';
export function updateHover() {
  if (pointerDirty) { hovered = pointerInside ? pickDie() : null; pointerDirty = false; }
  let cursor = 'default';
  if (hovered && game.current === 0 && game.phase === 'choosing') cursor = canSelect(hovered) ? 'pointer' : 'not-allowed';
  if (cursor !== cursorShown) canvasEl.style.cursor = cursorShown = cursor;
}

// ─── Nom des dés spéciaux : bulle au survol, au clavier, ou un moment après avoir pris le dé ───
export const dieTip = { el: $('die-tip'), die: null, label: '', flash: null, until: 0 };
const _up = new THREE.Vector3();
function tipTarget() {
  if (game.phase === 'menu' || game.phase === 'over' || game.phase === 'rolling') return null;
  if (hovered && hovered.kind) return hovered;
  if (kb.active && kb.focus && kb.focus.kind) return kb.focus;
  if (dieTip.flash && dieTip.flash.kind && performance.now() < dieTip.until) return dieTip.flash;
  return null;
}
export function updateDieTip() {
  const d = tipTarget(), el = dieTip.el;
  el.classList.toggle('show', !!d);
  if (!d) return;
  const k = DIE_KINDS[d.kind], joker = faceValue(d) === 0;
  const label = `${d.kind}|${joker}`;
  if (label !== dieTip.label) {
    dieTip.label = label;
    el.innerHTML = `${kindIcon(d.kind)}<span><b>${k.name}</b><small>${joker ? 'Joker : remplace n’importe quel chiffre dans une combinaison.' : k.effect}</small></span>`;
  }
  // juste au-dessus du dé, quel que soit le sens de la caméra (portrait ou paysage) ;
  // en dessous s’il n’y a pas la place en haut de l’écran, et jamais hors des bords
  const r = canvasEl.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const at = (dir) => {
    _up.set(0, dir, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.75).add(d.mesh.position).project(camera);
    return [r.left + ((_up.x + 1) / 2) * r.width, r.top + ((1 - _up.y) / 2) * r.height];
  };
  let [x, y] = at(1);
  const below = y - h - 10 < 8;
  if (below) [x, y] = at(-1);
  el.classList.toggle('below', below);
  el.style.left = `${clamp(x, w / 2 + 8, innerWidth - w / 2 - 8)}px`;
  el.style.top = `${y}px`;
}

// ─── Choix d’un dé au clavier (flèches / ZQSD, Espace ou Entrée pour le prendre) ───
export const kb = { active: false, focus: null };
const focusable = () => dice.filter(canSelect);
export function focusFirst() {
  // le dé jouable le plus à gauche de l’écran, en priorité sur le plateau
  const table = focusable().filter((d) => d.state === 'table');
  const pool = (table.length ? table : focusable()).map((d) => [d, screenOf(d)]);
  pool.sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]);
  kb.focus = pool.length ? pool[0][0] : null;
}
function moveFocus(dx, dy) {
  kb.active = true;
  const list = focusable();
  if (!kb.focus || !list.includes(kb.focus)) { focusFirst(); return; }
  const [fx, fy] = screenOf(kb.focus);
  let best = null, bestScore = Infinity;
  for (const d of list) {
    if (d === kb.focus) continue;
    const [x, y] = screenOf(d);
    const along = (x - fx) * dx + (y - fy) * dy;               // avancée dans la direction demandée
    if (along < 8) continue;
    const score = along + Math.abs((x - fx) * dy - (y - fy) * dx) * 2.5; // l’écart latéral compte plus
    if (score < bestScore) { bestScore = score; best = d; }
  }
  if (best) kb.focus = best;
}
function toggleFocused() {
  kb.active = true;
  if (!kb.focus || !canSelect(kb.focus)) { focusFirst(); return; }
  const d = kb.focus, from = screenOf(d), fromTable = d.state === 'table';
  toggleDie(d);
  // après une mise de côté, on passe au dé jouable le plus proche resté sur le plateau
  if (!fromTable) return;
  let best = null, bestD = Infinity;
  for (const o of focusable()) {
    if (o.state !== 'table') continue;
    const [x, y] = screenOf(o), dist = Math.hypot(x - from[0], y - from[1]);
    if (dist < bestD) { bestD = dist; best = o; }
  }
  if (best) kb.focus = best;
}
// anneau lumineux posé sous le dé choisi au clavier
const focusRing = new THREE.Mesh(
  new THREE.RingGeometry(0.8, 0.94, 48),
  new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
);
focusRing.rotation.x = -Math.PI / 2;
focusRing.visible = false;

export function updateGlow(t, dt) {
  const focus = kb.active && kb.focus && canSelect(kb.focus) ? kb.focus : null;
  for (const d of allDice) {
    let target = 0;
    if ((d === hovered || d === focus) && canSelect(d)) target = d.state === 'pending' ? 0.22 : 0.4;
    else if (d.state === 'pending') target = 0.1 + 0.06 * Math.sin(t * 4 + d.id);
    d.glow += (target - d.glow) * Math.min(1, dt * 12);
    // dés brûlants : ils rougeoient un moment (voir hotFx)
    d.heat = Math.max(0, d.heat - dt * 0.8);
    d.mat.emissiveIntensity = Math.max(d.glow, d.heat * 0.7);
  }
  const m = focusRing.material;
  m.opacity += ((focus ? 0.6 + 0.2 * Math.sin(t * 5) : 0) - m.opacity) * Math.min(1, dt * 14);
  if (focus) focusRing.position.set(focus.mesh.position.x, focus.state === 'table' ? 0.02 : CONFIG.tableY + 0.07, focus.mesh.position.z);
  focusRing.visible = m.opacity > 0.01;
}

const DIRS = {
  arrowleft: [-1, 0], q: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], z: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
};

// Branche la souris, le toucher, la molette et le clavier
export function initInput() {
  canvasEl.addEventListener('pointermove', (e) => {
    setNdc(e); pointerInside = e.pointerType === 'mouse'; pointerDirty = true;
    if (pointerInside) kb.active = false;
  });
  canvasEl.addEventListener('pointerleave', () => { pointerInside = false; pointerDirty = true; });
  canvasEl.addEventListener('click', (e) => {
    if (performance.now() - lastPinchEnd < 350) return; // fin d’un pincement, pas un toucher
    if (catchBug(e.clientX, e.clientY)) return; // l’insecte passe avant les dés
    setNdc(e);
    const d = pickDie() || nearestSelectable(e.clientX, e.clientY, isCoarse ? 42 : 12);
    if (d && canSelect(d)) toggleDie(d);
    // au doigt, sans survol : toucher un dé spécial qu’on ne peut pas prendre montre quand même son nom
    else if (d && d.kind) { dieTip.flash = d; dieTip.until = performance.now() + 2200; }
  });
  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(...toNdc(e.clientX, e.clientY), Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))); // ctrl : pincement du pavé tactile
  }, { passive: false });
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) pinch = pinchState();
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size !== 2 || !pinch) return;
    const now = pinchState(), [px, py] = toNdc(pinch.x, pinch.y), [nx, ny] = toNdc(now.x, now.y);
    // les deux doigts déplacent aussi la vue : le point sous l’ancien milieu passe sous le nouveau
    view.targetPan.add(groundPointAt(px, py, view.targetZoom, view.targetPan).sub(groundPointAt(nx, ny, view.targetZoom, view.targetPan)));
    clampPan(view.targetPan, view.targetZoom);
    zoomAt(nx, ny, now.dist / pinch.dist, true);
    pinch = now;
  });
  canvasEl.addEventListener('pointerup', endTouch);
  canvasEl.addEventListener('pointercancel', endTouch);
  scene.add(focusRing);
  el.roll.addEventListener('click', (e) => { e.currentTarget.blur(); if (game.current === 0) rollAction(); });
  el.bank.addEventListener('click', (e) => { e.currentTarget.blur(); if (game.current === 0) bankAction(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeRules(); closeShop(); closeCarnet(); closeOnline(); toggleSettings(false); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('rules').classList.contains('hidden') || !settingsPanel.classList.contains('hidden')) return;
    if (game.phase === 'menu' || game.phase === 'over') return;
    const k = e.key.toLowerCase();
    const myChoice = game.current === 0 && game.phase === 'choosing';
    if (k === '+' || k === '=') { e.preventDefault(); zoomCenter(1.25); }
    else if (k === '-') { e.preventDefault(); zoomCenter(0.8); }
    else if (k === '0') { e.preventDefault(); resetView(); view.manual = true; }
    else if (DIRS[k]) { e.preventDefault(); if (myChoice) moveFocus(...DIRS[k]); }
    else if (k === 'r') { e.preventDefault(); kb.active = true; if (!e.repeat && !el.roll.disabled) el.roll.click(); }
    else if (k === 'g') { e.preventDefault(); if (!e.repeat && !el.bank.disabled) el.bank.click(); }
    else if (k === ' ' || k === 'enter') { e.preventDefault(); if (!e.repeat && myChoice) toggleFocused(); }
  });
}
