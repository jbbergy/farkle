// Les douze dés : création, apparence (dés spéciaux, couleur de l’adversaire), place sur le plateau et les tapis.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as CANNON from 'cannon-es';
import { LOW_POWER, RULES, TEXTURES } from './config.js';
import { makeCanvas, rand, tween, tweens } from './outils.js';
import { DIE_KINDS } from './des-speciaux.js';
import { OPP } from './adversaires.js';
import { drawHorns, drawPips, faceAtlas, generateDieFaces } from './textures.js';
import { scene, spawnXs } from './scene.js';
import { G, MASK_ALL, mDice, world } from './physique.js';
import { game, reservePos, slots } from './partie.js';
import { onDieCollide } from './sons.js';

// Ordre des groupes de BoxGeometry : +X, −X, +Y, −Y, +Z, −Z (faces opposées = 7)
export const FACES = [
  { n: new THREE.Vector3(1, 0, 0), v: 2 },
  { n: new THREE.Vector3(-1, 0, 0), v: 5 },
  { n: new THREE.Vector3(0, 1, 0), v: 1 },
  { n: new THREE.Vector3(0, -1, 0), v: 6 },
  { n: new THREE.Vector3(0, 0, 1), v: 3 },
  { n: new THREE.Vector3(0, 0, -1), v: 4 },
];
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
export function topFace(q) {
  _q.set(q.x, q.y, q.z, q.w);
  let best = 0, bestY = -2;
  for (let i = 0; i < 6; i++) { const y = _v.copy(FACES[i].n).applyQuaternion(_q).y; if (y > bestY) { bestY = y; best = i; } }
  return { index: best, value: FACES[best].v, dot: bestY };
}
// Orientation « posée à plat » : la face donnée vers le haut, alignée sur les axes, puis tournée de `yaw`
export function faceUpQuat(faceIndex, yaw = 0) {
  const a = FACES[faceIndex].n;
  const b = Math.abs(a.z) > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const c = new THREE.Vector3().crossVectors(a, b);
  const L = new THREE.Matrix4().makeBasis(a, b, c);
  const W = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(W.multiply(L.transpose()));
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
}
export const randomQuat = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(0, 6.283), rand(0, 6.283), rand(0, 6.283)));

