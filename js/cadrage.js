// Zoom sur le plateau et cadrage automatique sur les dés une fois arrêtés.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  _look, camDir, camDist, camera, camTarget, canvasEl, fitLim, layout, resetView, view, ZOOM_MAX
} from './scene.js';
import { dice } from './des.js';
import { reservePos } from './partie.js';
import { raycaster } from './entrees.js';

// ─── Zoom sur le plateau : molette (vers le pointeur), pincement à deux doigts, touches + − 0 ───
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _p0 = new THREE.Vector3(), _q0 = new THREE.Quaternion(), _n = new THREE.Vector2();
export const toNdc = (x, y) => { const r = canvasEl.getBoundingClientRect(); return [((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1]; };
// point du plateau sous une position écran (coordonnées normalisées), pour un zoom et un décalage donnés
export function groundPointAt(nx, ny, zoom, pan) {
  _p0.copy(camera.position); _q0.copy(camera.quaternion);
  const z0 = camera.zoom, look = camTarget.clone().add(pan);
  camera.zoom = zoom; camera.updateProjectionMatrix();
  camera.position.copy(look).addScaledVector(camDir, camDist); camera.lookAt(look); camera.updateMatrixWorld(true);
  raycaster.setFromCamera(_n.set(nx, ny), camera);
  const hit = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3()) || look;
  camera.zoom = z0; camera.updateProjectionMatrix();
  camera.position.copy(_p0); camera.quaternion.copy(_q0); camera.updateMatrixWorld(true);
  return hit;
}
// plus on zoome, plus on peut décaler la vue, sans jamais sortir du plateau et des réserves
export function clampPan(pan, zoom) {
  const [hx, hz] = layout === 'portrait' ? [9.45, 5.15] : [8.3, 6.9], k = 1 - 1 / zoom;
  pan.set(THREE.MathUtils.clamp(pan.x, -hx * k, hx * k), 0, THREE.MathUtils.clamp(pan.z, -hz * k, hz * k));
}
// zoome d’un facteur en gardant immobile le point du plateau sous (nx, ny)
export function zoomAt(nx, ny, factor, instant = false) {
  view.manual = true; view.ease = 10;
  const z0 = view.targetZoom, z1 = THREE.MathUtils.clamp(z0 * factor, 1, ZOOM_MAX);
  const shift = groundPointAt(nx, ny, z0, view.targetPan).sub(groundPointAt(nx, ny, z1, view.targetPan));
  view.targetZoom = z1;
  view.targetPan.add(shift);
  clampPan(view.targetPan, z1);
  if (instant) { view.zoom = view.targetZoom; view.pan.copy(view.targetPan); }
}
export function zoomCenter(factor) { const c = _look.clone().project(camera); zoomAt(c.x, c.y, factor); }

// ─── Cadrage automatique : une fois les dés arrêtés, la vue se resserre sur eux pour qu’on lise leurs points ;
// dès qu’un dé est mis de côté, elle s’élargit juste assez pour montrer aussi ce dé sur son tapis (on peut le reprendre).
// Elle revient au plateau entier au lancer suivant. Un zoom à la main la laisse tranquille jusqu’au lancer suivant.
export let autoFrame = true;
try { autoFrame = localStorage.getItem('farkle.cadrage') !== '0'; } catch { /* cadrage par défaut */ }
export function setAutoFrame(on) { autoFrame = on; }
export function frameDice() {
  if (!autoFrame || view.manual || !fitLim) return;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const d of dice) {
    const p = d.state === 'table' && d.rest ? d.rest.pos : d.state === 'pending' ? reservePos(d.side, d.slot) : null;
    if (!p) continue;
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
  }
  if (x0 > x1) return;
  const m = 1.1; // marge autour du centre des dés
  const corners = [];
  for (const x of [x0 - m, x1 + m]) for (const y of [CONFIG.tableY, 1]) for (const z of [z0 - m, z1 + m]) corners.push(new THREE.Vector3(x, y, z));
  const center = new THREE.Vector3((x0 + x1) / 2 - camTarget.x, 0, (z0 + z1) / 2 - camTarget.z);
  // plus fort zoom où tous les dés tiennent dans la zone libre (la caméra est remise en place après les essais)
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone(), zoom0 = camera.zoom;
  const pan = new THREE.Vector3(), look = new THREE.Vector3(), v = new THREE.Vector3();
  const fits = (zoom) => {
    pan.copy(center); clampPan(pan, zoom);
    camera.zoom = zoom; camera.updateProjectionMatrix();
    look.copy(camTarget).add(pan);
    camera.position.copy(look).addScaledVector(camDir, camDist); camera.lookAt(look); camera.updateMatrixWorld(true);
    return corners.every((c) => { v.copy(c).project(camera); return v.x >= fitLim.x0 && v.x <= fitLim.x1 && v.y >= fitLim.y0 && v.y <= fitLim.y1; });
  };
  let lo = 1, hi = ZOOM_MAX;
  if (fits(hi)) lo = hi;
  else for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  camera.zoom = zoom0; camera.updateProjectionMatrix();
  camera.position.copy(p0); camera.quaternion.copy(q0); camera.updateMatrixWorld(true);
  view.targetZoom = lo;
  view.targetPan.copy(center); clampPan(view.targetPan, lo);
  view.ease = 3;
}
// nouveau lancer, nouveau tour : retour au plateau entier, et le cadrage automatique reprend la main
export function unframe() { view.manual = false; resetView(); }
