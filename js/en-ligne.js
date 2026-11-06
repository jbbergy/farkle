// Partie à deux en ligne : connexion au serveur, gestes envoyés et reçus, reprise après une coupure, revanche et forfait.
//
// Chaque navigateur fait tourner partie.js de son côté, chaque joueur étant « 0 » chez lui. Seuls voyagent les gestes
// (valeurs d’un lancer, dé pris ou reposé, points gardés) : le reste en découle des deux côtés. Sur le serveur, les joueurs
// sont désignés par leur place (0 : le maître de la partie, 1 : celui qui rejoint), convertie ici en camp (0 : moi, 1 : l’autre).

import { CONFIG, RULES } from './config.js';
import { $, sleep } from './outils.js';
import { DIE_KINDS } from './des-speciaux.js';
import { setFriend } from './adversaires.js';
import { saveWallet, wallet } from './bourse.js';
import { applyOppLook, dice } from './des.js';
import { cancelReplay } from './lancer.js';
import { bankAction, game, gameOver, rollAction, startGame, toggleDie } from './partie.js';
import { sfxHot } from './sons.js';
import { toast, updateUI } from './ui/hud.js';
import { backToMenu, renderMenu } from './ui/menu.js';
import { fitModal } from './ui/parchemin.js';
import { fermerEnLigne, montrerAttente } from './ui/page-en-ligne.js';

const STORE = 'farkle.table', NAME_KEY = 'farkle.nom';
export const FORFEIT_DELAY = 180000; // comme forfeitAfter dans serveur/serveur.js
const SERVER_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `ws://${location.hostname}:8790/ws` : `wss://${location.host}/ws`;

// code et jeton : la place à la table ; dernier : le dernier geste reçu ; file : les gestes reçus, à jouer dans l’ordre ;
// sortants : ce qui attend l’accusé de réception du serveur ; aReprendre : une partie retrouvée au chargement de la page
const blank = () => ({
  code: null, jeton: null, place: 0, info: null, noms: ['', ''], manche: 0, dernier: -1,
  file: [], sortants: [], envoyes: new Set(), rattrapage: false, connecte: false, autreLa: true, absentDepuis: 0,
  revanche: { moi: false, lui: false }, parti: false, abandon: false, aReprendre: null, remplacee: false,
});
export const table = blank();
const solo = { opponent: null, target: null }; // ce qu’avait choisi le joueur au menu, remis en quittant la table

const flip = (a) => (table.place === 0 ? a : [a[1], a[0]]);
const sideOf = (place) => (place === table.place ? 0 : 1);
const seatOf = (side) => (side === 0 ? table.place : 1 - table.place);
export const nomAutre = () => table.noms[1 - table.place] || '';

// ─── Ce qui survit à un rechargement de la page ───
function readStore() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
function writeStore(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
function clearStore() { try { localStorage.removeItem(STORE); } catch { /* stockage indisponible */ } }
export function savedName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } }
export function saveName(n) { try { localStorage.setItem(NAME_KEY, n); } catch { /* stockage indisponible */ } }

