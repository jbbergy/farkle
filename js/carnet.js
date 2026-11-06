// Carnet du joueur : parties jouées, records et hauts faits (gardés dans le navigateur).

import { oppId, RULES } from './config.js';
import { $ } from './outils.js';
import { OPP_ORDER } from './adversaires.js';
import { wallet } from './bourse.js';
import { game } from './partie.js';
import { sfxFeat } from './sons.js';

// starter : qui a ouvert la dernière partie (chacun son tour) ; vs : victoires et défaites contre chaque adversaire
// (ami : contre d’autres joueurs, en ligne) ;
// feats : hauts faits obtenus, avec leur date
const CARNET_KEY = 'farkle.carnet';
export const carnet = { starter: 1, games: 0, wins: 0, vs: {}, bestTurn: 0, bestPot: 0, purseMax: 0, hot: 0, farkles: 0, feats: {} };
try {
  const saved = JSON.parse(localStorage.getItem(CARNET_KEY));
  if (saved) {
    for (const k of ['starter', 'games', 'wins', 'bestTurn', 'bestPot', 'purseMax', 'hot', 'farkles']) if (Number.isFinite(saved[k])) carnet[k] = Math.max(0, saved[k] | 0);
    for (const [id, r] of Object.entries(saved.vs || {})) carnet.vs[oppId(id)] = { w: Math.max(0, r.w | 0), l: Math.max(0, r.l | 0) };
    for (const [id, t] of Object.entries(saved.feats || {})) if (Number.isFinite(t)) carnet.feats[id] = t;
  }
} catch { /* carnet vierge */ }
carnet.purseMax = Math.max(carnet.purseMax, wallet.purse);
export function saveCarnet() { try { localStorage.setItem(CARNET_KEY, JSON.stringify(carnet)); } catch { /* stockage indisponible */ } }

// Hauts faits : obtenus une fois pour toutes, annoncés par un bandeau
export const FEATS = [
  { id: 'premiere', name: 'Première victoire', desc: 'Gagner une partie.' },
  { id: 'brulants', name: 'Dés brûlants', desc: 'Mettre les six dés de côté dans un même tour.' },
  { id: 'forge', name: 'Feu de forge', desc: 'Avoir deux fois les dés brûlants dans un même tour.' },
  { id: 'mille', name: 'Mille d’un coup', desc: 'Garder 1000 points en un seul tour.' },
  { id: 'grand_tour', name: 'Le grand tour', desc: 'Garder 2500 points en un seul tour.' },
  { id: 'suite', name: 'La grande suite', desc: 'Garder la suite de 1 à 6.' },
  { id: 'six', name: 'Six jumeaux', desc: 'Garder six dés identiques d’un même lancer.' },
  { id: 'trois_as', name: 'Trois as', desc: 'Sortir trois as d’un même lancer.' },
  { id: 'quatre_as', name: 'Quatre as', desc: 'Sortir quatre as d’un même lancer.' },
  { id: 'cinq_as', name: 'Cinq as', desc: 'Sortir cinq as d’un même lancer.' },
  { id: 'six_as', name: 'Six as', desc: 'Sortir six as d’un même lancer.' },
  { id: 'tete_brulee', name: 'Tête brûlée', desc: 'Relancer un seul dé… et marquer.' },
  { id: 'cornu', name: 'Pacte du Cornu', desc: 'Compléter une combinaison avec la tête cornue.' },
  { id: 'main_sure', name: 'Main sûre', desc: 'Gagner une partie sans un seul Farkle.' },
  { id: 'remontee', name: 'Retour de flamme', desc: 'Gagner après avoir été mené de 1500 points.' },
  { id: 'fil', name: 'Sur le fil', desc: 'Gagner pendant ton dernier tour.' },
  { id: 'tournee', name: 'Tournée générale', desc: 'Battre chacun des quatre adversaires.' },
  { id: 'patron', name: 'Plumer le patron', desc: 'Battre le Tavernier sur une mise de 100 groschens.' },
  { id: 'bourse', name: 'Bourse pleine', desc: 'Avoir 1000 groschens en poche.' },
  { id: 'cabinet', name: 'Cabinet de curiosités', desc: 'Posséder huit sortes de dés spéciaux.' },
  { id: 'jour_sans', name: 'Jour sans', desc: 'Faire trois Farkles d’affilée.' },
];
const featQueue = [];
export function unlock(id) {
  if (carnet.feats[id]) return;
  carnet.feats[id] = Date.now();
  saveCarnet();
  featQueue.push(FEATS.find((f) => f.id === id));
  if (featQueue.length === 1) showFeat();
}
// un bandeau après l’autre, chacun quelques secondes
function showFeat() {
  const f = featQueue[0], box = $('feat-toast');
  if (!f) return;
  box.innerHTML = `<small>Haut fait</small><b>${f.name}</b><span>${f.desc}</span>`;
  box.classList.add('show');
  sfxFeat();
  setTimeout(() => {
    box.classList.remove('show');
    setTimeout(() => { featQueue.shift(); showFeat(); }, 600);
  }, 3600);
}
export function checkPurseFeats() {
  carnet.purseMax = Math.max(carnet.purseMax, wallet.purse);
  if (wallet.purse >= 1000) unlock('bourse');
  if (Object.keys(wallet.owned).length >= 8) unlock('cabinet');
  saveCarnet();
}

// As sortis d’un même lancer du joueur, qu’il les garde ou non (la tête cornue ne compte pas pour un as)
const ACE_FEATS = { 3: 'trois_as', 4: 'quatre_as', 5: 'cinq_as', 6: 'six_as' };
export function noteAces(counts) {
  if (game.current === 0 && ACE_FEATS[counts[1]]) unlock(ACE_FEATS[counts[1]]);
}
// Combinaisons gardées par le joueur : suite, six dés identiques, joker
export function noteParts(parts) {
  if (game.current !== 0) return;
  for (const { label } of parts) {
    if (label === 'Suite 1→6') unlock('suite');
    if (label.startsWith('Six ')) unlock('six');
    if (label.includes('(avec le joker)')) unlock('cornu');
  }
}
// Fin de partie : le carnet, et les hauts faits d’une victoire
export function noteResult(winner) {
  const opp = RULES.opponent, rec = carnet.vs[opp] || (carnet.vs[opp] = { w: 0, l: 0 });
  carnet.games++;
  if (winner === 0) {
    carnet.wins++; rec.w++;
    carnet.bestPot = Math.max(carnet.bestPot, game.pot);
    unlock('premiere');
    if (!game.trace.farkles) unlock('main_sure');
    if (game.trace.deficit >= 1500) unlock('remontee');
    if (game.finalFrom === 1) unlock('fil');
    if (opp === 'tavernier' && game.pot >= 200) unlock('patron');
    if (OPP_ORDER.every((id) => carnet.vs[id]?.w)) unlock('tournee');
  } else rec.l++;
  checkPurseFeats();
}
