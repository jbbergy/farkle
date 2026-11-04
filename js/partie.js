// Déroulement d’une partie : tours, lancers, Farkle, points gardés, fin de partie et règles de la maison.

import * as THREE from 'three';
import { CONFIG, RULES } from './config.js';
import { $, rand, sleep } from './outils.js';
import { faceValue } from './des-speciaux.js';
import { OPP, pickTavernHand } from './adversaires.js';
import { CREDIT, MIN_STAKE, saveWallet, wallet } from './bourse.js';
import { layout } from './scene.js';
import { blowCandles, hotFx } from './decor.js';
import {
  dice, equipDice, faceUpQuat, moveDie, placeBodyAtMesh, restOnMat, setInWorld, topFace, useSet
} from './des.js';
import { cancelReplay, throwDice } from './lancer.js';
import { clickableValues, countValues, hasScore, scoreAll } from './regles.js';
import { carnet, noteParts, noteResult, saveCarnet, unlock } from './carnet.js';
import { clearMatch, saveMatch, setPendingMatch } from './sauvegarde.js';
import { aiTurn } from './ia.js';
import { sfxCoins, sfxDefeat, sfxFarkle, sfxHot, sfxPlace, sfxVictory } from './sons.js';
import { commentRoll, loadOppVoices, nag, playerActed, react } from './voix.js';
import { frameDice, unframe } from './cadrage.js';
import { dieTip, focusFirst, kb } from './entrees.js';
import { fitModal } from './ui/parchemin.js';
import { el, toast, updateUI } from './ui/hud.js';
import { backToMenu } from './ui/menu.js';

export const game = { phase: 'menu', current: 0, scores: [0, 0], turnScore: 0, token: 0, clickable: new Set(), aiStatus: '', pot: 0, lastResult: null, playerHand: [], tavernHand: [],
  // starter : qui a ouvert la partie ; finalFrom : qui a atteint l’objectif le premier (l’autre joue alors son dernier tour)
  starter: 0, turns: 0, finalFrom: null, house: {}, opened: [true, true], farkleRun: [0, 0],
  // pour les hauts faits : Farkles du joueur et plus gros retard de la partie, dés brûlants du tour en cours
  trace: { farkles: 0, deficit: 0 }, hotTurn: 0 };

// ─── Règles de la maison (réglages, valables dès la partie suivante) ───
// ouverture : il faut garder au moins 500 points en un tour pour inscrire son premier score ;
// troisFarkles : trois Farkles d’affilée coûtent 500 points
export const OPENING = 500, FARKLE_FINE = 500;
export const house = { ouverture: false, troisFarkles: false };
try { const saved = JSON.parse(localStorage.getItem('farkle.maison')); for (const k in house) house[k] = !!(saved && saved[k]); } catch { /* règles ordinaires */ }
export function saveHouse() { try { localStorage.setItem('farkle.maison', JSON.stringify(house)); } catch { /* stockage indisponible */ } }
// Garder est-il permis avec `total` points dans le tour ? Sinon, la raison : 'final' (dernier tour, il faut dépasser
// l’autre) ou 'opening' (score pas encore ouvert)
export function bankBlock(who, total) {
  if (game.finalFrom !== null && game.scores[who] + total <= game.scores[1 - who]) return 'final';
  if (game.house.ouverture && !game.opened[who] && total < OPENING) return 'opening';
  return null;
}

export const shownScores = [0, 0];
export const slots = [Array(6).fill(null), Array(6).fill(null)];

