// L’adversaire joue : choix des dés à garder et décision de relancer ou de garder ses points.

import { CONFIG, RULES } from './config.js';
import { rand, sleep } from './outils.js';
import { faceValue } from './des-speciaux.js';
import { il, OPP } from './adversaires.js';
import { dice } from './des.js';
import { countValues, enumerateSubsets } from './regles.js';
import { bankAction, bankBlock, concede, game, rollAction, setAside } from './partie.js';
import { sfxHot } from './sons.js';
import { react } from './voix.js';
import { toast, updateUI } from './ui/hud.js';

// Valeur estimée de garder r dés en main (0 = dés brûlants → six dés frais)
const AI_FUTURE = [420, 25, 55, 105, 170, 250, 330];
export function aiChoose(counts, nAvail) {
  const subs = enumerateSubsets(counts);
  // un adversaire distrait (ou ivre) prend parfois n’importe quelle combinaison valable
  if (OPP().slip && Math.random() < OPP().slip) return subs[(Math.random() * subs.length) | 0];
  let best = null, bestU = -Infinity;
  for (const s of subs) {
    const u = s.score + AI_FUTURE[nAvail - s.n] + Math.random() * 15;
    if (u > bestU) { bestU = u; best = s; }
  }
  return best;
}
function aiShouldBank(turnAfter, remaining) {
  const me = game.scores[1], opp = game.scores[0], target = RULES.target;
  if (bankBlock(1, turnAfter)) return false;        // dernier tour pas encore gagné, ou score pas encore ouvert
  if (game.finalFrom !== null) return true;          // dernier tour : il vient de dépasser, il s’arrête là
  if (me + turnAfter >= target) return true;
  if (remaining === 0) return false;
  let th = [0, 250, 300, 400, 700, 1500][remaining];
  if (opp >= target * 0.85 || opp - me > target * 0.35) th *= 1.6;      // en retard : il prend des risques
  else if (me - opp > target * 0.35) th *= 0.75;                        // en avance : il assure
  const [lo, hi] = OPP().whim || [0.88, 1.15];                          // son humeur du moment (sire Radek : n’importe laquelle)
  th *= OPP().risk * rand(lo, hi);                                      // son caractère : prudent ou casse-cou
  return turnAfter >= th;
}
// Au Farkle, aucun retard n’est tout à fait impossible à rattraper (les dés brûlants relancent le tour sans fin),
// mais en simulant des centaines de milliers de derniers tours, l’adversaire ne marque plus de 3000 points
// qu’une fois sur cinquante environ (plus de 3500 : une fois sur cent). Au-delà, il jette l’éponge sans lancer.
export const HOPELESS = 3000;
export async function aiTurn() {
  const tk = game.token;
  // il commence la partie : il attend, lui aussi, que les voix soient chargées (voir waitVoices dans partie.js)
  if (game.waitVoices) { updateUI(); await game.voicesReady; if (tk !== game.token) return; }
  if (game.finalFrom !== null && game.scores[0] - game.scores[1] >= HOPELESS) {
    game.aiStatus = `${CONFIG.ai} regarde les scores…`;
    updateUI();
    await sleep(1400);
    if (tk === game.token) concede();
    return;
  }
  game.aiStatus = `${CONFIG.ai} fait rouler les dés dans sa paume…`;
  updateUI();
  if (game.finalFrom !== null) {
    toast(`${CONFIG.ai} joue son dernier tour`, `${il()} doit marquer plus de ${game.scores[0] - game.scores[1]} points`, 'hot', 2200);
    sfxHot();
    react('rattrapage', 1, 300);
    await sleep(1000);
  } else toast(game.turns === 1 ? `${CONFIG.ai} commence` : `${CONFIG.ai} joue`, '', 'info', 1100);
  await sleep(1300);
  while (tk === game.token && game.current === 1) {
    game.aiStatus = 'Les dés roulent…';
    const res = await rollAction();
    if (tk !== game.token || res !== 'ok') return;
    game.aiStatus = `${CONFIG.ai} réfléchit…`;
    updateUI();
    await sleep(rand(700, 1100));
    if (tk !== game.token) return;
    const table = dice.filter((d) => d.state === 'table');
    const choice = aiChoose(countValues(table), table.length);
    const need = choice.counts.slice(), picks = [];
    for (const d of table) if (need[faceValue(d)] > 0) { need[faceValue(d)]--; picks.push(d); }
    for (const d of picks) {
      setAside(d); updateUI();
      await sleep(330);
      if (tk !== game.token) return;
    }
    const remaining = table.length - picks.length;
    const turnAfter = game.turnScore + choice.score;
    await sleep(500);
    if (tk !== game.token) return;
    if (aiShouldBank(turnAfter, remaining)) {
      game.aiStatus = `${CONFIG.ai} pose la main sur ses gains.`;
      await bankAction();
      return;
    }
    game.aiStatus = remaining === 0 ? `${il()} ramasse les six dés…` : `${il()} tente sa chance avec ${remaining} dé${remaining > 1 ? 's' : ''}…`;
    if (remaining && remaining <= 2) react('tente', 0.6, 100);
    updateUI();
    await sleep(650);
  }
}
