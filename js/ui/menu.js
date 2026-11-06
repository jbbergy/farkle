// Menu : adversaire, mise, durée, bourse, partie à reprendre, et retour au menu.

import { CONFIG, RULES } from '../config.js';
import { $, easeInOutCubic } from '../outils.js';
import { DIE_KINDS } from '../des-speciaux.js';
import { OPP, OPP_ORDER, OPPONENTS } from '../adversaires.js';
import { HAND_SIZE, STAKES, wallet } from '../bourse.js';
import { applyOppLook, restOnMat } from '../des.js';
import { cancelReplay } from '../lancer.js';
import { abandonner, demanderRevanche, pretePourMenu, quitterTable, table } from '../en-ligne.js';
import { pendingMatch, readMatch, setPendingMatch } from '../sauvegarde.js';
import { game, startGame } from '../partie.js';
import { initAudio, sfxCoins, sfxPlace } from '../sons.js';
import { stopTalk } from '../voix.js';
import { unframe } from '../cadrage.js';
import { fitModal } from './parchemin.js';
import { dieIcon, kindIcon } from './icones.js';
import { toggleSettings } from './reglages.js';

// L’adversaire choisi commente la mise et la durée ; la bourse s’anime quand elle a changé depuis la dernière fois.
export const LENGTHS = [
  { target: 2000, name: 'Une chope' },
  { target: 4000, name: 'Une soirée' },
  { target: 8000, name: 'Jusqu’à l’aube' },
];
function greeting() {
  const o = OPP();
  if (pendingMatch) return o.resume;
  if (game.lastResult === 'credit') return o.credit;
  if (game.lastResult === 'win') return o.win;
  if (game.lastResult === 'loss') return o.loss;
  if (game.lastResult === 'honneur-win') return o.honorWin;
  if (game.lastResult === 'honneur-loss') return o.honorLoss;
  if (wallet.purse >= 500) return o.rich;
  return o.hello;
}
function tavernSay(text) {
  const line = document.querySelector('.tavern-line');
  line.querySelector('.who').textContent = `— ${OPP().full}`;
  $('tavern-say').textContent = `« ${text} »`;
  line.classList.remove('say'); void line.offsetWidth; line.classList.add('say');
  fitModal($('menu').querySelector('.modal'));
}
// Une pile de pièces par palier de mise ; sans mise, une place vide sur la table
export const coinStack = (n) => `<svg class="coins" viewBox="0 0 30 26" aria-hidden="true" data-opt="2">${n ? Array.from({ length: n }, (_, i) =>
  `<ellipse cx="15" cy="${22.6 - i * 4.4}" rx="11" ry="3.4" class="c-side"/><ellipse cx="15" cy="${21 - i * 4.4}" rx="11" ry="3.4" class="c-top"/>`).join('')
  : '<ellipse cx="15" cy="21" rx="11" ry="3.4" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2.2 1.8"/>'}</svg>`;
