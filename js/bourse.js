// Bourse du joueur : groschens, dés spéciaux achetés et main de six dés (gardés dans le navigateur).

import { DIE_KINDS } from './des-speciaux.js';

// Chacun mise autant que l’autre ; le gagnant empoche le pot. Une bourse vide est renflouée par le Tavernier.
// Mise 0 : partie pour l’honneur, sans groschens ni dés spéciaux.
export const STAKES = [0, 10, 25, 50, 100];
export const MIN_STAKE = 10, PURSE_START = 100, CREDIT = 20, HAND_SIZE = 6;
export const wallet = { purse: PURSE_START, owned: {}, hand: [] };
try {
  const saved = JSON.parse(localStorage.getItem('farkle.bourse'));
  if (saved && Number.isFinite(saved.purse)) {
    wallet.purse = Math.max(0, Math.floor(saved.purse));
    for (const [id, n] of Object.entries(saved.owned || {})) if (DIE_KINDS[id] && n > 0) wallet.owned[id] = Math.min(n | 0, DIE_KINDS[id].max || HAND_SIZE);
    for (const id of saved.hand || []) if (wallet.hand.length < HAND_SIZE && inHand(id) < (wallet.owned[id] || 0)) wallet.hand.push(id);
  }
} catch { /* stockage indisponible : bourse de départ */ }
if (wallet.purse < MIN_STAKE) wallet.purse += CREDIT;
export function inHand(id) { return wallet.hand.filter((h) => h === id).length; }
export function saveWallet() {
  try { localStorage.setItem('farkle.bourse', JSON.stringify(wallet)); } catch { /* stockage indisponible */ }
}