const pendingDice = () => dice.filter((d) => d.state === 'pending');
export function selectionInfo() {
  const pend = pendingDice();
  const r = pend.length ? scoreAll(countValues(pend)) : null;
  return { count: pend.length, valid: !!r && r.score > 0, score: r ? r.score : 0, parts: r ? r.parts : [] };
}
export function reservePos(side, slot) {
  const s = side === 0 ? 1 : -1, y = CONFIG.tableY + 0.05 + 0.5;
  if (layout === 'portrait') return new THREE.Vector3(s * CONFIG.reserveX, y, 3.75 - slot * 1.5);
  return new THREE.Vector3(-3.75 + slot * 1.5, y, s * CONFIG.reserveZ);
}
export function canSelect(d) {
  return game.current === 0 && game.phase === 'choosing' &&
    (d.state === 'pending' || (d.state === 'table' && game.clickable.has(faceValue(d))));
}
export function setAside(d) {
  const side = game.current;
  const slot = slots[side].indexOf(null);
  d.state = 'pending'; d.slot = slot; d.side = side; slots[side][slot] = d;
  setInWorld(d, false);
  frameDice();
  const q = faceUpQuat(topFace(d.mesh.quaternion).index, rand(-0.07, 0.07));
  return moveDie(d, reservePos(side, slot), q, { duration: 430, arc: 1.4 }).then((done) => {
    if (done) sfxPlace('leather');
    return done;
  });
}
function returnToBoard(d) {
  slots[d.side][d.slot] = null;
  d.slot = -1; d.state = 'table';
  frameDice();
  return moveDie(d, d.rest.pos, d.rest.quat, { duration: 380, arc: 1.1 }).then((done) => {
    if (done) sfxPlace('wood');
    if (done && d.state === 'table') { placeBodyAtMesh(d); setInWorld(d, true); d.body.sleep(); }
  });
}
export function toggleDie(d) {
  if (d.state === 'pending') returnToBoard(d); else setAside(d);
  if (d.kind) { dieTip.flash = d; dieTip.until = performance.now() + 2200; }
  updateUI();
}

// Nouvelle partie, ou reprise de la partie interrompue (`resume`, voir saveMatch)
export function startGame(resume = null) {
  if (resume) {
    RULES.target = resume.target; RULES.opponent = resume.opponent;
    game.pot = resume.pot; game.scores = resume.scores.slice();
    game.playerHand = resume.playerHand; game.tavernHand = resume.tavernHand;
    game.starter = resume.starter; game.turns = resume.turns; game.finalFrom = resume.finalFrom;
    game.house = resume.house; game.opened = resume.opened.slice(); game.farkleRun = resume.farkleRun.slice();
    game.trace = { ...resume.trace };
  } else {
    // la mise sort de la bourse, le Tavernier en met autant ; trop peu de groschens : retour au menu
    if (wallet.purse < RULES.stake) { backToMenu(); return; }
    wallet.purse -= RULES.stake;
    saveWallet();
    game.pot = RULES.stake * 2;
    game.scores = [0, 0];
    game.playerHand = game.pot ? wallet.hand.slice() : [];
    game.tavernHand = game.pot ? pickTavernHand(RULES.stake) : [];
    // chacun son tour d’ouvrir la partie
    game.starter = 1 - carnet.starter; carnet.starter = game.starter; saveCarnet();
    game.turns = 0; game.finalFrom = null;
    game.house = { ...house }; game.opened = [!house.ouverture, !house.ouverture]; game.farkleRun = [0, 0];
    game.trace = { farkles: 0, deficit: 0 };
  }
  setPendingMatch(null);
  game.token++;
  cancelReplay();
  shownScores[0] = game.scores[0]; shownScores[1] = game.scores[1];
  el.scores.forEach((s, i) => { s.textContent = game.scores[i]; }); // l’affichage animé ne bouge qu’au prochain changement de score
  $('target-label').textContent = RULES.target;
  document.querySelector('#row-1 .who').innerHTML = OPP().row;
  $('pot-label').textContent = game.pot ? `Pot : ${game.pot} groschens` : 'Pour l’honneur';
  equipDice(0); equipDice(1);
  $('menu').classList.add('hidden'); $('gameover').classList.add('hidden'); $('hud').classList.remove('hidden');
  document.body.dataset.screen = 'game';
  beginTurn(resume ? resume.current : game.starter);
  // l’adversaire salue (une nouvelle partie), une fois ses répliques chargées
  const tk = game.token;
  loadOppVoices().then(() => { if (!resume && tk === game.token) react('debut', 0.8, 400); });
}
function beginTurn(p) {
  game.current = p; game.turnScore = 0; game.phase = 'idle'; game.clickable = new Set(); game.aiStatus = '';
  game.turns++; game.hotTurn = 0;
  nag.count = 0; playerActed();
  saveMatch();
  // les dés de l’autre retournent sur son tapis ; ceux du lanceur partiront de là où ils sont
  // (ils gardent leur case jusqu’au lancer, pour suivre leur tapis si l’écran tourne)
  useSet(p);
  slots[p].fill(null);
  for (const d of dice) d.state = 'table';
  restOnMat(1 - p);
  unframe();
  updateUI();
  if (p === 1) aiTurn();
  else if (game.finalFrom !== null) { toast('Ton dernier tour', `Il te faut plus de ${game.scores[1] - game.scores[0]} points`, 'hot', 2200); sfxHot(); }
  else toast(game.turns === 1 ? 'À toi de commencer' : 'À toi de jouer', '', 'info', 1100);
}
function endTurn() { beginTurn(1 - game.current); }

