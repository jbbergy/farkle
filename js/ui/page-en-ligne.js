// Fenêtre « Jouer à deux » : créer une table (nom, dés spéciaux, mise, durée), attendre l’autre avec le code, ou rejoindre une table.

import { RULES } from '../config.js';
import { $ } from '../outils.js';
import { DIE_KINDS } from '../des-speciaux.js';
import { STAKES, wallet } from '../bourse.js';
import { creerTable, estEnLigne, libererConnexion, quitterTable, rejoindreTable, saveName, savedName, table, voirTable } from '../en-ligne.js';
import { house } from '../partie.js';
import { initAudio, sfxCoins, sfxPlace } from '../sons.js';
import { coinStack, LENGTHS, renderMenu } from './menu.js';
import { fitModal } from './parchemin.js';

const ERRORS = {
  introuvable: 'Aucune table ne porte ce code. Vérifie-le auprès de celui qui te l’a envoyé.',
  pleine: 'Cette table a déjà ses deux joueurs.',
  nom: 'Il faut un nom pour s’asseoir à la table.',
  trop: 'Trop d’essais : attends quelques minutes.',
  complet: 'La taverne est pleine pour l’instant : réessaie plus tard.',
  options: 'Ces réglages ne sont pas valables.',
  reseau: 'Le serveur ne répond pas. Vérifie ta connexion et réessaie.',
};
const form = { view: 'accueil', nom: '', code: '', speciaux: true, mise: 0, cible: 4000, info: null, error: '', busy: false };
const NAME_MAX = 12, CODE_LEN = 5;

const nameField = () => `<label class="online-field"><span class="field-label">Ton nom</span>
  <input id="online-name" type="text" maxlength="${NAME_MAX}" autocomplete="nickname" spellcheck="false" enterkeyhint="go" /></label>`;
const lengthName = (target) => LENGTHS.find((l) => l.target === target)?.name || '';
const handNames = () => {
  const names = wallet.hand.map((id) => DIE_KINDS[id].name);
  return names.length ? names.join(', ') : 'six dés ordinaires : ta main est vide';
};
const inviteUrl = (code) => `${location.origin}${location.pathname}?partie=${code}`;
const stakeLabel = (mise) => (mise ? `${mise} groschens chacun` : 'Sans mise, pour l’honneur');

