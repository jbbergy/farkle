// Décor de la table : plateau, tapis, bougies, braises, pièces, chopes et poussière.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG, isCoarse, LOW_POWER, TEXTURES } from './config.js';
import { mulberry32, rand, tween, tweens } from './outils.js';
import {
  decorateBoard, generateCoinFace, generateFlame, generateGlow, generateLeather, generateWood
} from './textures.js';
import { buildEnvironment, canvasTex, layout, loadTex, pickTex, scene } from './scene.js';

const candles = [];
export const reserveMats = []; // tapis de cuir : [joueur, Tavernier]
const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.85, roughness: 0.55 });
const waxMat = new THREE.MeshStandardMaterial({ color: 0xeadcbc, roughness: 0.55, emissive: 0x5a2a08, emissiveIntensity: 0.35 });
const wickMat = new THREE.MeshStandardMaterial({ color: 0x0c0806, roughness: 1 });
let flameTex, glowTex, dustTex;

// Échelle des accessoires : un dé mesure 1 unité, soit environ 2 cm. Bougie de 2,4 cm de diamètre
// sur un bougeoir de 6 cm, chope d’étain de 11 cm, pièces de 2,5 cm (comme un gros de Prague).
// La bougie est modelée petite puis agrandie de `size` ; `h` est la hauteur finale de la cire.
function addCandle(x, z, h, { shadow = false, intensity = 22, size = 2.2 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, CONFIG.tableY, z);
  g.scale.setScalar(size);
  h /= size;
  // les pièces d’un même matériau sont fusionnées : bougeoir (coupelle + rebord), cire (bougie + coulures + flaque)
  const iron = new THREE.Mesh(mergeGeometries([
    new THREE.CylinderGeometry(0.62, 0.7, 0.1, 28).translate(0, 0.05, 0),
    new THREE.TorusGeometry(0.64, 0.045, 8, 32).rotateX(Math.PI / 2).translate(0, 0.11, 0),
  ]), ironMat);
  iron.castShadow = iron.receiveShadow = true;
  const waxParts = [new THREE.CylinderGeometry(0.26, 0.29, h, 20).translate(0, 0.1 + h / 2, 0)];
  for (let k = 0; k < 5; k++) {
    const len = rand(0.15, Math.min(0.5, h * 0.6));
    const a = rand(0, Math.PI * 2);
    waxParts.push(new THREE.CapsuleGeometry(0.045, len, 4, 8).translate(Math.cos(a) * 0.27, 0.1 + h - len / 2 - rand(0, 0.15), Math.sin(a) * 0.27));
  }
  waxParts.push(new THREE.CylinderGeometry(0.4, 0.42, 0.04, 20).translate(0, 0.12, 0));
  const wax = new THREE.Mesh(mergeGeometries(waxParts), waxMat);
  wax.castShadow = true;
  g.add(iron, wax);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 6), wickMat);
  wick.position.y = 0.1 + h + 0.08; g.add(wick);
  const flameY = 0.1 + h + 0.32;
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffe2b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  flame.scale.set(0.26, 0.55, 1); flame.position.y = flameY;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a48, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }));
  halo.scale.set(2.2, 2.2, 1); halo.position.y = flameY;
  const light = new THREE.PointLight(0xff8f3a, intensity, 0, 2);
  light.position.y = flameY + 0.1;
  if (shadow && !isCoarse) {
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.003;
    light.shadow.camera.near = 0.3;
  }
  g.add(flame, halo, light);
  // ordinateur : un cœur éclatant et un large halo très doux, comme la lumière qui bave autour d’une flamme dans la pénombre
  // (le téléphone s’en passe : deux grands sprites transparents de plus par bougie)
  let core = null, bloom = null;
  if (!LOW_POWER) {
    core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6b8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6, fog: false }));
    core.scale.set(0.8, 0.8, 1); core.position.y = flameY;
    bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.14, fog: false }));
    bloom.scale.set(4.2, 4.2, 1); bloom.position.y = flameY;
    g.add(core, bloom);
  }
  scene.add(g);
  candles.push({ group: g, flameY, light, flame, halo, core, bloom, base: intensity, phase: rand(0, 100), wander: 1, wanderTarget: 1, timer: 0 });
}
let gust = 0; // coup de vent sur les bougies après un Farkle, de 1 à 0
export function blowCandles() { gust = 1; }
// Les bougies suivent la partie : elles s’embrasent quand le joueur garde un gros tour ou gagne (`flare`, de 1 à 0),
// et baissent pendant le dernier tour (`dusk`, de 0 à 1, voir updateMood dans main.js)
const mood = { flare: 0, glow: 0, dusk: 0, blaze: 0, roar: 0 };
export function flareCandles(k = 1) { mood.flare = Math.max(mood.flare, k); }
// Flambée (trois 1) : les trois bougies montent très haut d’un coup, crachent des étincelles et retombent en deux secondes
const _wick = new THREE.Vector3();
export function blazeCandles() {
  mood.blaze = 1;
  for (const c of candles) {
    c.group.localToWorld(_wick.set(0, c.flameY, 0));
    for (let i = 0; i < (LOW_POWER ? 8 : 14); i++) emitEmber(_wick.x + rand(-0.3, 0.3), _wick.y + rand(0, 1.2), _wick.z + rand(-0.3, 0.3), rand(0, 0.9));
  }
}
export function updateCandles(t, dt, duskOn = false) {
  gust = Math.max(0, gust - dt * 0.55);
  mood.flare = Math.max(0, mood.flare - dt * 0.22);
  mood.glow += (mood.flare - mood.glow) * Math.min(1, dt * 5); // les flammes montent en une fraction de seconde
  mood.dusk += ((duskOn ? 1 : 0) - mood.dusk) * Math.min(1, dt * 1.2);
  mood.blaze = Math.max(0, mood.blaze - dt * 0.5);
  mood.roar += (Math.min(1, mood.blaze * 1.6) - mood.roar) * Math.min(1, dt * 9); // monte presque d’un coup, retombe en douceur
  const lift = (1 + 1.8 * mood.glow) * (1 + 1.6 * mood.roar), dim = 1 - 0.5 * mood.dusk;
  for (const c of candles) {
    c.timer -= dt;
    if (c.timer <= 0) { c.wanderTarget = rand(0.72, 1.1); c.timer = rand(0.05, 0.28); }
    c.wander += (c.wanderTarget - c.wander) * Math.min(1, dt * 9);
    const shiver = gust * (0.4 + 0.25 * Math.sin(t * 31 + c.phase));
    const f = c.wander * (0.93 + 0.05 * Math.sin(t * 9.1 + c.phase) + 0.03 * Math.sin(t * 23.7 + c.phase * 1.7)) * (1 - shiver);
    c.light.intensity = c.base * f * lift * dim;
    const sway = Math.sin(t * 3.1 + c.phase) * 0.02 + Math.sin(t * 7.7 + c.phase) * 0.01 + gust * 0.07 * Math.sin(t * 14 + c.phase);
    // flamme plus haute et plus large quand elle s’embrase, plus petite dans la pénombre
    const tall = (1 + 0.75 * mood.glow) * (1 - 0.25 * mood.dusk) * (1 + 2.6 * mood.roar);
    const fh = (0.42 + 0.14 * f) * tall;
    c.flame.scale.set((0.24 + 0.03 * Math.sin(t * 17 + c.phase)) * (1 + 0.3 * mood.glow) * (1 + 0.6 * mood.roar), fh, 1);
    c.flame.position.y = c.flameY + (fh - 0.5) / 2 * mood.roar; // la flamme haute s’élève au-dessus de la mèche
    c.flame.position.x = sway;
    c.halo.material.opacity = (0.3 + 0.25 * f) * (1 + 0.6 * mood.glow) * dim;
    c.halo.scale.setScalar(2.2 * (1 + 0.35 * mood.glow) * (1 + 0.8 * mood.roar));
    if (c.core) { c.core.material.opacity = (0.35 + 0.3 * f) * (1 + 0.4 * mood.glow) * dim; c.core.position.x = sway; }
    if (c.bloom) c.bloom.material.opacity = (0.08 + 0.07 * f) * (1 + 1.2 * mood.glow) * dim;
    c.light.position.x = sway * 4;
  }
  return mood;
}