export async function rollAction() {
  const tk = game.token;
  if (game.phase === 'choosing') {
    const sel = selectionInfo();
    if (!sel.valid) return null;
    game.turnScore += sel.score;
    pendingDice().forEach((d) => { d.state = 'locked'; });
    noteParts(sel.parts);
  } else if (game.phase !== 'idle') return null;
  game.phase = 'rolling';
  game.clickable = new Set();
  let toThrow = dice.filter((d) => d.state === 'table');
  if (toThrow.length === 0) {
    // Dés brûlants : les six reviennent en jeu, les points du tour sont conservés
    slots[game.current].fill(null);
    for (const d of dice) { d.state = 'table'; d.slot = -1; }
    toThrow = dice.slice();
    toast('Dés brûlants !', 'Les six dés reviennent en jeu', 'hot', 1500);
    sfxHot();
    hotFx(dice);
    if (game.current === 0) {
      carnet.hot++; game.hotTurn++; saveCarnet();
      unlock('brulants');
      if (game.hotTurn >= 2) unlock('forge');
    }
    react('des_brulants', 0.85, 900, game.current === 0 ? 'jaloux' : 'beau_coup');
    updateUI();
    await sleep(1000);
    if (tk !== game.token) return null;
  }
  updateUI();
  unframe();
  const ok = await throwDice(toThrow, game.current);
  if (!ok || tk !== game.token) return null;
  frameDice();
  const counts = countValues(toThrow);
  if (!hasScore(counts)) { await farkle(); return 'farkle'; }
  if (game.current === 0 && toThrow.length === 1) unlock('tete_brulee');
  commentRoll(counts, toThrow.length);
  game.phase = 'choosing';
  game.clickable = clickableValues(counts);
  if (game.current === 0 && kb.active) focusFirst();
  updateUI();
  return 'ok';
}

async function farkle() {
  const tk = game.token;
  game.phase = 'farkle';
  const lost = game.turnScore;
  game.turnScore = 0;
  toast('Farkle !', lost ? `${lost} points perdus` : 'Aucun dé ne rapporte', 'farkle', 2000);
  sfxFarkle();
  blowCandles(); // les bougies vacillent
  const who = game.current, me = who === 0;
  if (lost >= 500) react(me ? 'pot_perdu_toi' : 'pot_perdu_tavernier', 0.9, 1100);
  else react(me ? 'farkle_toi' : 'farkle_tavernier', 1, 1100);
  game.farkleRun[who]++;
  if (me) {
    carnet.farkles++; game.trace.farkles++; saveCarnet();
    if (game.farkleRun[0] >= 3) unlock('jour_sans');
  }
  updateUI();
  await sleep(2400);
  if (tk !== game.token) return;
  // dernier tour manqué : celui qui a atteint l’objectif l’emporte
  if (game.finalFrom !== null) { gameOver(game.finalFrom); return; }
  if (game.house.troisFarkles && game.farkleRun[who] >= 3) {
    game.farkleRun[who] = 0;
    const fine = Math.min(FARKLE_FINE, game.scores[who]);
    game.scores[who] -= fine;
    toast('Trois Farkles !', fine ? `${me ? 'Tu perds' : `${CONFIG.ai} perd`} ${fine} points` : 'Heureusement, il n’y avait rien à perdre', 'farkle', 2000);
    sfxFarkle();
    updateUI();
    await sleep(2300);
    if (tk !== game.token) return;
  }
  endTurn();
}