const VIEWS = {
  accueil: () => ({
    title: 'Jouer à deux',
    body: `<p class="lede">Une partie contre quelqu’un d’autre, chacun sur son écran.</p>
      <div class="online-choices">
        <button class="btn btn-wax" data-go="creer">Créer une partie</button>
        <button class="btn btn-wood" data-go="rejoindre">Rejoindre une partie</button>
      </div>
      ${estEnLigne() ? '' : '<p class="online-error">Ce mode demande une connexion à Internet.</p>'}`,
    actions: '<button class="btn btn-ghost" data-close>Retour au menu</button>',
  }),
  creer: () => ({
    title: 'Créer une partie',
    body: `${nameField()}
      <div class="online-field" role="group" aria-labelledby="online-dice-label">
        <div class="field-label" id="online-dice-label">Dés spéciaux</div>
        <div class="lengths online-two">
          <button data-special="1"><b>Autorisés</b></button><button data-special="0"><b>Interdits</b></button>
        </div>
      </div>
      <div class="online-field" role="group" aria-labelledby="online-stake-label">
        <div class="field-label" id="online-stake-label">Mise de chacun</div>
        <div class="stakes">${STAKES.map((v, i) => `<button data-mise="${v}" aria-label="${v ? `${v} groschens` : 'Sans mise, pour l’honneur'}"${v > wallet.purse ? ' disabled title="Ta bourse est trop légère"' : ''}>${coinStack(i)}<b>${v}</b></button>`).join('')}</div>
      </div>
      <div class="online-field" role="group" aria-labelledby="online-length-label">
        <div class="field-label" id="online-length-label">Durée de la partie</div>
        <div class="lengths online-lengths">${LENGTHS.map((l) => `<button data-cible="${l.target}"><b>${l.name}</b><small>${l.target} points</small></button>`).join('')}</div>
      </div>`,
    actions: `<button class="btn btn-wax" data-do="creer">Créer la table</button><button class="btn btn-ghost" data-go="accueil">Retour</button>`,
  }),
  attente: () => {
    const { code, mise, cible, speciaux } = table.info;
    return {
      title: 'Ta table est prête',
      body: `<p class="lede">Envoie ce code à l’autre joueur :</p>
        <p class="online-code" aria-label="Code : ${code.split('').join(' ')}">${code}</p>
        <div class="online-choices online-share">
          ${navigator.share ? '<button class="btn btn-wax" data-do="partager">Partager</button>' : ''}
          <button class="btn btn-wood" data-do="copier">Copier le lien</button>
        </div>
        <p class="online-status" role="status" id="online-status"></p>
        <p class="online-summary">${stakeLabel(mise)} · ${lengthName(cible)} · dés spéciaux ${speciaux ? 'autorisés' : 'interdits'}</p>
        <p class="online-wait">En attente de l’autre joueur…</p>`,
      actions: '<button class="btn btn-ghost" data-do="annuler">Fermer la table</button>',
    };
  },
  rejoindre: () => ({
    title: 'Rejoindre une partie',
    body: `<label class="online-field"><span class="field-label">Le code reçu</span>
        <input id="online-code" class="online-code-input" type="text" maxlength="${CODE_LEN}" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" /></label>
      ${nameField()}`,
    actions: `<button class="btn btn-wax" data-do="voir">Voir la table</button><button class="btn btn-ghost" data-go="accueil">Retour</button>`,
  }),
  confirmer: () => {
    const { maitre, mise, cible, speciaux } = form.info, missing = mise - wallet.purse;
    return {
      title: 'Avant de t’asseoir',
      body: `<dl class="online-table">
          <dt>Maître</dt><dd id="online-host"></dd>
          <dt>Mise</dt><dd>${stakeLabel(mise)}</dd>
          <dt>Durée</dt><dd>${lengthName(cible)} (${cible} points)</dd>
          <dt>Dés spéciaux</dt><dd>${speciaux ? `Autorisés. Les tiens : ${handNames()}.` : 'Interdits : dés ordinaires pour tous.'}</dd>
          <dt>Ta bourse</dt><dd>${wallet.purse} groschens</dd>
        </dl>
        ${missing > 0 ? `<p class="online-error" role="alert">Il te manque ${missing} groschens pour t’asseoir à cette table.</p>` : ''}`,
      actions: `${missing > 0 ? '' : `<button class="btn btn-wax" data-do="rejoindre">${mise ? `Miser ${mise} et s’asseoir` : 'S’asseoir à la table'}</button>`}<button class="btn btn-ghost" data-go="rejoindre">Retour</button>`,
      after: () => { $('online-host').textContent = maitre; },
    };
  },
};

function render(focus = true) {
  const v = VIEWS[form.view]();
  $('online-body').innerHTML = `<h2 id="online-title">${v.title}</h2>${v.body}<p class="online-error" role="alert" id="online-error"></p>`;
  $('online-actions').innerHTML = v.actions;
  v.after?.();
  $('online-error').textContent = form.error;
  $('online-error').hidden = !form.error;
  const name = $('online-name'), code = $('online-code');
  if (name) name.value = form.nom;
  if (code) code.value = form.code;
  syncChoices();
  $('online-body').querySelectorAll('button, input').forEach((e) => { if (form.busy) e.disabled = true; });
  fitModal($('online').querySelector('.modal'));
  if (focus) (code && !form.code ? code : name && !name.value ? name : $('online-actions').querySelector('button'))?.focus({ preventScroll: true });
}
function syncChoices() {
  const body = $('online-body');
  const mark = (b, on) => { b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); };
  body.querySelectorAll('[data-special]').forEach((b) => mark(b, (b.dataset.special === '1') === form.speciaux));
  body.querySelectorAll('[data-mise]').forEach((b) => mark(b, +b.dataset.mise === form.mise));
  body.querySelectorAll('[data-cible]').forEach((b) => mark(b, +b.dataset.cible === form.cible));
}
function go(view) {
  readInputs();
  form.view = view; form.error = '';
  render();
}
function readInputs() {
  const name = $('online-name'), code = $('online-code');
  if (name) form.nom = name.value;
  if (code) form.code = code.value;
}
function fail(raison) {
  form.busy = false;
  form.error = ERRORS[raison] || ERRORS.reseau;
  render(false);
}
function cleanNameInput() {
  form.nom = form.nom.trim();
  if (form.nom) saveName(form.nom);
  return form.nom;
}

