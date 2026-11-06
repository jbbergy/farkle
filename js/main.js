// Point d’entrée : boucle d’animation, mise en route du jeu et accès de débogage (FarkleDebug).

import * as THREE from 'three';
import { LOW_POWER, RULES } from './config.js';
import { $, tweens, updateTweens } from './outils.js';
import { DIE_KINDS, faceValue } from './des-speciaux.js';
import { OPPONENTS } from './adversaires.js';
import { saveWallet, wallet } from './bourse.js';
import { OPP_TALK, TALK } from './repliques.js';
import {
  _look, adaptResolution, applyLayout, camDir, camDist, camera, camTarget, layout, renderer, scene, setRoomLight,
  updateShadowMap, view
} from './scene.js';
import { buildWorld, hotFx, updateCandles, updateDust, updateEmbers } from './decor.js';
import { world } from './physique.js';
import { initEvents, testBug, testEvent, updateEvents } from './evenements.js';
import { allDice, applyOppLook, createDice, dice, diceSets, equipDice, layoutDiceAtRest } from './des.js';
import { replayJob, sim, throwDice, updateReplay } from './lancer.js';
import { countValues, enumerateSubsets, hasScore, scoreAll } from './regles.js';
import { carnet, unlock } from './carnet.js';
import { game, house, toggleDie } from './partie.js';
import { aiChoose } from './ia.js';
import { audio, hushRoom } from './sons.js';
import { chooseLine, crowdLines, pickLine, react, say, talk } from './voix.js';
import { frameDice } from './cadrage.js';
import { initInput, kb, screenOf, touches, updateDieTip, updateGlow, updateHover } from './entrees.js';
import { bakeParchmentNoise } from './ui/parchemin.js';
import { updateScoresDisplay, updateUI } from './ui/hud.js';
import { initRules } from './ui/page-regles.js';
import { initShop } from './ui/echoppe.js';
import { initCarnet } from './ui/page-carnet.js';
import { initMenu, renderMenu } from './ui/menu.js';
import { initSettings } from './ui/reglages.js';
import { initOnlinePage } from './ui/page-en-ligne.js';
import { couperConnexion, initEnLigne, table as onlineTable } from './en-ligne.js';

const clock = new THREE.Clock();
let elapsed = 0, lastFrame = 0;
// Quelque chose bouge-t-il ? (dés lancés ou déplacés, doigts sur l’écran, zoom en cours)
const sceneBusy = () => replayJob !== null || tweens.size > 0 || touches.size > 0 ||
  Math.abs(view.targetZoom - view.zoom) > 1e-3 || view.pan.distanceToSquared(view.targetPan) > 1e-6;
// Sur téléphone : 60 images/s au plus quand ça bouge, 30 quand la table est au repos (bougies, poussière),
// ce qui suffit à l’œil et laisse souffler le processeur graphique (et la batterie)
function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  const busy = sceneBusy();
  const interval = LOW_POWER ? (busy ? 1000 / 60 : 1000 / 30) : 0;
  if (now - lastFrame < interval - 3) return; // marge : les images de l’écran ne tombent pas pile
  const delta = now - lastFrame;
  lastFrame = now;
  update(Math.min(clock.getDelta(), 1 / 20));
  if (LOW_POWER) updateShadowMap(busy || sceneBusy());
  renderer.render(scene, camera);
  adaptResolution(delta, LOW_POWER ? interval : 1000 / 60);
}
// Dernier tour : celui qui doit rattraper l’autre joue dans la pénombre, la salle retient son souffle
let hushed = false;
function updateMood(dt) {
  const dusk = game.finalFrom !== null && game.current !== game.finalFrom && game.phase !== 'over' && game.phase !== 'menu';
  if (dusk !== hushed) { hushed = dusk; hushRoom(dusk); }
  setRoomLight(updateCandles(elapsed, dt, dusk));
}
function update(dt) {
  elapsed += dt;
  if (!sim) world.step(1 / 120, dt, 8); // pendant le calcul d’un lancer, c’est lui qui fait avancer la physique
  for (const d of allDice) if (d.physics) { d.mesh.position.copy(d.body.position); d.mesh.quaternion.copy(d.body.quaternion); }
  updateReplay(dt);
  updateTweens(dt);
  updateMood(dt);
  updateDust(elapsed, dt);
  updateEmbers(dt);
  const shake = updateEvents(dt);
  updateHover();
  updateDieTip();
  updateGlow(elapsed, dt);
  updateScoresDisplay(dt);
  // zoom du joueur ou cadrage automatique, lissé
  const k = Math.min(1, dt * view.ease);
  view.zoom += (view.targetZoom - view.zoom) * k;
  view.pan.lerp(view.targetPan, k);
  if (Math.abs(camera.zoom - view.zoom) > 1e-4) { camera.zoom = view.zoom; camera.updateProjectionMatrix(); }
  // respiration très légère de la caméra
  _look.copy(camTarget).add(view.pan);
  camera.position.copy(_look).addScaledVector(camDir, camDist);
  camera.position.x += Math.sin(elapsed * 0.21) * 0.07;
  camera.position.z += Math.sin(elapsed * 0.17) * 0.05;
  camera.position.add(shake); // la table tremble (événements de la table)
  camera.lookAt(_look);
}

// Mise en route : les commandes et les fenêtres, puis la table, les dés et la première image
initInput();
initMenu();
initShop();
initCarnet();
initRules();
initSettings();
initEnLigne();
initOnlinePage();
addEventListener('resize', applyLayout);

buildWorld();
initEvents();
createDice();
applyOppLook();
layoutDiceAtRest();
applyLayout();
if (document.fonts) document.fonts.ready.then(applyLayout); // la taille des panneaux dépend des polices
bakeParchmentNoise();
updateUI();
frame();
const loadingEl = $('loading');
requestAnimationFrame(() => loadingEl.classList.add('done'));
setTimeout(() => loadingEl.remove(), 1200);

// Application installable et jeu hors connexion : le service worker garde la page, ses bibliothèques et ses sons
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* sans service worker, le jeu marche en ligne */ });

// Accès console pour le débogage
window.FarkleDebug = {
  game, dice, allDice, diceSets, RULES, scoreAll, enumerateSubsets, hasScore, audio, kb, view, camera, renderer, talk, say, pickLine, react,
  onlineTable, coupure: couperConnexion, wallet, DIE_KINDS, faceValue, equipDice, saveWallet, renderMenu, carnet, unlock, house, OPPONENTS, TALK, OPP_TALK, crowdLines, chooseLine,
  replay: () => replayJob, throwDice, hotFx, frameDice,
  // événements de la table : event('grace' | 'aube' | 'tremblement' | 'hot', n), bug()
  event: testEvent, bug: testBug,
  layout: () => layout,
  // position écran (px CSS) d’un dé, pour tester les clics
  screenOf: (i) => screenOf(dice[i]),
  // met de côté, pour le joueur, ce que l’IA choisirait
  pickBest() {
    const table = dice.filter((d) => d.state === 'table'), need = aiChoose(countValues(table), table.length).counts.slice();
    for (const d of table) if (need[faceValue(d)] > 0) { need[faceValue(d)]--; toggleDie(d); }
  },
  // fait avancer la simulation de `seconds` à pas fixe (utile quand l’onglet est en arrière-plan)
  advance(seconds) { for (let t = 0; t < seconds; t += 1 / 60) update(1 / 60); renderer.render(scene, camera); },
};