// Bourse, mises, pot, dés en main et bouton de départ ; une mise plus forte que la bourse est grisée
export function renderMenu() {
  const o = OPP(), maxStake = Math.min(wallet.purse, o.maxStake);
  if (RULES.stake > maxStake) RULES.stake = [...STAKES].reverse().find((s) => s <= maxStake) || STAKES[0];
  document.querySelectorAll('#stake-choice button').forEach((b) => {
    const v = +b.dataset.stake, on = v === RULES.stake;
    b.disabled = v > maxStake;
    b.title = v > o.maxStake ? `${o.Name} ne mise pas autant` : b.disabled ? 'Ta bourse est trop légère' : '';
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
  // l’adversaire : son nom, son caractère et sa plus forte mise
  const oi = OPP_ORDER.indexOf(RULES.opponent);
  $('opp-name').textContent = o.full[0].toUpperCase() + o.full.slice(1);
  $('opp-desc').innerHTML = `${o.tag}<span class="opp-max"> · mise ${o.maxStake} au plus</span>`;
  document.querySelectorAll('.opp-stepper .step').forEach((b) => { b.disabled = !OPP_ORDER[oi + +b.dataset.oppStep]; });
  document.querySelectorAll('#target-choice button').forEach((b) => {
    const on = +b.dataset.target === RULES.target;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
  const li = LENGTHS.findIndex((l) => l.target === RULES.target);
  $('length-name').textContent = LENGTHS[li].name;
  $('length-points').textContent = `${RULES.target} points`;
  document.querySelectorAll('.length-stepper .step').forEach((b) => { b.disabled = !LENGTHS[li + +b.dataset.step]; });
  const honor = RULES.stake === 0, hand = honor ? [] : wallet.hand;
  $('pot-line').innerHTML = honor ? 'Pas de mise : on joue pour l’honneur, avec des dés ordinaires.'
    : `${CONFIG.ai} suit : <b>${RULES.stake * 2}</b> groschens sur la table.`;
  // partie en cours : le menu reste replié sur elle tant qu’on n’a pas demandé une nouvelle partie
  const fold = pendingMatch || table.aReprendre ? (menuFresh ? 'fresh' : 'folded') : '';
  $('menu').dataset.fold = fold;
  $('btn-menu-back').hidden = fold !== 'fresh'; $('btn-menu-rules').hidden = fold === 'fresh';
  // libellé court sur un écran étroit, pour tenir sur une ligne à côté du « ? »
  const [long, short] = fold === 'folded' ? ['Nouvelle partie', 'Nouvelle partie']
    : honor ? ['Jouer pour l’honneur', 'Sans mise'] : [`Miser ${RULES.stake} groschens`, `Miser ${RULES.stake}`];
  $('btn-start').innerHTML = `<span class="long">${long}</span><span class="short">${short}</span>`;
  $('btn-start').setAttribute('aria-label', long);
  $('hand-icons').innerHTML = Array.from({ length: HAND_SIZE }, (_, i) => (hand[i] ? kindIcon(hand[i]) : dieIcon(i + 1))).join('');
  const names = hand.map((id) => DIE_KINDS[id].name), plain = HAND_SIZE - names.length;
  const desc = names.length ? `${names.join(', ')}${plain ? ` et ${plain} dé${plain > 1 ? 's' : ''} ordinaire${plain > 1 ? 's' : ''}` : ''}` : 'Six dés ordinaires';
  $('btn-shop').setAttribute('aria-label', `${desc}. Ouvrir l’échoppe aux dés.`);
  // partie interrompue : on propose de la reprendre ; une nouvelle mise l’abandonne (avec sa mise)
  const m = pendingMatch;
  $('resume-card').hidden = !m || !!table.aReprendre;
  $('online-card').hidden = !table.aReprendre;
  if (table.aReprendre) {
    const other = table.noms[1 - table.place];
    $('online-resume-info').textContent = `${table.aReprendre.table.mise ? `Pot de ${table.aReprendre.table.mise * 2} groschens. ` : ''}${other} t’attend peut-être.`;
    $('btn-online-resume').textContent = `Reprendre contre ${other}`;
  }
  $('btn-start').classList.toggle('btn-wax', fold !== 'folded'); $('btn-start').classList.toggle('btn-wood', fold === 'folded');
  if (m) {
    $('resume-score').innerHTML = `Toi <b>${m.scores[0]}</b> · ${OPPONENTS[m.opponent].short} <b>${m.scores[1]}</b>`;
    $('resume-info').textContent = `En ${m.target} points, ${m.pot ? `pot de ${m.pot} groschens` : 'pour l’honneur'}. Une nouvelle partie l’abandonne.`;
  }
  showPurse();
  fitModal($('menu').querySelector('.modal'));
}
let shownPurse = null;
function showPurse() {
  const to = wallet.purse, from = shownPurse ?? to, badge = document.querySelector('.purse-badge');
  const els = document.querySelectorAll('.purse-amount');
  shownPurse = to;
  if (from === to) { els.forEach((e) => { e.textContent = to; }); return; }
  badge.classList.remove('gain', 'loss'); void badge.offsetWidth; badge.classList.add(to > from ? 'gain' : 'loss');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 900);
    els.forEach((e) => { e.textContent = Math.round(from + (to - from) * easeInOutCubic(k)); });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function chooseLength(target) {
  initAudio();
  RULES.target = target;
  sfxPlace('wood');
  tavernSay(OPP().lengths[LENGTHS.findIndex((l) => l.target === target)]);
  renderMenu();
}
// Changer d’adversaire : il s’assied, se présente, et ses dés prennent sa couleur
function chooseOpponent(id) {
  initAudio();
  RULES.opponent = id;
  try { localStorage.setItem('farkle.adversaire', id); } catch { /* stockage indisponible */ }
  sfxPlace('wood');
  applyOppLook();
  renderMenu();
  tavernSay(OPP().hello);
}
// « Nouvelle partie » déplie d’abord les réglages quand une partie attend ; « Retour » les replie
let menuFresh = false;
export function backToMenu() {
  game.token++; game.phase = 'menu'; cancelReplay(); menuFresh = false;
  if (game.online) { quitterTable(); pretePourMenu(); }
  unframe();
  $('gameover').classList.add('hidden'); $('hud').classList.add('hidden'); $('menu').classList.remove('hidden');
  document.body.dataset.screen = 'menu';
  renderMenu();
  tavernSay(greeting());
}

// Choix de la mise et de la durée, boutons du menu, puis l’adversaire salue
export function initMenu() {
  $('stake-choice').innerHTML = STAKES.map((v, i) =>
    `<button data-stake="${v}" aria-label="${v ? `${v} groschens` : 'Sans mise, pour l’honneur'}">${coinStack(i)}<b>${v}</b></button>`).join('');
  $('target-choice').innerHTML = LENGTHS.map((l) => `<button data-target="${l.target}"><b>${l.name}</b><small>${l.target} points</small></button>`).join('');
  document.querySelector('.opp-stepper').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-opp-step]');
    const next = b && OPP_ORDER[OPP_ORDER.indexOf(RULES.opponent) + +b.dataset.oppStep];
    if (next) chooseOpponent(next);
  });
  $('target-choice').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-target]');
    if (b) chooseLength(+b.dataset.target);
  });
  document.querySelector('.length-stepper').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-step]');
    const next = b && LENGTHS[LENGTHS.findIndex((l) => l.target === RULES.target) + +b.dataset.step];
    if (next) chooseLength(next.target);
  });
  $('btn-start').addEventListener('click', () => {
    initAudio();
    if ($('menu').dataset.fold === 'folded') { menuFresh = true; sfxPlace('wood'); renderMenu(); tavernSay(OPP().hello); $('btn-start').focus(); return; }
    menuFresh = false;
    startGame();
  });
  $('btn-menu-back').addEventListener('click', () => { menuFresh = false; sfxPlace('wood'); renderMenu(); tavernSay(greeting()); });
  $('btn-resume').addEventListener('click', () => { if (pendingMatch) { initAudio(); startGame(pendingMatch); } });
  $('btn-again').addEventListener('click', () => { initAudio(); if (game.online) demanderRevanche(); else startGame(); });
  $('btn-to-menu').addEventListener('click', backToMenu);
  // Quitter la partie en cours : elle reste gardée telle qu’au début du tour, à reprendre depuis le menu ;
  // les dés en l’air retournent sur le tapis de celui qui jouait
  $('btn-quit').addEventListener('click', () => {
    // à deux en ligne : c’est un abandon, à confirmer d’un second clic
    if (game.online) {
      const b = $('btn-quit');
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1'; b.textContent = 'Sûr ? Abandonner';
        setTimeout(() => { b.dataset.armed = ''; if (game.online) b.textContent = 'Abandonner la partie'; }, 4000);
        return;
      }
      b.dataset.armed = '';
      toggleSettings(false);
      abandonner();
      return;
    }
    toggleSettings(false);
    if (game.phase === 'menu' || game.phase === 'over') return;
    const side = game.current;
    stopTalk();
    setPendingMatch(readMatch());
    backToMenu();
    restOnMat(side);
  });
  $('stake-choice').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-stake]');
    if (!b || b.disabled) return;
    initAudio();
    RULES.stake = +b.dataset.stake;
    sfxCoins(0.35);
    tavernSay(OPP().stakes[RULES.stake]);
    renderMenu();
  });
  renderMenu();
  tavernSay(greeting());
}
