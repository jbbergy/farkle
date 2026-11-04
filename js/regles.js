// Règles et score : combinaisons, points, et ce qui peut être mis de côté.

import { faceValue } from './des-speciaux.js';

const KIND_NAMES = { 3: 'Brelan de', 4: 'Carré de', 5: 'Cinq', 6: 'Six' };
const kindBase = (v) => (v === 1 ? 1000 : v * 100);
const kindMult = (n) => ({ 3: 1, 4: 2, 5: 4, 6: 8 })[n];

const STRAIGHTS = [[[1, 2, 3, 4, 5, 6], 1500, 'Suite 1→6'], [[1, 2, 3, 4, 5], 500, 'Suite 1→5'], [[2, 3, 4, 5, 6], 750, 'Suite 2→6']];

// Meilleur score en utilisant TOUS les dés donnés, ou null si un dé ne rapporte rien.
// counts[1..6] : nombre de dés par face ; counts[0] : jokers (tête cornue du Dé du Cornu).
// Un joker remplace n’importe quel chiffre dans une combinaison (brelan, carré, suite…), mais ne rapporte rien seul.
export function scoreAll(counts) {
  const memo = new Map();
  const rec = (c) => {
    const key = c.join('');
    if (memo.has(key)) return memo.get(key);
    let v = 1;
    while (v <= 6 && c[v] === 0) v++;
    if (v > 6) return c[0] ? null : { score: 0, parts: [] };
    let best = null;
    // on ne teste que les combinaisons qui consomment la plus petite face présente ;
    // les faces qui manquent sont prises aux jokers
    const tryCombo = (use, pts, label) => {
      const nc = c.slice();
      let jokers = 0;
      for (const [face, n] of use) { const real = Math.min(nc[face], n); nc[face] -= real; jokers += n - real; }
      if (jokers > nc[0]) return;
      nc[0] -= jokers;
      const r = rec(nc);
      if (jokers) label += ' (avec le joker)';
      if (r && (!best || r.score + pts > best.score)) best = { score: r.score + pts, parts: [{ label, pts }, ...r.parts] };
    };
    if (v === 1) tryCombo([[1, 1]], 100, 'Un 1');
    if (v === 5) tryCombo([[5, 1]], 50, 'Un 5');
    for (let n = 3; n <= Math.min(6, c[v] + c[0]); n++) tryCombo([[v, n]], kindBase(v) * kindMult(n), `${KIND_NAMES[n]} ${v}`);
    for (const [faces, pts, label] of STRAIGHTS) if (faces.includes(v)) tryCombo(faces.map((f) => [f, 1]), pts, label);
    memo.set(key, best);
    return best;
  };
  return rec(counts);
}
export function hasScore(c) {
  if (c[1] || c[5]) return true;
  for (let v = 2; v <= 6; v++) if (c[v] && c[v] + c[0] >= 3) return true;
  // suite 2→6 (les autres suites contiennent un 1, déjà compté)
  let missing = 0;
  for (let v = 2; v <= 6; v++) if (!c[v]) missing++;
  return missing <= c[0];
}
// Toutes les mises de côté valides d’un lancer
export function enumerateSubsets(counts) {
  const out = [], k = [0, 0, 0, 0, 0, 0, 0];
  const recur = (v) => {
    if (v > 6) {
      const n = k[0] + k[1] + k[2] + k[3] + k[4] + k[5] + k[6];
      if (n) { const r = scoreAll(k); if (r && r.score > 0) out.push({ counts: k.slice(), score: r.score, parts: r.parts, n }); }
      return;
    }
    for (let i = 0; i <= counts[v]; i++) { k[v] = i; recur(v + 1); }
    k[v] = 0;
  };
  recur(0);
  return out;
}
export function clickableValues(counts) {
  const s = new Set();
  for (const sub of enumerateSubsets(counts)) for (let v = 0; v <= 6; v++) if (sub.counts[v]) s.add(v);
  return s;
}
export function countValues(list) { const c = [0, 0, 0, 0, 0, 0, 0]; for (const d of list) c[faceValue(d)]++; return c; }
export function formatParts(parts) {
  const m = new Map();
  for (const p of parts) m.set(p.label, (m.get(p.label) || 0) + 1);
  return [...m].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(' · ');
}
