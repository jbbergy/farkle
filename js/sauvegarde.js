// Partie en cours : gardée à chaque début de tour, pour la reprendre si la page est rechargée ou fermée
// (la mise est déjà sortie de la bourse ; seul le tour qui était en train d’être joué est perdu).

import { oppId, RULES } from './config.js';
import { DIE_KINDS } from './des-speciaux.js';
import { OPPONENTS } from './adversaires.js';
import { HAND_SIZE } from './bourse.js';
import { game } from './partie.js';

const MATCH_KEY = 'farkle.partie';
export function saveMatch() {
  const m = { target: RULES.target, pot: game.pot, scores: game.scores, current: game.current, playerHand: game.playerHand, tavernHand: game.tavernHand,
    starter: game.starter, turns: game.turns, finalFrom: game.finalFrom, house: game.house, opened: game.opened, farkleRun: game.farkleRun,
    opponent: RULES.opponent, trace: game.trace };
  try { localStorage.setItem(MATCH_KEY, JSON.stringify(m)); } catch { /* stockage indisponible */ }
}
export function clearMatch() {
  pendingMatch = null;
  try { localStorage.removeItem(MATCH_KEY); } catch { /* stockage indisponible */ }
}
export function readMatch() {
  try {
    const m = JSON.parse(localStorage.getItem(MATCH_KEY));
    const hand = (h) => (Array.isArray(h) ? h.filter((id) => DIE_KINDS[id]).slice(0, HAND_SIZE) : []);
    const pair = (a, f) => (Array.isArray(a) && a.length === 2 ? a.map(f) : null);
    if (m && Array.isArray(m.scores) && m.scores.length === 2 && validTarget(m.target)) {
      return { target: m.target, pot: Math.max(0, m.pot | 0), scores: m.scores.map((v) => Math.max(0, v | 0)),
        current: m.current === 1 ? 1 : 0, playerHand: hand(m.playerHand), tavernHand: hand(m.tavernHand),
        starter: m.starter === 1 ? 1 : 0, turns: Math.max(0, m.turns | 0), finalFrom: m.finalFrom === 0 || m.finalFrom === 1 ? m.finalFrom : null,
        house: { ouverture: !!m.house?.ouverture, troisFarkles: !!m.house?.troisFarkles },
        opened: pair(m.opened, Boolean) || [true, true], farkleRun: pair(m.farkleRun, (v) => Math.max(0, v | 0)) || [0, 0],
        opponent: OPPONENTS[oppId(m.opponent)] ? oppId(m.opponent) : 'tavernier',
        trace: { farkles: Math.max(0, m.trace?.farkles | 0), deficit: Math.max(0, m.trace?.deficit | 0), bug: !!m.trace?.bug,
          tales: Array.isArray(m.trace?.tales) ? m.trace.tales.filter((id) => typeof id === 'string').slice(0, 100) : [] } };
    }
  } catch { /* rien à reprendre */ }
  return null;
}
export let pendingMatch = readMatch();
function validTarget(t) { return [2000, 4000, 8000].includes(t); }
export function setPendingMatch(m) { pendingMatch = m; }
// une partie interrompue se reprend à la table de son adversaire
if (pendingMatch) RULES.opponent = pendingMatch.opponent;
