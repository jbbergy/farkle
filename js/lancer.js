// Lancer des dés : calculé d’avance par la physique, puis rejoué à l’écran avec ses bruits de chocs.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from './config.js';
import { rand, sleep } from './outils.js';
import { DIE_KINDS } from './des-speciaux.js';
import { MASK_ALL, MASK_ENTER_L, MASK_ENTER_R, world } from './physique.js';
import { FACES, moveDie, placeBodyAtMesh, randomQuat, setInWorld, spawnPos, storeRest, topFace } from './des.js';
import { game } from './partie.js';
import { sfxHit, sfxRattle } from './sons.js';

// Un lancer est calculé d’un coup (physique à pas fixe, jusqu’à ce que les dés reposent), puis rejoué à l’écran.
// Chaque dé spécial tire d’abord sa face selon ses chances ; à la lecture, son image est tournée d’un des
// 24 retournements du cube pour que cette face arrive en haut. Le cube étant symétrique, la trajectoire est la même.
export let replayJob = null;
// on abandonne le lancer en cours (nouvelle partie, retour au menu)
export function cancelReplay() { replayJob = null; }
export async function throwDice(list, side) {
  const tk = game.token;
  sfxRattle(side);
  for (const d of list) d.slot = -1;
  await Promise.all(list.map((d, i) => { setInWorld(d, false); return moveDie(d, spawnPos(side, i), randomQuat(), { duration: 360 + i * 35, arc: 1.4 }); }));
  if (tk !== game.token) return false;
  await sleep(140);
  if (tk !== game.token) return false;
  const dir = side === 0 ? -1 : 1;
  const { halfW } = CONFIG.play;
  for (const d of list) {
    const b = d.body, p = d.mesh.position;
    placeBodyAtMesh(d);
    const vx = rand(16, 21);
    const T = (Math.abs(p.x) - CONFIG.board.w / 2) / vx; // instant où le dé survole le bord du plateau
    const vy = (2.4 - p.y + 0.5 * -CONFIG.gravity * T * T) / T;
    b.velocity.set(dir * vx, vy, (rand(-2.5, 2.5) - p.z) / (T + 0.25));
    b.angularVelocity.set(rand(-25, 25), rand(-15, 15), rand(-25, 25));
    b.collisionFilterMask = side === 0 ? MASK_ENTER_R : MASK_ENTER_L;
    d.entering = side === 0 ? 'R' : 'L';
    b.wakeUp();
    setInWorld(d, true);
    d.physics = false; // l’image attend le résultat du calcul, hors écran
  }
  const rec = await simulateThrow(list);
  if (tk !== game.token) return false;
  const offsets = list.map((d, i) => {
    const kind = d.kind && DIE_KINDS[d.kind];
    if (!kind) return null; // dé ordinaire : la physique décide seule
    const f = rec.frames[rec.frames.length - 1], k = i * 7;
    const top = topFace(new THREE.Quaternion(f[k + 3], f[k + 4], f[k + 5], f[k + 6])).index;
    const v = drawFace(kind.w), want = FACES.findIndex((F) => F.v === v);
    const spin = new THREE.Quaternion().setFromAxisAngle(FACES[top].n, ((Math.random() * 4) | 0) * Math.PI / 2);
    return spin.multiply(new THREE.Quaternion().setFromUnitVectors(FACES[want].n, FACES[top].n));
  });
  return new Promise((resolve) => { replayJob = { list, rec, offsets, t: 0, sound: 0, resolve }; });
}
// Tirage d’une face selon ses chances sur 100 (du 1 au 6)
function drawFace(w) {
  let r = Math.random() * 100;
  for (let v = 1; v <= 6; v++) { r -= w[v - 1]; if (r < 0) return v; }
  return 6;
}
// Calcul du lancer : on enregistre la position des dés à chaque pas, et les chocs pour les rejouer en sons.
// Le calcul est découpé en tranches de quelques millisecondes pour ne pas figer l’image (téléphones lents).
const SIM_STEP = 1 / 120;
export let sim = null;
async function simulateThrow(list) {
  const job = { list, stableTime: 0, elapsed: 0, nudges: 0, flicks: 0 }, frames = [], t0 = performance.now();
  sim = { time: 0, sounds: [] };
  for (const d of list) d.lastSound = -1;
  let done = false, slice = performance.now(), work = 0;
  while (!done && sim.time < 30) {
    if (performance.now() - slice > 8) { work += performance.now() - slice; await sleep(0); slice = performance.now(); }
    world.step(SIM_STEP);
    sim.time += SIM_STEP;
    done = settleStep(job, SIM_STEP);
    const f = new Float32Array(list.length * 7);
    list.forEach((d, i) => {
      const p = d.body.position, q = d.body.quaternion;
      f[i * 7] = p.x; f[i * 7 + 1] = p.y; f[i * 7 + 2] = p.z; f[i * 7 + 3] = q.x; f[i * 7 + 4] = q.y; f[i * 7 + 5] = q.z; f[i * 7 + 6] = q.w;
    });
    frames.push(f);
  }
  const sounds = sim.sounds;
  sim = null;
  work += performance.now() - slice;
  return { frames, sounds, work, wait: performance.now() - t0 };
}
export function updateReplay(dt) {
  const job = replayJob;
  if (!job) return;
  job.t += dt;
  const { frames, sounds } = job.rec, last = frames.length - 1;
  const f = frames[Math.min(last, Math.floor(job.t / SIM_STEP))];
  while (job.sound < sounds.length && sounds[job.sound].t <= job.t) { const s = sounds[job.sound++]; sfxHit(s.v, s.kind); }
  job.list.forEach((d, i) => {
    const k = i * 7;
    d.mesh.position.set(f[k], f[k + 1], f[k + 2]);
    d.mesh.quaternion.set(f[k + 3], f[k + 4], f[k + 5], f[k + 6]);
    if (job.offsets[i]) d.mesh.quaternion.multiply(job.offsets[i]);
  });
  if (job.t < last * SIM_STEP) return;
  replayJob = null;
  for (const d of job.list) {
    placeBodyAtMesh(d); d.body.sleep();
    d.entering = null;
    storeRest(d);
  }
  job.resolve(true);
}