// ─── La connexion ───
let ws = null, retry = 0, retryTimer = null, lastPong = 0, opening = null, pending = null;
export const estEnLigne = () => navigator.onLine !== false;
function isOpen() { return ws && ws.readyState === WebSocket.OPEN; }
function ouvrir() {
  if (isOpen()) return Promise.resolve();
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const s = ws = new WebSocket(SERVER_URL);
    s.onopen = () => {
      opening = null; retry = 0; lastPong = performance.now();
      if (table.code) sendRaw({ t: 'reprendre', code: table.code, jeton: table.jeton, dernier: table.dernier });
      resolve();
    };
    s.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } recevoir(m); };
    s.onerror = () => {};
    s.onclose = (e) => {
      if (opening && ws === s) { opening = null; reject(new Error('reseau')); }
      if (ws !== s) return;
      ws = null;
      if (pending) { pending.reject(new Error('reseau')); pending = null; }
      perdue(e.code);
    };
  });
  return opening;
}
function fermer() {
  clearTimeout(retryTimer);
  if (ws) { const s = ws; ws = null; s.close(); }
}
function sendRaw(m) { if (isOpen()) ws.send(JSON.stringify(m)); }
function perdue(code) {
  table.connecte = false;
  if (code === 4001) { table.remplacee = true; majBlocage(); return; } // la place a été reprise dans un autre onglet
  if (!table.code) return;
  majBlocage();
  clearTimeout(retryTimer);
  const wait = Math.min(10000, 800 * 2 ** retry++);
  retryTimer = setTimeout(reconnecter, wait);
}
function reconnecter() {
  if (table.code && !table.remplacee && !isOpen()) ouvrir().catch(() => {});
}
// Une demande avant d’être assis à une table : on attend la première réponse d’un des genres donnés
async function demande(msg, ...types) {
  await ouvrir();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending = null; reject(new Error('reseau')); }, 8000);
    pending = {
      types,
      resolve: (m) => { clearTimeout(timer); resolve(m); },
      reject: (err) => { clearTimeout(timer); reject(err); },
    };
    sendRaw(msg);
  });
}
function recevoir(m) {
  if (m.t === 'p') { lastPong = performance.now(); return; }
  if (pending && (pending.types.includes(m.t) || m.t === 'erreur')) {
    const p = pending; pending = null; p.resolve(m); return;
  }
  const on = { repris, debut: lancerManche, action: recuAction, presence: recuPresence, erreur: recuErreur,
    ack(a) { table.sortants = table.sortants.filter((s) => s.cid !== a.cid); },
    revanche() { table.revanche.lui = true; majRevanche(); },
    parti() { table.parti = true; majRevanche(); } }[m.t];
  if (on) on(m);
}
function recuPresence(m) {
  table.autreLa = m.la;
  table.absentDepuis = m.la ? 0 : performance.now();
  majBandeau();
  majRevanche();
}
function recuErreur(m) {
  if (m.raison === 'disparue') tableDisparue();
}

// Le serveur ne connaît plus la table (redémarrage, trop longue absence) : chacun récupère sa mise
function tableDisparue() {
  const stored = readStore();
  const rendu = stored && stored.payee ? stored.mise : 0;
  if (rendu) { wallet.purse += rendu; saveWallet(); }
  clearStore();
  const enJeu = game.online && game.phase !== 'over' && game.phase !== 'menu';
  const attendait = !game.online && table.code;
  Object.assign(table, blank());
  fermer();
  if (enJeu || game.online) backToMenu();
  else if (attendait) { fermerEnLigne(); renderMenu(); }
  annonce(rendu ? `La table a disparu : ta mise de ${rendu} groschens t’est rendue.` : 'Cette table n’existe plus.');
}

// ─── Créer, voir, rejoindre ───
const mainActuelle = () => wallet.hand.slice();
function assis(m, code) {
  table.code = code; table.jeton = m.jeton; table.place = m.place; table.connecte = true;
  writeStore({ code, jeton: m.jeton, place: m.place, mise: 0, payee: 0 });
}
export async function creerTable(nom, options) {
  const m = await demande({ t: 'creer', nom, options, main: mainActuelle() }, 'cree');
  if (m.t === 'erreur') return m;
  table.info = m.table;
  assis(m, m.table.code);
  return m;
}
export const voirTable = (code) => demande({ t: 'voir', code }, 'table');
export async function rejoindreTable(code, nom) {
  const m = await demande({ t: 'rejoindre', code, nom, main: mainActuelle() }, 'assis');
  if (m.t === 'erreur') return m;
  assis(m, m.code);
  return m;
}
// Quitter une table : en attente du second joueur (elle disparaît), ou après la partie
export function quitterTable() {
  sendRaw({ t: 'quitter' });
  clearStore();
  fermer();
  Object.assign(table, blank());
  game.online = false; game.bloque = false;
  majBandeau();
  if (solo.opponent) { RULES.opponent = solo.opponent; RULES.target = solo.target; solo.opponent = null; applyOppLook(); }
}
// Fin d’une visite au formulaire sans s’être assis
export function libererConnexion() { if (!table.code) fermer(); }