// Braises qui s’envolent des dés brûlants : quelques sprites réutilisés
const EMBER = { life: [0.9, 1.7], size: [0.6, 0.18], rise: [1.8, 3], drift: 0.7 };
const embers = [], emberPool = [];
function emitEmber(x, y, z, delay = 0) {
  let s = emberPool.pop();
  if (!s) {
    s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xffa040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    scene.add(s);
  }
  s.visible = false;
  s.position.set(x, y, z);
  const k = EMBER;
  s.userData.p = { age: -delay, life: rand(...k.life), vx: rand(-k.drift, k.drift), vy: rand(...k.rise), vz: rand(-k.drift, k.drift), phase: rand(0, 9) };
  embers.push(s);
}
export function updateEmbers(dt) {
  const k = EMBER;
  for (let i = embers.length - 1; i >= 0; i--) {
    const s = embers[i], p = s.userData.p;
    p.age += dt;
    if (p.age < 0) continue;
    const u = p.age / p.life;
    if (u >= 1) { s.visible = false; embers.splice(i, 1); emberPool.push(s); continue; }
    s.visible = true;
    s.position.x += (p.vx + Math.sin(p.age * 3 + p.phase) * k.drift * 0.6) * dt;
    s.position.y += p.vy * dt;
    s.position.z += p.vz * dt;
    const size = k.size[0] + (k.size[1] - k.size[0]) * u;
    s.scale.set(size, size, 1);
    // apparition rapide, extinction lente, en vacillant
    s.material.opacity = Math.min(1, u * 6) * (1 - u) * (0.6 + 0.4 * Math.sin(p.age * 25 + p.phase));
  }
}
// Dés brûlants : les six dés rougeoient et des braises s’en envolent avant qu’ils repartent ;
// `blaze` (événements de la table) : une gerbe bien plus fournie, et tout le plateau crache des braises
export function hotFx(list, blaze = false) {
  const n = (LOW_POWER ? 5 : 9) * (blaze ? 2.5 : 1);
  for (const d of list) {
    d.heat = 1;
    const p = d.mesh.position;
    for (let i = 0; i < n; i++) emitEmber(p.x + rand(-0.4, 0.4), p.y + rand(0, 0.4), p.z + rand(-0.4, 0.4), rand(0, 0.8));
  }
  if (blaze) for (let i = 0; i < (LOW_POWER ? 45 : 90); i++) emitEmber(rand(-7, 7), rand(0, 0.3), rand(-4.6, 4.6), rand(0, 1.3));
}

