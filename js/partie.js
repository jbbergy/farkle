// Déroulement d’une partie : tours, lancers, Farkle, points gardés, fin de partie et règles de la maison.

import * as THREE from 'three';
import { CONFIG, RULES } from './config.js';
import { $, rand, sleep } from './outils.js';
import { faceValue } from './des-speciaux.js';
import { OPP, pickTavernHand } from './adversaires.js';
import { CREDIT, MIN_STAKE, saveWallet, wallet } from './bourse.js';
import { layout, refreshShadows } from './scene.js';
import { bangTable, blowCandles, flareCandles } from './decor.js';
import { armBug, hotEvent, rollEvent } from './evenements.js';
import {
  dice, equipDice, faceUpQuat, moveDie, placeBodyAtMesh, poseDie, restOnMat, setInWorld, topFace, useSet
} from './des.js';
import { cancelReplay, throwDice } from './lancer.js';
import { clickableValues, countValues, enumerateSubsets, hasScore, scoreAll } from './regles.js';
import { carnet, noteAces, noteParts, noteResult, saveCarnet, unlock } from './carnet.js';
import { clearMatch, saveMatch, setPendingMatch } from './sauvegarde.js';
import { aiTurn } from './ia.js';
import { configurerFin, envoyerEtat, finManche, geste, tourDistant } from './en-ligne.js';
import { audio, shuffleMusic, sfxCoins, sfxDefeat, sfxFarkle, sfxHot, sfxPlace, sfxThud, sfxVictory } from './sons.js';
import { buzzBang, buzzFarkle, buzzVictory } from './vibreur.js';
import { commentRoll, loadOppVoices, nag, playerActed, react, talk } from './voix.js';
import { frameDice, unframe } from './cadrage.js';
import { dieTip, focusFirst, kb } from './entrees.js';
import { fitModal } from './ui/parchemin.js';
import { el, toast, updateUI } from './ui/hud.js';
import { backToMenu } from './ui/menu.js';

export const game = { phase: 'menu', current: 0, scores: [0, 0], turnScore: 0, token: 0, clickable: new Set(), aiStatus: '', pot: 0, lastResult: null, playerHand: [], tavernHand: [],
  // starter : qui a ouvert la partie ; finalFrom : qui a atteint l’objectif le premier (l’autre joue alors son dernier tour)
  starter: 0, turns: 0, finalFrom: null, house: {}, opened: [true, true], farkleRun: [0, 0],
  // pour les hauts faits : Farkles du joueur et plus gros retard de la partie, dés brûlants du tour en cours
  // (trace.bug : l’insecte est déjà passé, il ne revient pas même si la partie est reprise ;
  // trace.tales : les anecdotes déjà racontées, qui ne reviennent pas dans la même partie)
  trace: { farkles: 0, deficit: 0, tales: [] }, hotTurn: 0,
  // online : partie à deux en ligne ; bloque : le joueur ne peut pas agir (connexion perdue, gestes en cours de rattrapage)
  online: false, bloque: false,
  // waitVoices : les voix de la partie se chargent encore, personne ne lance (voicesReady : la fin de cette attente)
  waitVoices: false, voicesReady: Promise.resolve() };

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
  return game.current === 0 && game.phase === 'choosing' && !game.bloque &&
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
// (`fromNet` : geste reçu de l’autre joueur, ou le sien rejoué après un rechargement)
export function toggleDie(d, fromNet = false) {
  if (game.online && !fromNet) geste({ k: 'de', i: dice.indexOf(d) });
  if (d.state === 'pending') returnToBoard(d); else setAside(d);
  if (d.kind) { dieTip.flash = d; dieTip.until = performance.now() + 2200; }
  updateUI();
}