// ─── Une manche commence ───
const cleanHand = (h) => (h || []).filter((id) => DIE_KINDS[id]);
function lancerManche(m, etat = null) {
  table.info = m.table; table.noms = m.noms; table.manche = m.manche;
  table.dernier = m.depuis ?? m.base ?? 0;
  table.file = []; table.sortants = []; table.envoyes = new Set();
  table.revanche = { moi: false, lui: false }; table.parti = false; table.abandon = false; table.aReprendre = null;
  if (m.adversaireLa !== undefined) recuPresence({ la: m.adversaireLa }); else { table.autreLa = true; table.absentDepuis = 0; }
  // la mise sort de la bourse une seule fois par manche, même si la page est rechargée
  const stored = readStore() || {}, mise = m.table.mise;
  if (stored.payee !== m.manche) { wallet.purse = Math.max(0, wallet.purse - mise); saveWallet(); }
  writeStore({ code: table.code, jeton: table.jeton, place: table.place, mise, payee: m.manche });
  if (!solo.opponent) { solo.opponent = RULES.opponent; solo.target = RULES.target; }
  setFriend(nomAutre());
  fermerEnLigne();
  startGame(null, {
    cible: m.table.cible, mise, maison: m.table.maison, starter: sideOf(m.premier),
    mains: flip(m.mains).map(cleanHand),
    etat: etat && { ...etat, current: sideOf(etat.current), scores: flip(etat.scores), opened: flip(etat.opened), farkleRun: flip(etat.farkleRun),
      finalFrom: etat.finalFrom === null ? null : sideOf(etat.finalFrom) },
  });
  if (m.actions?.length) { table.rattrapage = true; m.actions.forEach(recuAction); }
  majBlocage();
}
function repris(m) {
  table.connecte = true; table.place = m.place;
  table.autreLa = m.adversaireLa;
  table.absentDepuis = m.adversaireLa ? 0 : table.absentDepuis || performance.now();
  if (table.chargement) { // page rechargée, au menu
    table.chargement = false;
    if (!m.commencee) { table.info = m.table; montrerAttente(); return; }
    table.noms = m.noms; table.aReprendre = m;
    renderMenu();
    return;
  }
  if (m.commencee && (m.neuf || m.manche !== table.manche)) { if (!table.aReprendre) lancerManche(m, m.etat || null); return; }
  (m.actions || []).forEach(recuAction);
  for (const s of table.sortants) sendRaw(s);
  majBlocage();
  majRevanche();
}
// Bouton « Reprendre contre X » du menu
export function reprendrePartie() {
  const m = table.aReprendre;
  if (m) lancerManche(m, m.etat || null);
}

