// Vibrations du téléphone : chocs des dés, coup sur la table, Farkle et victoire.
// Seulement sur les écrans tactiles dont le navigateur sait faire vibrer (Chrome sur Android ; pas l’iPhone).
// Le réglage « Vibrations » est gardé dans farkle.vibrations.

import { isCoarse } from './config.js';

export const canVibrate = isCoarse && typeof navigator.vibrate === 'function';
export let vibrations = true;
try { vibrations = localStorage.getItem('farkle.vibrations') !== '0'; } catch { /* activées */ }
export function setVibrations(on) {
  vibrations = on;
  try { localStorage.setItem('farkle.vibrations', on ? '1' : '0'); } catch { /* stockage indisponible */ }
  if (on) buzz(40);
}

// `pattern` : durée en ms, ou [vibre, pause, vibre…] comme navigator.vibrate
export function buzz(pattern) {
  if (!canVibrate || !vibrations || document.hidden) return;
  try { navigator.vibrate(pattern); } catch { /* refusé avant le premier geste du joueur */ }
}
// Choc d’un dé (force de 0 à 12 environ, comme les bruits) : une impulsion brève, pas plus d’une toutes les 70 ms,
// pour qu’une volée de dés se sente sans bourdonner
let lastHit = 0;
export function buzzHit(strength) {
  if (strength < 5) return;
  const now = performance.now();
  if (now - lastHit < 70) return;
  lastHit = now;
  buzz(Math.round(12 + Math.min(1, strength / 14) * 18));
}
export const buzzFarkle = () => buzz(280);
export const buzzVictory = () => buzz([90, 110, 90]);
export const buzzBang = () => buzz(55);