// Nouvelle partie, reprise de la partie interrompue (`resume`, voir saveMatch), ou partie à deux en ligne (`online`,
// voir lancerManche dans en-ligne.js : la mise y est déjà payée, et la sauvegarde d’une partie solo reste de côté)
export function startGame(resume = null, online = null) {
  game.online = !!online;
  game.bloque = false;
  if (online) {
    RULES.target = online.cible; RULES.opponent = 'ami';
    game.pot = online.mise * 2; game.scores = [0, 0];
    game.playerHand = online.mains[0]; game.tavernHand = online.mains[1];
    game.starter = online.starter; game.turns = 0; game.finalFrom = null;
    game.house = { ...online.maison }; game.opened = [!online.maison.ouverture, !online.maison.ouverture]; game.farkleRun = [0, 0];
    game.trace = { farkles: 0, deficit: 0, tales: [] };
  } else if (resume) {
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
    game.trace = { farkles: 0, deficit: 0, tales: [] };
  }
  if (!online) setPendingMatch(null);
  game.token++;
  shuffleMusic(); // chaque partie tire sa musique au hasard
  cancelReplay();
  shownScores[0] = game.scores[0]; shownScores[1] = game.scores[1];
  el.scores.forEach((s, i) => { s.textContent = game.scores[i]; }); // l’affichage animé ne bouge qu’au prochain changement de score
  $('target-label').textContent = RULES.target;
  document.querySelector('#row-1 .who').innerHTML = OPP().row;
  $('pot-label').textContent = game.pot ? `Pot : ${game.pot} groschens` : 'Pour l’honneur';
  $('btn-quit').textContent = online ? 'Abandonner la partie' : 'Retour au menu';
  $('quit-note').textContent = online ? `${CONFIG.ai} gagne alors la partie${game.pot ? ' et le pot' : ''}.` : 'La partie est gardée : tu la reprendras depuis le menu. Seul le tour en cours est perdu.';
  equipDice(0); equipDice(1);
  $('menu').classList.add('hidden'); $('gameover').classList.add('hidden'); $('hud').classList.remove('hidden');
  document.body.dataset.screen = 'game';
  armBug(); // l’insecte passera peut-être pendant la partie
  const tk = game.token, greeted = loadOppVoices();
  game.waitVoices = !online && !!audio.ctx && audio.on.voices;
  game.voicesReady = game.waitVoices ? waitVoices(tk) : Promise.resolve();
  if (online?.etat) restoreTurn(online.etat);
  else beginTurn(resume ? resume.current : game.starter);
  // l’adversaire salue à chaque partie, nouvelle ou reprise, dès que ses saluts sont chargés
  // (sauf si quelqu’un a déjà réagi à un premier lancer : un bonjour arriverait trop tard)
  const started = performance.now();
  greeted.then(() => { if (tk === game.token && talk.lastReaction < started) react('debut', 1, 400); });
}
// Avant le premier lancer, les voix de la partie (clients et adversaire) finissent de se charger, 15 s au plus :
// une réaction dont le fichier n’est pas encore arrivé serait sautée sans un mot. Le bouton « Lancer » attend,
// la progression s’affiche dans le conseil (voir updateUI), et l’adversaire qui commence attend aussi (aiTurn).
const VOICE_WAIT = 15000;
async function waitVoices(tk) {
  talk.loading.from = talk.loading.done;
  const tick = setInterval(() => { if (tk === game.token) updateUI(); }, 200);
  await Promise.race([Promise.all([talk.crowd, talk.oppAll]), sleep(VOICE_WAIT)]);
  clearInterval(tick);
  if (tk !== game.token) return;
  game.waitVoices = false;
  playerActed(); // l’attente ne compte pas dans l’impatience de l’adversaire
  updateUI();
}
// Partie à deux, page rechargée : le tour reprend là où l’instantané l’a laissé (voir etatPartie, dans en-ligne.js).
// Les dés encore sur le plateau y sont simplement reposés : seule leur valeur compte.
const BOARD_SPOTS = [[-3.4, -1.4], [0, -1.6], [3.4, -1.3], [-3.2, 1.5], [0.2, 1.3], [3.5, 1.6]];
function restoreTurn(e) {
  const p = e.current;
  game.current = p; game.phase = e.phase; game.turnScore = e.tour; game.scores = e.scores.slice(); game.finalFrom = e.finalFrom;
  game.opened = e.opened.slice(); game.farkleRun = e.farkleRun.slice(); game.turns = e.turns;
  game.clickable = new Set(); game.aiStatus = ''; game.hotTurn = 0;
  shownScores[0] = game.scores[0]; shownScores[1] = game.scores[1];
  el.scores.forEach((s, i) => { s.textContent = game.scores[i]; });
  useSet(p);
  restOnMat(1 - p, false);
  if (e.phase === 'idle') {
    restOnMat(p, false);
    slots[p].fill(null);
    for (const d of dice) d.state = 'table';
  } else {
    slots[p].fill(null);
    dice.forEach((d, i) => {
      const [state, slot, value] = e.des[i];
      d.state = state; d.side = p; d.slot = slot;
      if (state === 'table') poseDie(d, new THREE.Vector3(BOARD_SPOTS[i][0], 0.5, BOARD_SPOTS[i][1]), value, true);
      else { slots[p][slot] = d; poseDie(d, reservePos(p, slot), value, false); }
    });
    game.clickable = clickableValues(countValues(dice.filter((d) => d.state === 'table')));
  }
  refreshShadows();
  unframe();
  if (e.phase === 'choosing') frameDice();
  updateUI();
  if (p === 1) tourDistant();
}
function beginTurn(p) {
  game.current = p; game.turnScore = 0; game.phase = 'idle'; game.clickable = new Set(); game.aiStatus = '';
  game.turns++; game.hotTurn = 0;
  nag.count = 0; playerActed();
  if (!game.online) saveMatch();
  // les dés de l’autre retournent sur son tapis ; ceux du lanceur partiront de là où ils sont
  // (ils gardent leur case jusqu’au lancer, pour suivre leur tapis si l’écran tourne)
  useSet(p);
  slots[p].fill(null);
  for (const d of dice) d.state = 'table';
  restOnMat(1 - p);
  unframe();
  updateUI();
  if (game.online && p === 0) envoyerEtat();
  if (p === 1) { if (game.online) tourDistant(); else aiTurn(); }
  else if (game.finalFrom !== null) {
    toast('Ton dernier tour', `Il te faut plus de ${game.scores[1] - game.scores[0]} points`, 'hot', 2200); sfxHot();
    if (!game.online) react('dernier_tour', 1, 600); // l’adversaire, qui vient d’atteindre l’objectif, te tend les dés
  }
  else toast(game.turns === 1 ? 'À toi de commencer' : 'À toi de jouer', '', 'info', 1100);
}
function endTurn() { beginTurn(1 - game.current); }
// Quelqu’un se cogne le genou sous la table, un instant après (lancer exceptionnel, victoire du joueur) : chopes et pièces sautent
const EXCEPTIONAL = 1000;
function knock(k, delay) {
  const tk = game.token;
  setTimeout(() => { if (tk !== game.token) return; bangTable(k); sfxThud(k); buzzBang(); }, delay);
}