export async function bankAction() {
  if (game.phase !== 'choosing') return;
  const sel = selectionInfo();
  if (!sel.valid) return;
  const tk = game.token, who = game.current;
  if (bankBlock(who, game.turnScore + sel.score)) return;
  game.phase = 'banking';
  game.turnScore += sel.score;
  pendingDice().forEach((d) => { d.state = 'locked'; });
  const gained = game.turnScore;
  game.scores[who] += gained;
  game.turnScore = 0;
  game.opened[who] = true; game.farkleRun[who] = 0;
  game.trace.deficit = Math.max(game.trace.deficit, game.scores[1] - game.scores[0]);
  if (who === 0) {
    noteParts(sel.parts);
    carnet.bestTurn = Math.max(carnet.bestTurn, gained); saveCarnet();
    if (gained >= 1000) unlock('mille');
    if (gained >= 2500) unlock('grand_tour');
  }
  toast(`+${gained}`, who === 0 ? 'Points mis à l’abri' : `${CONFIG.ai} empoche ses points`, 'bank', 1400);
  sfxCoins();
  if (gained >= 1000 && game.scores[who] < RULES.target) react(who === 0 ? 'grosse_mise_toi' : 'grosse_mise_tavernier', 0.75, 900);
  updateUI();
  // dernier tour réussi : il a dépassé celui qui avait atteint l’objectif
  if (game.finalFrom !== null) {
    await sleep(1400);
    if (tk === game.token) gameOver(who);
    return;
  }
  // objectif atteint : l’autre a droit à un dernier tour pour le dépasser
  if (game.scores[who] >= RULES.target) game.finalFrom = who;
  await sleep(1600);
  if (tk !== game.token) return;
  endTurn();
}

function gameOver(winner) {
  game.phase = 'over';
  updateUI();
  const [me, him] = game.scores;
  let money = !game.pot ? 'Partie pour l’honneur : rien de gagné, rien de perdu.'
    : winner === 0 ? `Tu empoches le pot : ${game.pot} groschens.` : `Ta mise de ${game.pot / 2} groschens est perdue.`;
  if (winner === 0) wallet.purse += game.pot;
  game.lastResult = (game.pot ? '' : 'honneur-') + (winner === 0 ? 'win' : 'loss');
  noteResult(winner);
  clearMatch();
  if (wallet.purse < MIN_STAKE) {
    wallet.purse += CREDIT;
    game.lastResult = 'credit';
    money += ` Ta bourse est vide : le Tavernier, bon prince, te glisse ${CREDIT} groschens.`;
  }
  saveWallet();
  $('go-title').textContent = winner === 0 ? 'Victoire !' : 'Défaite…';
  $('go-text').textContent = winner === 0
    ? `Tu l’emportes, ${me} points contre ${him}. ${OPP().beaten}`
    : `${CONFIG.ai} l’emporte, ${him} points contre ${me}. ${OPP().wins[game.pot ? 0 : 1]}`;
  $('go-money').textContent = `${money} Ta bourse : ${wallet.purse} groschens.`;
  $('gameover').classList.remove('hidden');
  fitModal($('gameover').querySelector('.modal'));
  winner === 0 ? sfxVictory() : sfxDefeat();
  react(winner === 0 ? 'victoire_toi' : 'victoire_tavernier', 1, 2200);
}