// ─── Les gestes ───
let nextCid = 0;
function sortant(m) {
  table.sortants.push(m);
  if (table.connecte) sendRaw(m);
}
export function geste(a) {
  const cid = `${Date.now().toString(36)}-${nextCid++}`;
  table.envoyes.add(cid);
  sortant({ t: 'action', cid, a });
}
export function envoyerLancer(values) { geste({ k: 'lancer', v: values }); }
// Instantané à un point stable, pour un joueur qui recharge sa page ; il compte pour tous les gestes reçus jusque-là
// par le serveur : on s’abstient donc tant qu’on rattrape des gestes plus récents
export function envoyerEtat() {
  if (table.file.length > 1) return;
  sortant({ t: 'etat', cid: `e${Date.now().toString(36)}-${nextCid++}`, data: {
    current: seatOf(game.current), phase: game.phase, tour: game.turnScore, scores: flip(game.scores),
    finalFrom: game.finalFrom === null ? null : seatOf(game.finalFrom), opened: flip(game.opened), farkleRun: flip(game.farkleRun), turns: game.turns,
    des: dice.map((d) => [d.state, d.slot, d.value]),
  } });
}
function recuAction(m) {
  table.dernier = Math.max(table.dernier, m.seq);
  if (m.cid && table.envoyes.has(m.cid)) { // l’écho de mon propre geste
    table.envoyes.delete(m.cid);
    table.sortants = table.sortants.filter((s) => s.cid !== m.cid);
    return;
  }
  table.file.push(m);
  pompe();
}
// Un geste attend que la partie en soit au bon point : fin d’une animation, passage au tour de son auteur
const PHASES = { lancer: ['idle', 'choosing'], de: ['choosing'], garder: ['choosing'] };
async function pret(k, side, manche) {
  for (;;) {
    if (!game.online || table.manche !== manche || game.phase === 'over') return false;
    if (game.current === side && PHASES[k].includes(game.phase)) return true;
    await sleep(40);
  }
}
let pumping = false;
async function pompe() {
  if (pumping) return;
  pumping = true;
  try {
    while (table.file.length) {
      await appliquer(table.file[0]);
      table.file.shift();
    }
  } finally {
    pumping = false;
    if (table.rattrapage) { table.rattrapage = false; majBlocage(); }
  }
}
async function appliquer(m) {
  const a = m.a, side = sideOf(m.de);
  if (a.k === 'abandon' || a.k === 'forfait') {
    if (!game.online || game.phase === 'over' || side === 0 && a.k === 'abandon') return;
    game.token++;
    cancelReplay();
    if (a.k === 'abandon') table.parti = table.abandon = true;
    if (a.k === 'abandon') gameOver(0, false, `${nomAutre()} a quitté la table : tu l’emportes.`);
    else if (side === 0) gameOver(0, false, `${nomAutre()} n’a pas repris sa place : tu gagnes par forfait.`);
    else gameOver(1, false, `Tu n’as pas repris ta place à temps : ${nomAutre()} gagne par forfait.`);
    return;
  }
  if (!PHASES[a.k] || !(await pret(a.k, side, table.manche))) return;
  if (a.k === 'lancer') {
    if (side === 1) { game.aiStatus = 'Les dés roulent…'; updateUI(); }
    const res = await rollAction(a.v);
    if (res === 'ok' && side === 1) { game.aiStatus = `${CONFIG.ai} choisit ses dés…`; updateUI(); }
  } else if (a.k === 'de') {
    const d = dice[a.i];
    if (d) toggleDie(d, true);
    await sleep(60);
  } else {
    await bankAction(true);
  }
}
// Au début du tour de l’autre joueur : l’annonce, puis on attend ses gestes
export function tourDistant() {
  game.aiStatus = game.phase === 'choosing' ? `${CONFIG.ai} choisit ses dés…` : `${CONFIG.ai} va lancer les dés…`;
  updateUI();
  if (game.phase !== 'idle') return; // reprise au milieu du tour : rien à annoncer
  if (game.finalFrom !== null) {
    toast(`${CONFIG.ai} joue son dernier tour`, `Il lui faut plus de ${game.scores[0] - game.scores[1]} points`, 'hot', 2200);
    sfxHot();
  } else toast(game.turns === 1 ? `${CONFIG.ai} commence` : `${CONFIG.ai} joue`, '', 'info', 1100);
}

