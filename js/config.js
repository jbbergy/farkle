// Réglages du jeu : dimensions de la table, objectif et mise, adversaire choisi, textures personnalisées, type d’écran.

import { OPP } from './adversaires.js';

export const CONFIG = {
  get ai() { return OPP().Name; },       // l’adversaire choisi, en début de phrase
  get aiLower() { return OPP().name; },  // en milieu de phrase
  play: { halfW: 7, halfD: 4.5 },          // zone de lancer (murs invisibles)
  board: { w: 14.6, d: 9.6, h: 0.6 },      // plateau en chêne
  tableY: -0.6,                            // dessus de la table
  reserveZ: 5.75,                          // rangée des dés mis de côté (±z)
  reserveX: 8.45,                          // idem en portrait, aux deux bouts du plateau (±x)
  gravity: -55,                            // gravité « nerveuse » pour des dés d’une unité
};

export const RULES = { target: 4000, stake: 25, opponent: 'tavernier' };
// (Kuba était « l’ivrogne » avant d’être palefrenier : identifiant « ivrogne »)
export const oppId = (id) => (id === 'ivrogne' ? 'palefrenier' : id);
try { const saved = oppId(localStorage.getItem('farkle.adversaire')); if (['chevalier', 'palefrenier', 'vieux', 'servante', 'tavernier'].includes(saved)) RULES.opponent = saved; } catch { /* le Tavernier */ }

// Textures personnalisées : laisse `null` pour les textures procédurales.
// Chemins relatifs à la page (index.html), ex. 'textures/chene_color.jpg'.
// Pour les dés : tableau de 6 images, index 0 = face « 1 » … index 5 = face « 6 ».
export const TEXTURES = {
  boardColor: null, boardBump: null, boardNormal: null, boardRoughness: null,
  tableColor: null, tableBump: null, tableNormal: null,
  diceColor: null,   // ['textures/de_1.png', …, 'textures/de_6.png']
  diceBump: null,    // niveaux de gris : noir = creux gravé
  diceNormal: null,
};

// Écran tactile (téléphone, tablette) : on joue au doigt
export const isCoarse = matchMedia('(pointer: coarse)').matches;
// Téléphone ou tablette : rendu allégé (définition, ombres, textures, cadence), voir aussi frame() et adaptResolution()
export const LOW_POWER = isCoarse;