function outOfPlay(d) {
  const p = d.body.position, { halfW, halfD } = CONFIG.play;
  return Math.abs(p.x) > halfW - 0.2 || Math.abs(p.z) > halfD - 0.2 || p.y < 0.2;
}
// Dé cassé : posé de travers sur le plateau, contre un autre dé ou un bord, sans face franche vers le haut
const cocked = (d) => !outOfPlay(d) && d.body.position.y < 0.9 && topFace(d.body.quaternion).dot < 0.94;
// Pichenette vers le centre, assez appuyée pour qu’un dé cassé ne retombe pas de travers
function flick(d) {
  const b = d.body;
  b.wakeUp();
  b.velocity.set(-b.position.x * 0.4 + rand(-1, 1), rand(5.5, 7.5), -b.position.z * 0.4 + rand(-1, 1));
  b.angularVelocity.set(rand(-15, 15), rand(-15, 15), rand(-15, 15));
}
function nudge(d) {
  const b = d.body;
  if (d.entering || outOfPlay(d)) {
    b.wakeUp();
    b.position.set(rand(-3, 3), 3.5, rand(-2, 2));
    b.velocity.set(rand(-4, 4), -2, rand(-3, 3));
    b.collisionFilterMask = MASK_ALL; d.entering = null;
    b.angularVelocity.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
  } else flick(d);
}
// Un pas de surveillance du lancer en cours de calcul : vrai quand tous les dés reposent à plat sur le plateau
function settleStep(job, dt) {
  job.elapsed += dt;
  const { halfW } = CONFIG.play;
  for (const d of job.list) {
    if (d.entering === 'R' && d.body.position.x < halfW - 0.95) { d.body.collisionFilterMask = MASK_ALL; d.entering = null; }
    else if (d.entering === 'L' && d.body.position.x > -halfW + 0.95) { d.body.collisionFilterMask = MASK_ALL; d.entering = null; }
    // un dé cassé qui ne bouge presque plus reçoit sa pichenette tout de suite, sans attendre que les autres s’arrêtent
    // (même arrêté au bord, avant d’avoir fini d’entrer : la pichenette le pousse vers le centre)
    const slow = d.body.velocity.lengthSquared() < 0.5 && d.body.angularVelocity.lengthSquared() < 1.5;
    d.cockedTime = slow && cocked(d) ? (d.cockedTime || 0) + dt : 0;
    if (d.cockedTime > 0.25 && job.flicks < 6) {
      job.flicks++; d.cockedTime = 0; job.stableTime = 0; job.elapsed = Math.min(job.elapsed, 4);
      flick(d);
    }
  }
  const moving = job.list.some((d) => d.body.sleepState !== CANNON.Body.SLEEPING &&
    (d.body.velocity.lengthSquared() > 0.02 || d.body.angularVelocity.lengthSquared() > 0.04));
  job.stableTime = moving ? 0 : job.stableTime + dt;
  if (job.stableTime < 0.22 && job.elapsed < 7) return false;
  // dé sorti, encore « en vol », ou cassé (appuyé sur un autre) → petite pichenette
  const bad = job.list.filter((d) => d.entering || outOfPlay(d) || d.body.position.y > 0.9 || topFace(d.body.quaternion).dot < 0.94);
  if (bad.length && job.nudges < 4) {
    job.nudges++; job.stableTime = 0; job.elapsed = Math.min(job.elapsed, 4);
    bad.forEach(nudge);
    return false;
  }
  for (const d of job.list) { d.body.velocity.setZero(); d.body.angularVelocity.setZero(); d.body.sleep(); }
  return true;
}