const ACTIONS = {
  async creer() {
    if (!cleanNameInput()) return fail('nom');
    form.busy = true;
    try {
      const m = await creerTable(form.nom, { mise: form.mise, cible: form.cible, speciaux: form.speciaux, maison: { ...house } });
      if (m.t === 'erreur') return fail(m.raison);
      form.busy = false; form.error = '';
      form.view = 'attente';
      sfxCoins(0.35);
      render();
    } catch { fail('reseau'); }
  },
  async voir() {
    if (form.code.length !== CODE_LEN) return fail('introuvable');
    if (!cleanNameInput()) return fail('nom');
    form.busy = true;
    try {
      const m = await voirTable(form.code);
      if (m.t === 'erreur') return fail(m.raison);
      form.busy = false; form.error = ''; form.info = m.table;
      form.view = 'confirmer';
      sfxPlace('wood');
      render();
    } catch { fail('reseau'); }
  },
  async rejoindre() {
    form.busy = true;
    try {
      const m = await rejoindreTable(form.code, form.nom);
      if (m.t === 'erreur') { form.view = 'rejoindre'; return fail(m.raison); }
      form.busy = false; // la partie commence dès que le serveur l’annonce (lancerManche)
    } catch { fail('reseau'); }
  },
  annuler() {
    quitterTable();
    sfxPlace('wood');
    form.view = 'accueil';
    render();
  },
  async partager() {
    const code = table.info.code;
    try { await navigator.share({ title: 'Farkle', text: `Viens jouer au Farkle avec moi ! Code de la table : ${code}`, url: inviteUrl(code) }); } catch { /* partage annulé */ }
  },
  async copier() {
    const status = $('online-status');
    try {
      await navigator.clipboard.writeText(inviteUrl(table.info.code));
      status.textContent = 'Lien copié.';
    } catch { status.textContent = `Le lien : ${inviteUrl(table.info.code)}`; }
  },
};

export function ouvrirEnLigne(view = table.code && table.info && !table.noms[0] ? 'attente' : 'accueil') {
  initAudio();
  form.nom = form.nom || savedName();
  form.mise = STAKES.includes(RULES.stake) && RULES.stake <= wallet.purse ? RULES.stake : 0;
  form.cible = RULES.target;
  form.view = view; form.error = ''; form.busy = false;
  $('menu').classList.add('hidden');
  $('online').classList.remove('hidden');
  render();
}
export function fermerEnLigne() {
  $('online').classList.add('hidden');
}
// La fenêtre se referme ; au menu, s’il n’y a pas de table en jeu
export function closeOnline() {
  if ($('online').classList.contains('hidden') || form.view === 'attente') return;
  readInputs();
  fermerEnLigne();
  libererConnexion();
  $('menu').classList.remove('hidden');
  renderMenu();
}
// Une table retrouvée en rechargeant la page, encore sans second joueur
export function montrerAttente() { ouvrirEnLigne('attente'); }

export function initOnlinePage() {
  $('btn-menu-online').addEventListener('click', () => { sfxPlace('wood'); ouvrirEnLigne(); });
  const panel = $('online');
  panel.addEventListener('click', (e) => {
    if (e.target.id === 'online') { closeOnline(); return; }
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    initAudio();
    const { go: view, do: action, special, mise, cible } = b.dataset;
    if (view) { sfxPlace('wood'); go(view); }
    else if (action) { readInputs(); ACTIONS[action](); }
    else if (b.hasAttribute('data-close')) { sfxPlace('wood'); closeOnline(); }
    else if (special !== undefined) { form.speciaux = special === '1'; sfxPlace('wood'); syncChoices(); }
    else if (mise !== undefined) { form.mise = +mise; sfxCoins(0.35); syncChoices(); }
    else if (cible !== undefined) { form.cible = +cible; sfxPlace('wood'); syncChoices(); }
  });
  panel.addEventListener('input', (e) => {
    if (e.target.id === 'online-code') {
      const c = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LEN);
      if (e.target.value !== c) e.target.value = c;
      form.code = c;
    } else if (e.target.id === 'online-name') form.nom = e.target.value;
  });
  // Entrée valide le champ, comme le bouton principal (pas de <form> : la page n’envoie rien)
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (e.target.id === 'online-code' && $('online-name') && !$('online-name').value) { $('online-name').focus(); return; }
    $('online-actions').querySelector('.btn-wax')?.click();
  });
  // Arrivée par un lien d’invitation
  const params = new URLSearchParams(location.search), code = (params.get('partie') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LEN);
  if (params.has('partie')) history.replaceState(null, '', location.pathname);
  if (code) { form.code = code; ouvrirEnLigne('rejoindre'); }
}
