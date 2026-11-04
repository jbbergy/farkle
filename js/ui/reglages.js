// Réglages : taille du texte, cadrage des dés, sons, voix et règles de la maison.

import { isCoarse } from '../config.js';
import { $ } from '../outils.js';
import { TALK } from '../repliques.js';
import { applyLayout, resetView } from '../scene.js';
import { game, house, saveHouse } from '../partie.js';
import { audio, initAudio, setSound } from '../sons.js';
import { chooseLine, playAnecdote, say, talk } from '../voix.js';
import { autoFrame, frameDice, setAutoFrame } from '../cadrage.js';

// Réglages : taille du texte et cadrage des dés, puis musique, ambiance et bruitages qui se coupent séparément (choix mémorisés)
export const settingsBtn = $('btn-settings'), settingsPanel = $('settings-panel');
function syncSoundUI() {
  settingsPanel.querySelectorAll('input[data-bus]').forEach((i) => { i.checked = audio.on[i.dataset.bus]; });
  settingsPanel.querySelectorAll('input[data-house]').forEach((i) => { i.checked = house[i.dataset.house]; });
  settingsPanel.querySelector('input[data-view]').checked = autoFrame;
}
export function toggleSettings(open = settingsPanel.classList.contains('hidden')) {
  settingsPanel.classList.toggle('hidden', !open);
  settingsBtn.setAttribute('aria-expanded', String(open));
}
// « Essayer » : faire entendre tout de suite une anecdote ou une réaction des clients
const REACTION_CATS = Object.keys(TALK).filter((c) => c !== 'anecdote');

// Taille de l’interface : trois niveaux (texte et panneaux), plus grand par défaut sur ordinateur
const UI_SCALES = { 1: 1, 2: 1.25, 3: 1.5 };
let uiLevel = isCoarse ? 1 : 2;
try { const saved = +localStorage.getItem('farkle.taille'); if (UI_SCALES[saved]) uiLevel = saved; } catch { /* stockage indisponible */ }
function setUiLevel(level, save = false) {
  uiLevel = level;
  document.documentElement.style.setProperty('--ui', UI_SCALES[level]);
  document.documentElement.dataset.ui = level;
  document.querySelectorAll('[data-size-choice] button').forEach((b) => {
    const on = +b.dataset.ui === level;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
  if (save) try { localStorage.setItem('farkle.taille', level); } catch { /* stockage indisponible */ }
  requestAnimationFrame(applyLayout); // les panneaux ont changé de taille : on recadre le plateau
}

// Panneau des réglages et choix de la taille du texte
export function initSettings() {
  settingsBtn.addEventListener('click', () => { initAudio(); toggleSettings(); });
  settingsPanel.addEventListener('change', (e) => {
    const { bus, house: rule, view: framing } = e.target.dataset;
    if (rule) { house[rule] = e.target.checked; saveHouse(); return; }
    if (framing) {
      setAutoFrame(e.target.checked);
      try { localStorage.setItem('farkle.cadrage', autoFrame ? '1' : '0'); } catch { /* stockage indisponible */ }
      if (!autoFrame) resetView(); else if (game.phase === 'choosing') frameDice();
      return;
    }
    if (!bus) return;
    initAudio(); setSound(bus, e.target.checked); syncSoundUI();
  });
  addEventListener('pointerdown', (e) => { if (!$('corner').contains(e.target)) toggleSettings(false); });
  syncSoundUI();
  settingsPanel.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-try]');
    if (!b) return;
    initAudio();
    if (!audio.on.voices) { setSound('voices', true); syncSoundUI(); }
    await talk.ready;
    if (b.dataset.try === 'anecdote') playAnecdote(true);
    else for (let i = 0; i < 12 && !say(chooseLine(REACTION_CATS[(Math.random() * REACTION_CATS.length) | 0])); i++);
  });
  document.querySelectorAll('[data-size-choice]').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ui]');
    if (b) setUiLevel(+b.dataset.ui, true);
  }));
  setUiLevel(uiLevel);
}