// `imposed` : les valeurs d’un lancer reçu par le réseau (voir throwDice)
export async function rollAction(imposed = null) {
  const tk = game.token;
  if (game.waitVoices) return null;
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
    hotEvent(dice); // braises, et l’embrasement du plateau si les événements de la table sont activés
    if (game.current === 0) {
      carnet.hot++; game.hotTurn++; saveCarnet();
      unlock('brulants');
      if (game.hotTurn >= 2) unlock('forge');
    }
    react('des_brulants', 0.85, 900, game.current === 0 ? 'jaloux' : 'brulant');
    updateUI();
    await sleep(1000);
    if (tk !== game.token) return null;
  }
  updateUI();
  unframe();
  const ok = await throwDice(toThrow, game.current, imposed);
  if (!ok || tk !== game.token) return null;
  frameDice();
  const counts = countValues(toThrow);
  if (!hasScore(counts)) { await farkle(); return 'farkle'; }
  if (game.current === 0 && toThrow.length === 1) unlock('tete_brulee');
  noteAces(counts);
  commentRoll(counts, toThrow.length);
  // grande combinaison : son événement (qui fait parfois déjà sauter les chopes)
  const banged = rollEvent(counts, toThrow);
  if (!banged && Math.max(...enumerateSubsets(counts).map((s) => s.score)) >= EXCEPTIONAL) knock(0.8, 260);
  game.phase = 'choosing';
  game.clickable = clickableValues(counts);
  if (game.current === 0 && kb.active) focusFirst();
  updateUI();
  if (game.online && game.current === 0) envoyerEtat();
  return 'ok';
}

