// Page du carnet : parties contre chaque adversaire, records et hauts faits.

import { $ } from '../outils.js';
import { OPP_ORDER, OPPONENTS } from '../adversaires.js';
import { wallet } from '../bourse.js';
import { carnet, FEATS } from '../carnet.js';
import { initAudio, sfxPlace } from '../sons.js';

function carnetHTML() {
  const pct = carnet.games ? ` (${Math.round((carnet.wins / carnet.games) * 100)} %)` : '';
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const vs = OPP_ORDER.filter((id) => carnet.vs[id]).map((id) => {
    const r = carnet.vs[id], o = OPPONENTS[id];
    return `<tr><td>Contre ${o.full}</td><td>${plural(r.w, 'victoire')} · ${plural(r.l, 'défaite')}</td></tr>`;
  }).join('') + (carnet.vs.ami ? `<tr><td>Contre d’autres joueurs</td><td>${plural(carnet.vs.ami.w, 'victoire')} · ${plural(carnet.vs.ami.l, 'défaite')}</td></tr>` : '');
  const got = FEATS.filter((f) => carnet.feats[f.id]).length;
  const date = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const feats = FEATS.map((f) => {
    const t = carnet.feats[f.id];
    return `<div class="feat${t ? ' got' : ''}"><span class="seal" aria-hidden="true">${t ? '✓' : ''}</span>
      <div><b>${f.name}</b>${f.desc}${t ? `<small>Obtenu le ${date(t)}</small>` : '<small>Pas encore</small>'}</div></div>`;
  }).join('');
  return `<h2 id="carnet-title">Ton carnet</h2>
    <p class="lede">Ta bourse : <b>${wallet.purse}</b> groschens</p>
    <h3>Tes parties</h3>
    <table class="rules-table carnet-table">
      <tr><td>Parties jouées</td><td>${carnet.games}</td></tr>
      <tr><td>Victoires</td><td>${carnet.wins}${pct}</td></tr>
      ${vs}
    </table>
    <h3>Tes records</h3>
    <table class="rules-table carnet-table">
      <tr><td>Meilleur tour</td><td>${carnet.bestTurn} points</td></tr>
      <tr><td>Plus gros pot gagné</td><td>${carnet.bestPot} groschens</td></tr>
      <tr><td>Bourse la plus pleine</td><td>${carnet.purseMax} groschens</td></tr>
      <tr><td>Dés brûlants</td><td>${carnet.hot} fois</td></tr>
      <tr><td>Farkles</td><td>${carnet.farkles}</td></tr>
    </table>
    <h3>Hauts faits · ${got} sur ${FEATS.length}</h3>
    <div class="feats">${feats}</div>`;
}
function openCarnet() {
  initAudio();
  $('carnet-body').innerHTML = carnetHTML();
  $('carnet-body').scrollTop = 0;
  $('menu').classList.add('hidden');
  $('carnet').classList.remove('hidden');
  sfxPlace('leather');
}
export function closeCarnet() {
  if ($('carnet').classList.contains('hidden')) return;
  $('carnet').classList.add('hidden');
  $('menu').classList.remove('hidden');
}

// Boutons du carnet
export function initCarnet() {
  $('btn-carnet').addEventListener('click', openCarnet);
  $('btn-carnet-close').addEventListener('click', closeCarnet);
  $('carnet').addEventListener('click', (e) => { if (e.target.id === 'carnet') closeCarnet(); });
}
