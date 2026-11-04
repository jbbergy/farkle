// Petits dés dessinés en SVG pour l’interface (règles, échoppe, menu).

import { DIE_KINDS } from '../des-speciaux.js';

// Petit dé dessiné en SVG, avec les points « cercle et point » des dés en os
const PIPS = {
  1: [[12, 12]], 2: [[7, 7], [17, 17]], 3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]], 5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6.5], [17, 6.5], [7, 12], [17, 12], [7, 17.5], [17, 17.5]],
};
// v = 0 : tête cornue (joker). `look` : couleurs d’un dé spécial ({ body, pip }).
const HORNS_SVG = '<path class="dot" d="M9.5 11.2Q6.3 9.3 6.1 4.4Q8.4 8 11.2 9.9ZM14.5 11.2Q17.7 9.3 17.9 4.4Q15.6 8 12.8 9.9Z"/>' +
  '<ellipse class="ring" cx="12" cy="13.5" rx="3.6" ry="4"/><ellipse class="dot" cx="10.5" cy="12.6" rx="0.9" ry="0.5" transform="rotate(26 10.5 12.6)"/>' +
  '<ellipse class="dot" cx="13.5" cy="12.6" rx="0.9" ry="0.5" transform="rotate(-26 13.5 12.6)"/><path class="ring" d="M13.5 14.9A1.7 1.7 0 0 1 10.5 14.9"/>';
export const dieIcon = (v, look = null) => `<svg class="die-ico" viewBox="0 0 24 24" role="img" aria-label="${v || 'tête cornue'}"${
  look ? ` style="--body:${look.body};--pip:${look.pip}"` : ''}><rect x="1.5" y="1.5" width="21" height="21" rx="4.5"/>${v === 0 ? HORNS_SVG :
  PIPS[v].map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="${v === 1 ? 2.9 : 2.1}"/>${
    v === 1 ? `<circle class="ring" cx="${x}" cy="${y}" r="4.3"/>` : ''}`).join('')}</svg>`;
export const diceIcons = (...vs) => vs.map((v) => dieIcon(v)).join('');
// Un dé spécial montré par sa face la plus fréquente (ou sa tête cornue)
export const kindIcon = (id) => { const k = DIE_KINDS[id]; return dieIcon(k.joker ? 0 : k.w.indexOf(Math.max(...k.w)) + 1, k); };