// Chaque joueur a son jeu de six dés : os clair (et dés spéciaux) pour le joueur, os teinté au brou de noix pour le Tavernier.
// `dice` est le jeu du joueur dont c’est le tour ; l’autre jeu attend sur le tapis de son propriétaire.
export const dice = [], allDice = [], diceSets = [[], []];
const TAVERN_LOOK = { body: '#a8673a', pip: '#f3e6c4' };
let dieFaces = null;   // faces procédurales, gardées pour fabriquer celles des dés spéciaux
const dieMaps = {};    // textures du dé ordinaire
export function createDice() {
  if (!TEXTURES.diceColor || !TEXTURES.diceBump) dieFaces = generateDieFaces(1234, LOW_POWER ? 256 : 512);
  const map = dieMaps.map = faceAtlas(TEXTURES.diceColor, dieFaces && dieFaces.color, true);
  const bumpMap = dieMaps.bumpMap = faceAtlas(TEXTURES.diceBump, dieFaces && dieFaces.bump, false);
  const normalMap = faceAtlas(TEXTURES.diceNormal, null, false);
  const geo = new RoundedBoxGeometry(1, 1, 1, 4, 0.12);
  // chaque face de la géométrie pointe vers sa case de l’atlas (faces dans l’ordre des groupes : +X, −X, +Y, −Y, +Z, −Z),
  // un rien en retrait pour ne pas déborder sur la case voisine
  const uv = geo.attributes.uv, perFace = uv.count / 6, inset = 0.004;
  for (let i = 0; i < uv.count; i++) {
    const cell = FACES[(i / perFace) | 0].v - 1, col = cell % 3, row = (cell / 3) | 0;
    const u = inset + uv.getX(i) * (1 - 2 * inset), v = inset + uv.getY(i) * (1 - 2 * inset);
    uv.setXY(i, (col + u) / 3, (1 - row + v) / 2);
  }
  geo.clearGroups();
  const aged = new THREE.Color(0.93, 0.87, 0.78);
  const tavern = tintedMaps('look-tavernier', TAVERN_LOOK);
  for (let i = 0; i < 12; i++) {
    const owner = i < 6 ? 0 : 1, base = owner ? tavern : dieMaps;
    const tint = new THREE.Color(1, 1, 1).lerp(aged, rand(0, owner ? 0.3 : 0.55));
    if (owner && !dieFaces) tint.multiply(new THREE.Color(TAVERN_LOOK.body));
    const mat = new THREE.MeshPhysicalMaterial({
      map: base.map, bumpMap: base.bumpMap, bumpScale: 2.2, normalMap,
      color: tint, roughness: 0.5, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.45,
      emissive: new THREE.Color(0xff9440), emissiveIntensity: 0, envMapIntensity: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    const body = new CANNON.Body({
      mass: 1, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), material: mDice,
      linearDamping: 0.06, angularDamping: 0.09, allowSleep: true, sleepSpeedLimit: 0.2, sleepTimeLimit: 0.25,
      collisionFilterGroup: G.DICE, collisionFilterMask: MASK_ALL,
    });
    const d = { id: i, owner, mesh, body, mat, tint, base, kind: null, state: 'table', slot: -1, side: owner, value: 1, rest: null, inWorld: false, physics: false, entering: null, tween: null, glow: 0, heat: 0, lastSound: 0 };
    mesh.userData.die = d;
    body.die = d;
    body.addEventListener('collide', (e) => onDieCollide(d, e));
    allDice.push(d);
    diceSets[owner].push(d);
  }
  useSet(0);
}
export function useSet(p) { dice.length = 0; dice.push(...diceSets[p]); }

// Textures d’un dé spécial, ou des dés du Tavernier (fabriquées à la première utilisation) :
// l’os teinté de la couleur `body`, les points de la couleur `pip` (et la tête cornue du joker)
const kindTextures = new Map();
const kindMaps = (id) => (id ? tintedMaps(id, DIE_KINDS[id]) : dieMaps);
function tintedMaps(id, k) {
  if (!dieFaces) return dieMaps;
  if (!kindTextures.has(id)) {
    const S = dieFaces.colorBase[1].width, color = {}, bump = {};
    for (let v = 1; v <= 6; v++) {
      const cc = makeCanvas(S, S), c = cc.getContext('2d');
      c.drawImage(dieFaces.colorBase[v], 0, 0);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = k.body; c.fillRect(0, 0, S, S);
      c.globalCompositeOperation = 'source-over';
      let b = null;
      if (k.joker) { bump[v] = makeCanvas(S, S); b = bump[v].getContext('2d'); b.drawImage(dieFaces.bumpBase[v], 0, 0); }
      if (v === k.joker) drawHorns(c, b, S, k.pip); else drawPips(c, b, v, S, k.pip);
      color[v] = cc;
    }
    kindTextures.set(id, { map: faceAtlas(null, color, true), bumpMap: k.joker ? faceAtlas(null, bump, false) : dieMaps.bumpMap });
  }
  return kindTextures.get(id);
}
const WHITE = new THREE.Color(1, 1, 1);
function setKind(d, id) {
  if (d.kind === id) return;
  d.kind = id;
  const m = id ? kindMaps(id) : d.base;
  d.mat.map = m.map; d.mat.bumpMap = m.bumpMap;
  // sans faces procédurales (textures personnalisées), le dé spécial est seulement teinté
  d.mat.color.copy(!id ? d.tint : dieFaces ? WHITE : new THREE.Color(DIE_KINDS[id].body));
}
// Les dés spéciaux de chacun sur son jeu : la main du joueur, celle tirée au hasard pour l’adversaire
// (sans mise, tout le monde joue avec des dés ordinaires ; à deux en ligne, seul le choix du maître de la partie compte).
// Les dés ordinaires de l’adversaire ont sa couleur.
export function equipDice(side) {
  const hand = !game.pot && !game.online ? [] : side === 0 ? game.playerHand : game.tavernHand;
  if (side === 1) applyOppLook();
  diceSets[side].forEach((d, i) => setKind(d, hand[i] || null));
}
export function applyOppLook() {
  if (!dieFaces) return;
  const look = tintedMaps(`look-${RULES.opponent}`, OPP().look);
  for (const d of diceSets[1]) { d.base = look; if (!d.kind) { d.mat.map = look.map; d.mat.bumpMap = look.bumpMap; } }
}

export function setInWorld(d, on) {
  if (on && !d.inWorld) { world.addBody(d.body); d.inWorld = true; }
  else if (!on && d.inWorld) { world.removeBody(d.body); d.inWorld = false; }
}
export function placeBodyAtMesh(d) {
  d.body.position.copy(d.mesh.position);
  d.body.quaternion.copy(d.mesh.quaternion);
  d.body.velocity.setZero(); d.body.angularVelocity.setZero();
  d.body.collisionFilterMask = MASK_ALL;
  d.physics = true;
}
export function storeRest(d) {
  d.value = topFace(d.mesh.quaternion).value;
  d.rest = { pos: d.mesh.position.clone(), quat: d.mesh.quaternion.clone() };
}

// Dés disposés sur le plateau pour l’écran d’accueil
export function layoutDiceAtRest() {
  restOnMat(1, false);
  diceSets[0].forEach((d, i) => {
    const x = [-2.6, 0, 2.6][i % 3] + rand(-0.35, 0.35), z = [-1.1, 1.1][(i / 3) | 0] + rand(-0.3, 0.3);
    d.mesh.position.set(x, 0.5, z);
    d.mesh.quaternion.copy(faceUpQuat((Math.random() * 6) | 0, rand(0, Math.PI * 2)));
    placeBodyAtMesh(d); setInWorld(d, true); d.body.sleep(); storeRest(d);
  });
}

// Un dé reposé d’un coup, sans animation, sur la valeur voulue : sur le plateau (reprise d’une partie à deux) ou ailleurs
export function poseDie(d, pos, value, onBoard) {
  if (d.tween) { tweens.delete(d.tween); d.tween.resolve(false); d.tween = null; }
  d.physics = false;
  d.mesh.position.copy(pos);
  d.mesh.quaternion.copy(faceUpQuat(FACES.findIndex((F) => F.v === value), rand(-0.3, 0.3)));
  d.value = value;
  setInWorld(d, false);
  if (onBoard) { placeBodyAtMesh(d); setInWorld(d, true); d.body.sleep(); storeRest(d); }
}

// Les dés d’un joueur qui ne joue pas attendent sur son tapis, un par case
export function restOnMat(side, animate = true) {
  diceSets[side].forEach((d, i) => {
    setInWorld(d, false);
    d.state = 'idle'; d.slot = i; d.side = side; slots[side][i] = d;
    const face = animate ? topFace(d.mesh.quaternion).index : (Math.random() * 6) | 0;
    const pos = reservePos(side, i), quat = faceUpQuat(face, rand(-0.07, 0.07));
    if (animate) moveDie(d, pos, quat, { duration: 420 + i * 40, arc: 1.2 });
    else { d.physics = false; d.mesh.position.copy(pos); d.mesh.quaternion.copy(quat); }
  });
}

// Déplacement animé d’un dé (arc + rotation). Un nouvel ordre annule le précédent.
export function moveDie(d, toPos, toQuat, { duration = 450, arc = 1.2 } = {}) {
  if (d.tween) { tweens.delete(d.tween); d.tween.resolve(false); d.tween = null; }
  d.physics = false;
  const fromPos = d.mesh.position.clone(), fromQuat = d.mesh.quaternion.clone();
  return new Promise((resolve) => {
    const tw = tween({
      duration,
      update: (k) => {
        d.mesh.position.lerpVectors(fromPos, toPos, k);
        d.mesh.position.y += Math.sin(Math.PI * k) * arc;
        d.mesh.quaternion.slerpQuaternions(fromQuat, toQuat, k);
      },
      complete: () => { d.tween = null; resolve(true); },
    });
    tw.resolve = resolve;
    d.tween = tw;
  });
}

// Position de départ d’un lancer, hors écran (+x pour le joueur, −x pour le Tavernier :
// droite/gauche de l’écran sur ordinateur, bas/haut en portrait)
export function spawnPos(side, i) {
  const s = side === 0 ? 1 : -1;
  const col = i % 2, row = (i / 2) | 0;
  return new THREE.Vector3(s * (spawnXs[side] + col * 1.3), 3.2 + rand(0, 0.8), (row - 1) * 1.25 + rand(-0.15, 0.15));
}