async function farkle() {
  const tk = game.token;
  game.phase = 'farkle';
  const lost = game.turnScore;
  game.turnScore = 0;
  toast('Farkle !', lost ? `${lost} points perdus` : 'Aucun dé ne rapporte', 'farkle', 2000);
  sfxFarkle(); buzzFarkle();
  sfxThud(0.5, 0.3, false); // le sceau de l’annonce s’écrase
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

export async function bankAction(fromNet = false) {
  if (game.phase !== 'choosing') return;
  const sel = selectionInfo();
  if (!sel.valid) return;
  const tk = game.token, who = game.current;
  if (bankBlock(who, game.turnScore + sel.score)) return;
  if (game.online && !fromNet) geste({ k: 'garder' });
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
    if (gained >= 1000) flareCandles(0.6); // la salle s’enflamme pour un gros tour
  }
  toast(`+${gained}`, who === 0 ? 'Points mis à l’abri' : `${CONFIG.ai} empoche ses points`, 'bank', 1400);
  sfxCoins();
  // (objectif atteint ou dépassé : l’autre réagira au début de son dernier tour, ou la partie est finie)
  if (game.scores[who] < RULES.target) {
    const left = dice.filter((d) => d.state === 'table').length, before = game.scores[who] - gained;
    if (who === 1 && before < game.scores[0] && game.scores[1] > game.scores[0] && !game.online) react('devant', 0.7, 900);
    else if (gained >= 1000) react(who === 0 ? 'grosse_mise_toi' : 'grosse_mise_tavernier', 0.75, 900);
    else if (who === 0 && gained <= 300 && left >= 3 && !game.online) react('prudent', 0.6, 900); // il garde peu, avec des dés en main
  }
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

// L’adversaire jette l’éponge au début de son dernier tour, son retard étant hors de portée (HOPELESS dans ia.js) :
// il le dit lui-même, et la fin de partie attend qu’il ait fini de parler
export async function concede() {
  const tk = game.token, gap = game.scores[0] - game.scores[1];
  game.phase = 'conceding';
  game.aiStatus = `${CONFIG.ai} repose les dés sans les lancer.`;
  updateUI();
  toast(`${CONFIG.ai} abandonne`, `${gap} points de retard : c’est perdu d’avance`, 'info', 2800);
  react('abandon', 1, 500);
  await sleep(2800);
  for (let waited = 0; waited < 6000 && performance.now() < talk.busyUntil + 300; waited += 100) await sleep(100);
  if (tk === game.token) gameOver(0, true);
}

// Dernier tour du joueur : il peut renoncer, tant que les dés ne roulent pas ; celui qui a atteint l’objectif l’emporte
export const canGiveUp = () => game.finalFrom === 1 && game.current === 0 && !game.bloque && (game.phase === 'idle' || game.phase === 'choosing');
export function giveUp() {
  if (!canGiveUp()) return;
  if (game.online) geste({ k: 'renonce' });
  finishGiveUp(0);
}
// (`side` : celui qui renonce, l’autre joueur quand le geste vient du réseau)
export function finishGiveUp(side) {
  const [me, him] = game.scores;
  game.token++;
  cancelReplay();
  gameOver(1 - side, false, side === 0
    ? `Tu renonces à ton dernier tour : ${CONFIG.aiLower} l’emporte, ${him} points contre ${me}.`
    : `${CONFIG.ai} renonce à son dernier tour : tu l’emportes, ${me} points contre ${him}.`);
}

// (`note` : à deux en ligne, ce qui a mis fin à la partie quand ce ne sont pas les points : abandon, forfait, dernier tour auquel on renonce)
export function gameOver(winner, conceded = false, note = '') {
  game.phase = 'over';
  updateUI();
  const [me, him] = game.scores;
  let money = !game.pot ? 'Partie pour l’honneur : rien de gagné, rien de perdu.'
    : winner === 0 ? `Tu empoches le pot : ${game.pot} groschens.` : `Ta mise de ${game.pot / 2} groschens est perdue.`;
  if (winner === 0) wallet.purse += game.pot;
  game.lastResult = game.online ? null : (game.pot ? '' : 'honneur-') + (winner === 0 ? 'win' : 'loss'); // l’adversaire du menu n’a rien à en dire
  noteResult(winner);
  if (game.online) finManche(); else clearMatch();
  if (wallet.purse < MIN_STAKE) {
    wallet.purse += CREDIT;
    if (!game.online) game.lastResult = 'credit';
    money += ` Ta bourse est vide : le Tavernier, bon prince, te glisse ${CREDIT} groschens.`;
  }
  saveWallet();
  $('go-title').textContent = winner === 0 ? 'Victoire !' : 'Défaite…';
  $('go-text').textContent = winner === 0
    ? `Tu l’emportes, ${me} points contre ${him}. ${conceded ? OPP().gaveUp : OPP().beaten}`
    : `${CONFIG.ai} l’emporte, ${him} points contre ${me}. ${OPP().wins[game.pot ? 0 : 1]}`;
  if (note) $('go-text').textContent = note;
  $('go-money').textContent = `${money} Ta bourse : ${wallet.purse} groschens.`;
  if (game.online) configurerFin();
  else { $('btn-again').hidden = false; $('btn-again').disabled = false; $('btn-again').textContent = 'Nouvelle partie'; }
  $('gameover').classList.remove('hidden');
  fitModal($('gameover').querySelector('.modal'));
  if (winner === 0) { sfxVictory(); buzzVictory(); flareCandles(1); knock(1, 350); } else sfxDefeat();
  // après un abandon, l’adversaire a déjà parlé : seuls les clients saluent la victoire
  if (conceded) react('victoire_toi', 1, 2200, null);
  else react(winner === 0 ? 'victoire_toi' : 'victoire_tavernier', 1, 2200);
}
