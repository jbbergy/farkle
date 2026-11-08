// Réactions entre les deux joueurs : un sceau rond déplie une barre d’icônes ; la réaction choisie s’anime en haut au centre de l’écran, chez les deux.

import { $ } from '../outils.js';
import { envoyerReaction, nomAutre, peutReagir } from '../en-ligne.js';
import { game } from '../partie.js';
import { sfxPlace, sfxThud } from '../sons.js';

// ─── Les dessins (viewBox de 100 × 100). Les classes a-… sont animées par le CSS, seulement dans le médaillon ───
const INK = '#2a190c';
const LINE = `stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
const THIN = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
const svg = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
const star = (x, y, r, delay = 0, cls = 'a-spark') => `<path class="${cls}" style="animation-delay:${delay}s" fill="#e0a81e" ${THIN} d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;

const THUMB = `<rect x="11" y="46" width="20" height="42" rx="4" fill="#8e1e14" ${LINE}/>
  <path d="M31 50L45 46L52 17Q54 8 62 11Q71 14 69 27L65 41H83Q92 41 90 51L84 81Q82 88 74 88H31Z" fill="#efc48c" ${LINE}/>
  <path d="M65 54H87M63 67H85" fill="none" ${LINE}/>`;
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<g transform="rotate(${a} 50 50)"><line class="a-ray" x1="50" y1="-9" x2="50" y2="3" stroke="#b5401f" stroke-width="6" stroke-linecap="round"/></g>`).join('');

const LEAF = 'M50 50C38 41 25 35 29 20C32 9 46 10 50 20C54 10 68 9 71 20C75 35 62 41 50 50Z';
const CLOVER = `<g class="a-spin">${[0, 90, 180, 270].map((a) => `<path d="${LEAF}" transform="rotate(${a} 50 50)" fill="#3f9440" ${LINE}/>`).join('')}</g>`;

const LAUGH = `<circle cx="50" cy="50" r="41" fill="#f2c14e" ${LINE}/>
  <path d="M25 41Q33 28 42 41M58 41Q67 28 75 41" fill="none" ${LINE}/>
  <path d="M24 54H76Q74 86 50 86Q26 86 24 54Z" fill="#7a1510" ${LINE}/>`;
const tear = (x, cls) => `<path class="${cls}" d="M${x} 44q-8 12 0 17q8 -5 0 -17Z" fill="#3f8fd0" ${THIN}/>`;

const WINCE = `<circle cx="50" cy="60" r="37" fill="#e9b777" ${LINE}/>
  <path d="M25 46L41 54L25 62M75 46L59 54L75 62" fill="none" ${LINE}/>
  <path d="M30 80q7 -10 13 0q7 10 14 0q7 -10 13 0" fill="none" ${LINE}/>`;
const FALLING_DIE = `<g class="a-die"><rect x="37" y="-4" width="26" height="26" rx="4" fill="#f4e6c6" ${LINE}/><circle cx="44" cy="3" r="2.8" fill="${INK}"/><circle cx="56" cy="15" r="2.8" fill="${INK}"/></g>`;

const GLASS = `<path d="M30 12V24Q30 40 45 50Q30 60 30 76V88H70V76Q70 60 55 50Q70 40 70 24V12Z" fill="#f8efd9" ${LINE}/>`;
const SAND = '<path class="a-top" d="M36 25H64Q62 38 50 47Q38 38 36 25Z" fill="#c4811f"/><path class="a-bottom" d="M36 85Q44 68 50 65Q56 68 64 85Z" fill="#c4811f"/>';
const BARS = '<path d="M20 11H80M20 89H80" fill="none" stroke="#6b4526" stroke-width="9" stroke-linecap="round"/>';

const TANKARD = `<path d="M66 42H78Q87 42 87 52V64Q87 74 78 74H66" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
  <path d="M66 42H78Q87 42 87 52V64Q87 74 78 74H66" fill="none" stroke="#a86a32" stroke-width="5" stroke-linecap="round"/>
  <rect x="30" y="30" width="36" height="58" rx="5" fill="#a86a32" ${LINE}/>
  <path d="M31 48H65M31 72H65" fill="none" ${LINE}/>
  <path d="M26 36Q23 22 37 23Q42 12 52 18Q64 12 68 24Q77 28 70 37Z" fill="#fff6df" ${LINE}/>`;
const cheers = (t) => `<g transform="${t}"><g class="a-cheer">${TANKARD}</g></g>`;

// (identifiants en minuscules : le serveur refuse le reste)
const REACTIONS = [
  { id: 'bravo', text: 'Bien joué !', icon: svg(THUMB), scene: svg(`${RAYS}<g class="a-thumb">${THUMB}</g>`) },
  { id: 'veine', text: 'Quelle veine !', icon: svg(CLOVER),
    scene: svg(`${CLOVER}${star(10, 14, 11, 0.7)}${star(90, 18, 9, 1.05)}${star(90, 86, 11, 0.85)}${star(10, 84, 9, 1.2)}`) },
  { id: 'aie', text: 'Aïe, aïe, aïe !', icon: svg(`<g transform="translate(0 -8)">${WINCE}</g>`),
    scene: svg(`<g class="a-wince">${WINCE}</g>${FALLING_DIE}${star(15, 24, 11, 0.62, 'a-bang')}${star(85, 24, 11, 0.72, 'a-bang')}${star(50, 12, 9, 0.82, 'a-bang')}`) },
  { id: 'rire', text: 'Ha ha ha !', icon: svg(LAUGH), scene: svg(`<g class="a-laugh">${LAUGH}</g>${tear(9, 'a-tear-l')}${tear(91, 'a-tear-r')}`) },
  { id: 'vite', text: 'Alors, ça vient ?', icon: svg(`${GLASS}${SAND}${BARS}`), scene: svg(`<g class="a-flip">${GLASS}${SAND}${BARS}</g>`) },
  { id: 'sante', text: 'À ta santé !', icon: svg(`<g transform="translate(-7 0)">${TANKARD}</g>`),
    scene: svg(`${cheers('translate(70 22) scale(-0.7 0.7)')}${cheers('translate(30 22) scale(0.7)')}${star(50, 14, 12, 0.62, 'a-bang')}`) },
];
const PAUSE = 1500;  // entre deux réactions envoyées (le serveur en laisse passer une par seconde)
const SHOWN = 2500;  // comme l’animation react-medal dans le CSS

const btn = $('btn-react'), panel = $('react-panel'), stage = $('react-stage');
const atTable = () => game.online && game.phase !== 'menu' && game.phase !== 'over';
let resting = 0, stageTimer = null;

function togglePanel(open) {
  panel.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', String(open));
}
export const closeReactions = () => togglePanel(false);

function clearStage() {
  clearTimeout(stageTimer);
  stage.replaceChildren();
}
// La réaction s’anime en haut au centre (en portrait, juste sous les scores, qui occupent le haut de l’écran)
function play(who, r) {
  clearStage();
  const medal = document.createElement('div');
  medal.className = 'react-medal';
  medal.dataset.r = r.id;
  medal.setAttribute('role', 'img');
  medal.setAttribute('aria-label', `${who} : ${r.text}`);
  medal.innerHTML = r.scene;
  stage.style.top = matchMedia('(orientation: portrait)').matches ? `${$('scores').getBoundingClientRect().bottom + 12}px` : '';
  stage.append(medal);
  stageTimer = setTimeout(clearStage, SHOWN);
}
// Le bouton suit la partie et la connexion (appelé à chaque changement du bandeau de connexion, et chaque seconde)
export function syncReactions() {
  const here = atTable();
  btn.hidden = !here;
  btn.disabled = !peutReagir() || performance.now() < resting;
  if (!here || btn.disabled) togglePanel(false);
  if (!here) clearStage();
}
export function reactionRecue(id) {
  const r = REACTIONS.find((x) => x.id === id);
  if (!r || !atTable()) return;
  play(nomAutre(), r);
  sfxThud(0.4, 0, false); // on frappe à la table : on l’entend même sans regarder
}
function send(r) {
  envoyerReaction(r.id);
  resting = performance.now() + PAUSE;
  play('Toi', r);
  sfxPlace('wood');
  syncReactions();
  setTimeout(syncReactions, PAUSE);
}

export function initReactions() {
  panel.innerHTML = REACTIONS.map((r) => `<button class="react-icon" data-reaction="${r.id}" aria-label="${r.text}" title="${r.text}">${r.icon}</button>`).join('');
  btn.addEventListener('click', (e) => {
    const open = panel.classList.contains('hidden');
    togglePanel(open);
    if (e.detail) btn.blur(); // à la souris : le clavier reste aux dés
    else if (open) panel.querySelector('button').focus();
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-reaction]');
    if (b) send(REACTIONS.find((r) => r.id === b.dataset.reaction));
  });
  addEventListener('pointerdown', (e) => { if (!$('react-dock').contains(e.target)) togglePanel(false); });
}