// Bourse de pièces, renvoyée en groupe pour être placée selon la mise en page (placeSideProps)
const STACK = 5; // les premières pièces forment une pile, les autres sont éparpillées autour
function addCoins(count, seed) {
  const g = new THREE.Group();
  const rng = mulberry32(seed);
  const faceBump = canvasTex(generateCoinFace(), false);
  // toutes les pièces de la bourse en un seul objet instancié ; chacune porte sa teinte (argent ou cuivre),
  // la tranche est un peu plus sombre que les faces
  const edge = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 1, roughness: 0.4, envMapIntensity: 1.15 });
  const face = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.45, bumpMap: faceBump, bumpScale: 2, envMapIntensity: 1.15 });
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 32), [edge, face, face], count);
  const silver = new THREE.Color(0xc9c2b5), copper = new THREE.Color(0xb06a3e), o = new THREE.Object3D();
  const rest = []; // place de chaque pièce, pour la faire sauter quand on tape sur la table (bangTable)
  for (let i = 0; i < count; i++) {
    const isCopper = rng() < 0.3;
    if (i < STACK) o.position.set((rng() - 0.5) * 0.15, CONFIG.tableY + 0.04 + i * 0.085, (rng() - 0.5) * 0.15);
    else { const a = rng() * Math.PI * 2, r = 0.9 + rng() * 0.9; o.position.set(Math.cos(a) * r, CONFIG.tableY + 0.04, Math.sin(a) * r * 0.7); }
    o.rotation.y = rng() * Math.PI;
    o.updateMatrix();
    rest.push({ pos: o.position.clone(), yaw: o.rotation.y });
    coins.setMatrixAt(i, o.matrix);
    coins.setColorAt(i, isCopper ? copper : silver);
  }
  coins.castShadow = coins.receiveShadow = true;
  g.userData.pile = { coins, rest };
  g.add(coins);
  scene.add(g);
  return g;
}