// ─── Fin de partie, abandon, revanche ───
export function finManche() {
  sendRaw({ t: 'fin' });
  clearStore();
}
export function abandonner() {
  if (!game.online || game.phase === 'over') return;
  geste({ k: 'abandon' });
  game.token++;
  cancelReplay();
  table.parti = table.abandon = true;
  gameOver(1, false, `Tu as quitté la table : ${nomAutre()} l’emporte.`);
}
export function demanderRevanche() {
  if (table.parti || table.revanche.moi) return;
  table.revanche.moi = true;
  sendRaw({ t: 'revanche' });
  majRevanche();
}
const assezPourRevanche = () => wallet.purse >= (table.info?.mise || 0);
export function configurerFin() {
  $('btn-again').textContent = 'Revanche';
  majRevanche();
}
function majRevanche() {
  if (!game.online || game.phase !== 'over') return;
  const b = $('btn-again'), nom = nomAutre();
  const absent = table.parti || !table.autreLa;
  b.hidden = table.parti;
  // abandon : la fin de partie vient de le dire
  if (table.abandon) { $('go-rematch').textContent = ''; return; }
  b.disabled = absent || table.revanche.moi || !assezPourRevanche();
  $('go-rematch').textContent = table.parti ? `${nom} a quitté la table.`
    : !table.autreLa ? `${nom} n’est plus là.`
    : !assezPourRevanche() ? `Ta bourse est trop légère pour une revanche à ${table.info.mise} groschens.`
    : table.revanche.moi ? `En attente de ${nom}…`
    : table.revanche.lui ? `${nom} veut sa revanche !` : '';
  fitModal($('gameover').querySelector('.modal'));
}
export const pretePourMenu = () => { $('go-rematch').textContent = ''; };

// ─── Le bandeau de connexion ───
function majBlocage() {
  const was = game.bloque;
  game.bloque = game.online && (!table.connecte || table.rattrapage || table.remplacee);
  majBandeau();
  if (was !== game.bloque && game.online) updateUI();
}
function majBandeau() {
  const box = $('net-banner'), btn = $('btn-forfait');
  const inGame = game.online && game.phase !== 'menu' && game.phase !== 'over';
  let text = '';
  if (game.online && table.remplacee) text = 'Cette partie a été reprise dans un autre onglet.';
  else if (inGame && !table.connecte) text = 'Connexion perdue… Je réessaie.';
  else if (inGame && !table.autreLa) text = `${nomAutre()} a perdu la connexion…`;
  if (annonceFin > performance.now()) text = annonceTexte;
  const canForfeit = inGame && table.connecte && !table.autreLa && table.absentDepuis && performance.now() - table.absentDepuis >= FORFEIT_DELAY;
  btn.hidden = !canForfeit;
  box.classList.toggle('hidden', !text);
  if ($('net-text').textContent !== text) $('net-text').textContent = text;
}
let annonceTexte = '', annonceFin = 0;
export function annonce(text, ms = 9000) {
  annonceTexte = text; annonceFin = performance.now() + ms;
  majBandeau();
}

// Pour essayer depuis la console (FarkleDebug.coupure()) : la connexion tombe, le jeu se reconnecte tout seul
export function couperConnexion() { if (ws) ws.close(); }

// ─── Au chargement de la page ───
export function initEnLigne() {
  $('btn-forfait').addEventListener('click', () => sendRaw({ t: 'forfait' }));
  $('btn-online-resume').addEventListener('click', reprendrePartie);
  setInterval(() => {
    majBandeau();
    if (!isOpen()) return;
    if (performance.now() - lastPong > 50000) { ws.close(); return; }
  }, 1000);
  setInterval(() => sendRaw({ t: 'p' }), 20000);
  const revive = () => { if (table.code && !isOpen()) { retry = 0; reconnecter(); } else if (isOpen()) sendRaw({ t: 'p' }); };
  addEventListener('online', revive);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revive(); });
  // Une table laissée en plan : on regarde si elle existe encore
  const stored = readStore();
  if (stored && stored.code && stored.jeton) {
    Object.assign(table, { code: stored.code, jeton: stored.jeton, place: stored.place, chargement: true });
    ouvrir().catch(() => {});
  }
}
