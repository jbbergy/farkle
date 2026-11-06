// Panneaux de la partie : scores, points du tour, sélection, boutons, conseil et messages.

import { CONFIG, isCoarse, RULES } from '../config.js';
import { $ } from '../outils.js';
import { dice } from '../des.js';
import { formatParts } from '../regles.js';
import { bankBlock, game, OPENING, selectionInfo, shownScores } from '../partie.js';
import { sfxTick } from '../sons.js';

export const el = {
  scores: [$('score-0'), $('score-1')], rows: [$('row-0'), $('row-1')], bars: [$('bar-0'), $('bar-1')],
  banner: $('turn-banner'), turnScore: $('turn-score'), selScore: $('sel-score'), selDetail: $('sel-detail'), hint: $('hint'),
  roll: $('btn-roll'), bank: $('btn-bank'), toast: $('toast'),
};
el.rollLbl = el.roll.querySelector('.lbl');
el.bankLbl = el.bank.querySelector('.lbl');
export function updateUI() {
  const sel = selectionInfo();
  const mine = game.current === 0;
  el.rows.forEach((r, i) => r.classList.toggle('active', game.current === i && game.phase !== 'menu' && game.phase !== 'over'));
  el.bars.forEach((b, i) => { b.style.width = `${Math.min(100, (game.scores[i] / RULES.target) * 100)}%`; });
  el.banner.textContent = mine ? 'À toi de jouer' : `${CONFIG.ai} joue`;
  el.turnScore.textContent = game.turnScore;
  el.selScore.textContent = sel.count ? (sel.valid ? `+${sel.score}` : '✗') : '—';
  el.selScore.classList.toggle('bad', sel.count > 0 && !sel.valid);
  const left = dice.filter((d) => d.state === 'table').length;
  const canRoll = mine && !game.bloque && (game.phase === 'idle' || (game.phase === 'choosing' && sel.valid));
  const block = mine && bankBlock(0, game.turnScore + sel.score);
  const canBank = mine && !game.bloque && game.phase === 'choosing' && sel.valid && !block;
  // sur téléphone, la combinaison prend la place du conseil : elle rappelle aussi pourquoi on ne peut pas encore garder
  const blockShort = block === 'final' ? `il te faut plus de ${game.scores[1] - game.scores[0]}` : `ouverture à ${OPENING}`;
  el.selDetail.textContent = sel.count ? (sel.valid ? formatParts(sel.parts) + (block ? ` · ${blockShort}` : '') : 'Combinaison incomplète') : '';
  el.roll.disabled = !canRoll;
  el.bank.disabled = !canBank;
  el.rollLbl.textContent = game.phase === 'choosing' && mine ? (left === 0 && sel.valid ? 'Relancer les 6' : `Relancer (${left})`) : 'Lancer';
  el.bankLbl.textContent = canBank ? `Garder ${game.turnScore + sel.score}` : 'Garder';

  // ce qui empêche encore de garder : dernier tour à gagner, ou score à ouvrir
  const need = game.finalFrom !== null ? `Dernier tour : il te faut plus de ${game.scores[1] - game.scores[0]} points.`
    : `Il te faut ${OPENING} points en un tour pour ouvrir ton score.`;
  let hint = '';
  if (!mine) hint = game.aiStatus;
  else if (game.phase === 'idle') hint = bankBlock(0, 0) ? need : 'Lance les dés pour commencer ton tour.';
  else if (game.phase === 'rolling') hint = 'Les dés roulent…';
  else if (game.phase === 'farkle') hint = 'Rien à garder. La main passe.';
  else if (game.phase === 'choosing') {
    if (!sel.count) hint = isCoarse ? 'Touche les dés qui rapportent pour les mettre de côté.' : 'Clique les dés qui rapportent, ou choisis-les avec les flèches et Espace.';
    else if (!sel.valid) hint = 'Ces dés ne forment pas une combinaison complète.';
    else if (left === 0) hint = 'Dés brûlants ! Relance les six sans perdre tes points.';
    else if (block) hint = `${need} Relance !`;
    else hint = 'Relance pour en gagner plus, ou garde tes points.';
  } else if (game.phase === 'banking') hint = 'Les pièces tintent…';
  el.hint.textContent = hint;
}
// Le score qui change grossit un instant (doré quand il monte, sombre quand il baisse), et le compteur qui monte
// fait tinter une pièce à chaque cinquantaine passée : on entend le score grimper sans avoir à le lire
const aimed = [0, 0], counted = [0, 0], ticks = [0, 0], lastTick = [0, 0];
function popScore(i, up) {
  const s = el.scores[i];
  s.classList.remove('pop', 'drop'); void s.offsetWidth; s.classList.add(up ? 'pop' : 'drop');
}
export function updateScoresDisplay(dt) {
  const t = performance.now();
  for (let i = 0; i < 2; i++) {
    const goal = game.scores[i];
    // un score posé d’un coup (nouvelle partie, reprise) ne s’anime pas
    if (goal !== aimed[i]) { if (shownScores[i] !== goal) { popScore(i, goal > aimed[i]); ticks[i] = 0; } aimed[i] = goal; }
    const before = Math.round(shownScores[i]);
    shownScores[i] += (goal - shownScores[i]) * Math.min(1, dt * 5);
    if (Math.abs(goal - shownScores[i]) < 0.5) shownScores[i] = goal;
    const now = Math.round(shownScores[i]), step = Math.floor(now / 50);
    if (now > before) {
      if (step > counted[i] && t - lastTick[i] > 55) { sfxTick(i, ticks[i]++); counted[i] = step; lastTick[i] = t; }
    } else counted[i] = step;
    if (now !== before || el.scores[i].textContent === '') el.scores[i].textContent = now;
  }
}
let toastTimer = null;
export function toast(main, sub = '', kind = 'info', ms = 1500) {
  const t = el.toast;
  t.dataset.kind = kind;
  t.querySelector('.t-main').textContent = main;
  t.querySelector('.t-sub').textContent = sub;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