// Chope de bière, renvoyée en groupe pour être placée selon la mise en page (placeSideProps).
// Modelée petite puis agrandie de TANKARD_SCALE ; son pied (rayon 0,62 à 0,66) laisse les auréoles du bois.
const TANKARD_SCALE = 2.8;
export const TANKARD_FOOT = 0.64 * TANKARD_SCALE;
function addTankard() {
  const pewter = new THREE.MeshStandardMaterial({ color: 0xa9a499, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide, envMapIntensity: 1.7 });
  // profil (rayon, hauteur) d’une chope d’environ 11 cm de haut pour 7,5 cm de large, une fois agrandie
  const pts = [[0, 0], [0.62, 0], [0.66, 0.08], [0.6, 0.2], [0.56, 0.31], [0.54, 1.75], [0.6, 1.85], [0.62, 1.96], [0.57, 2], [0.5, 1.92], [0.5, 0.45], [0, 0.45]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.Group();
  // corps et anse d’un seul tenant
  const body = new THREE.Mesh(mergeGeometries([
    new THREE.LatheGeometry(pts, 40),
    new THREE.TorusGeometry(0.5, 0.07, 10, 24, Math.PI).rotateZ(-Math.PI / 2).translate(0.55, 1.1, 0),
  ]), pewter);
  body.castShadow = body.receiveShadow = true;
  // mousse de bière : c’est elle qu’on voit d’en haut
  const foam = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshStandardMaterial({ color: 0xe8d3a2, roughness: 0.95 }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = 1.7;
  g.add(body, foam);
  g.scale.setScalar(TANKARD_SCALE);
  scene.add(g);
  return g;
}

// Chaque joueur a sa chope et sa bourse, de son côté de la table. Positions du joueur
// (le Tavernier est à l’opposé, par symétrie centrale) : [x, z, orientation de l’anse] et [x, z].
// Rien sur le passage des lancers (|z| < 3 au-delà du plateau), ni sur le plateau ou les tapis de réserve.
const SIDE_PROPS = {
  landscape: { tankard: [6.9, 6.7, -Math.PI / 4], coins: [-7.2, 6.8] },  // joueur en bas (+z), chope près de la bougie
  portrait: { tankard: [6.4, 6.75, Math.PI / 4], coins: [7.0, -6.4] },     // joueur en bas (+x)
};
const sideProps = []; // [joueur, Tavernier] : { tankard, coins }
export function placeSideProps() {
  const p = SIDE_PROPS[layout === 'portrait' ? 'portrait' : 'landscape'];
  sideProps.forEach(({ tankard, coins }, i) => {
    const s = i === 0 ? 1 : -1;
    tankard.position.set(s * p.tankard[0], CONFIG.tableY, s * p.tankard[1]);
    tankard.rotation.y = p.tankard[2] + (i ? Math.PI : 0);
    coins.position.set(s * p.coins[0], 0, s * p.coins[1]);
  });
}

// Coup de genou sous la table (lancer exceptionnel, victoire) : les chopes et les pièces des bourses sautent
// et retombent avec un petit rebond, en penchant un peu, et les bougies tremblent. Les dés ne bougent pas.
// hopAt(s) : hauteur relative au temps s (0 à 1) : un saut sur 60 % du temps, puis un rebond quatre fois plus bas
const hopAt = (s) => (s < 0.6 ? 4 * (s / 0.6) * (1 - s / 0.6) : 4 * ((s - 0.6) / 0.4) * (1 - (s - 0.6) / 0.4) / 4);
const _coin = new THREE.Object3D();
export function bangTable(k = 1) {
  gust = Math.max(gust, 0.3 * k);
  sideProps.forEach(({ tankard, coins }, i) => {
    if (tankard.userData.hop) tweens.delete(tankard.userData.hop);
    const h = rand(0.8, 1) * k, delay = i * rand(0.03, 0.08), lean = [rand(-0.14, 0.14) * k, rand(-0.14, 0.14) * k];
    const T = 0.62 + delay;
    tankard.userData.hop = tween({
      duration: T * 1000, ease: (x) => x,
      update: (u) => {
        const s = Math.max(0, (u * T - delay) / (T - delay)), tilt = Math.sin(Math.PI * s) * (1 - s);
        tankard.position.y = CONFIG.tableY + h * hopAt(s);
        tankard.rotation.x = lean[0] * tilt; tankard.rotation.z = lean[1] * tilt;
      },
      complete: () => { tankard.position.y = CONFIG.tableY; tankard.rotation.x = tankard.rotation.z = 0; tankard.userData.hop = null; },
    });
    // les pièces, plus légères, sautent moins haut et moins longtemps, chacune un peu à sa façon
    const { coins: mesh, rest } = coins.userData.pile;
    if (coins.userData.hop) tweens.delete(coins.userData.hop);
    // (la pile saute d’un bloc, chaque pièce un rien plus haut que celle du dessous, pour ne pas se traverser)
    const stack = { h: rand(0.25, 0.4) * k, delay: rand(0, 0.04), len: rand(0.38, 0.44) };
    const jumps = rest.map((r, j) => (j < STACK
      ? { ...stack, h: stack.h + j * 0.03 * k, tilt: [rand(-0.1, 0.1) * k, rand(-0.1, 0.1) * k] }
      : { h: rand(0.25, 0.55) * k, delay: rand(0, 0.07), len: rand(0.36, 0.46), tilt: [rand(-0.35, 0.35) * k, rand(-0.35, 0.35) * k] }));
    const place = (u) => {
      rest.forEach((r, j) => {
        const J = jumps[j], s = Math.min(1, Math.max(0, (u * 0.55 - J.delay) / J.len)), tilt = Math.sin(Math.PI * s) * (1 - s);
        _coin.position.copy(r.pos); _coin.position.y += J.h * hopAt(s);
        _coin.rotation.set(J.tilt[0] * tilt, r.yaw, J.tilt[1] * tilt);
        _coin.updateMatrix();
        mesh.setMatrixAt(j, _coin.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    coins.userData.hop = tween({ duration: 550, ease: (x) => x, update: place, complete: () => { place(1); coins.userData.hop = null; } });
  });
}

let dust;
function addDust() {
  const n = 140, pos = new Float32Array(n * 3), seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-11, 11); pos[i * 3 + 1] = rand(0.5, 8); pos[i * 3 + 2] = rand(-8, 8); seeds[i] = rand(0, 100); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.06, map: dustTex, color: 0xffcf96, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  dust = new THREE.Points(geo, mat);
  dust.userData.seeds = seeds;
  scene.add(dust);
}
export function updateDust(t, dt) {
  if (!dust) return;
  const p = dust.geometry.attributes.position, s = dust.userData.seeds;
  for (let i = 0; i < s.length; i++) {
    let y = p.getY(i) + dt * (0.06 + 0.04 * Math.sin(s[i]));
    if (y > 8.5) y = 0.4;
    p.setXYZ(i, p.getX(i) + Math.sin(t * 0.3 + s[i]) * dt * 0.08, y, p.getZ(i) + Math.cos(t * 0.25 + s[i]) * dt * 0.06);
  }
  p.needsUpdate = true;
}

export function buildWorld() {
  scene.environment = buildEnvironment();
  flameTex = canvasTex(generateFlame(), true);
  glowTex = canvasTex(generateGlow(), true);
  dustTex = canvasTex(generateGlow('rgba(255,220,170,1)'), true);
  // bois procéduraux en 1024 px sur téléphone : quatre fois moins de calcul au chargement et de mémoire graphique
  const TEX = LOW_POWER ? 1024 : 2048;

  // Table (planches sombres, veinage perpendiculaire au plateau) : une texture carrée sur 40 × 48 unités
  const [TW, TD] = [40, 48];
  const tableW = (!TEXTURES.tableColor || !TEXTURES.tableBump) ? generateWood({
    w: TEX, h: TEX, planks: 7, seed: 11, grain: 12, scratches: 520, stains: 6, burns: 4, edgeShade: 0, fineLines: 120,
    ring: [TANKARD_FOOT * TEX / TW, TANKARD_FOOT * TEX / TD],
    base: [60, 39, 24], dark: [26, 15, 8], light: [88, 60, 38],
  }) : {};
  const tableMat = new THREE.MeshStandardMaterial({
    map: pickTex(TEXTURES.tableColor, tableW.color, true),
    bumpMap: pickTex(TEXTURES.tableBump, tableW.bump, false), bumpScale: 2.5,
    normalMap: TEXTURES.tableNormal ? loadTex(TEXTURES.tableNormal, false) : null,
    roughness: 0.86, metalness: 0, envMapIntensity: 0.3,
  });
  tableMat.color.setScalar(0.62); // table plus sombre que le plateau, qui se détache mieux
  const tableGeo = new THREE.PlaneGeometry(TW, TD);
  tableGeo.rotateX(-Math.PI / 2);
  tableGeo.rotateY(Math.PI / 2);
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.y = CONFIG.tableY;
  table.receiveShadow = true;
  scene.add(table);

  // Plateau de chêne sombre
  const { w: BW, d: BD, h: BH } = CONFIG.board;
  const boardW = (!TEXTURES.boardColor || !TEXTURES.boardBump) ? generateWood({
    w: TEX, h: Math.round(TEX * BD / BW / 2) * 2, planks: 3, seed: 5, grain: 9, scratches: 380, stains: 0, burns: 1,
    edgeShade: 0.55, fineLines: 170, decorate: decorateBoard,
    base: [84, 52, 30], dark: [36, 20, 10], light: [118, 78, 46],
  }) : {};
  const boardMat = new THREE.MeshStandardMaterial({
    map: pickTex(TEXTURES.boardColor, boardW.color, true),
    bumpMap: pickTex(TEXTURES.boardBump, boardW.bump, false), bumpScale: 3,
    normalMap: TEXTURES.boardNormal ? loadTex(TEXTURES.boardNormal, false) : null,
    roughnessMap: TEXTURES.boardRoughness ? loadTex(TEXTURES.boardRoughness, false) : null,
    roughness: 0.68, metalness: 0, envMapIntensity: 0.45,
  });
  const board = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 3, 0.16), boardMat);
  board.position.y = -BH / 2;
  board.castShadow = board.receiveShadow = true;
  scene.add(board);

  // Tapis de cuir des réserves (bas = joueur, haut = Tavernier)
  const leather = generateLeather(21);
  const leatherMat = new THREE.MeshStandardMaterial({ map: canvasTex(leather.color, true), bumpMap: canvasTex(leather.bump, false), bumpScale: 2, roughness: 0.78, envMapIntensity: 0.3 });
  for (const s of [1, -1]) {
    const mat = new THREE.Mesh(new RoundedBoxGeometry(9.6, 0.05, 1.55, 2, 0.02), leatherMat);
    mat.position.set(0, CONFIG.tableY + 0.025, s * CONFIG.reserveZ);
    mat.receiveShadow = true;
    scene.add(mat);
    reserveMats.push(mat);
  }

  // Bougies dans les coins de la table : rien sur le passage des lancers (|z| < 3 au-delà du plateau),
  // ni sur les tapis de réserve, quelle que soit la mise en page
  addCandle(-10.8, -6.2, 4.4, { shadow: true, intensity: 40 });
  addCandle(10.8, 6.0, 3.0, { shadow: true, intensity: 22 });
  addCandle(10.6, -6.4, 1.7, { intensity: 20 });
  for (const seed of [3, 4]) sideProps.push({ tankard: addTankard(), coins: addCoins(8, seed) });
  placeSideProps();
  addDust();
}
