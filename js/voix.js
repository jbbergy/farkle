// Voix de la taverne : chargement des répliques, anecdotes, réactions aux coups et impatience de l’adversaire.

import { RULES } from './config.js';
import { $, rand } from './outils.js';
import { ABOUT_TAVERNIER, NOT_VS, ONLY_VS, OPP_TALK, oppLines, OWN_MOMENT, PATRONS, PLAYER_STARTS, TALK } from './repliques.js';
import { enumerateSubsets } from './regles.js';
import { game } from './partie.js';
import { audio, duckMusic, loadAudio } from './sons.js';

export const talk = { buffers: {}, bags: {}, current: null, busyUntil: 0, lastReaction: 0, nextAnecdote: 0, ready: null, oppLoaded: null };

// Les réactions sont chargées d’avance (elles doivent partir tout de suite) ; les anecdotes, longues,
// seulement au moment de les dire, puis oubliées : moins de mémoire sur téléphone (voir playAnecdote)
export async function loadVoices() {
  const ids = Object.entries(TALK).filter(([cat]) => cat !== 'anecdote').flatMap(([, lines]) => lines.map((l) => l[0]));
  await Promise.all(ids.map(async (id) => {
    const buf = await loadAudio(`audio/voix/${id}.mp3`); // fichier absent : la réplique ne sera simplement pas dite
    if (buf) talk.buffers[id] = buf;
  }));
}
// Les répliques de l’adversaire du moment, chargées au début de la partie ; celles du précédent sont oubliées
export async function loadOppVoices() {
  const opp = RULES.opponent;
  if (talk.oppLoaded === opp || !audio.ctx) return;
  if (talk.oppLoaded) for (const m in OPP_TALK[talk.oppLoaded]) for (const [id] of oppLines(talk.oppLoaded, m)) delete talk.buffers[id];
  talk.oppLoaded = opp;
  await Promise.all(Object.keys(OPP_TALK[opp]).flatMap((m) => oppLines(opp, m)).map(async ([id]) => {
    const buf = await loadAudio(`audio/voix/${id}.mp3`);
    if (buf && talk.oppLoaded === opp) talk.buffers[id] = buf;
  }));
}
// tirage sans remise : toutes les répliques d’une catégorie passent avant qu’une revienne
// (les clients qui jouent contre toi ne réagissent pas en spectateurs ; les répliques absentes sont sautées)
function pickFrom(key, lines) {
  lines = lines.filter(([id]) => talk.buffers[id] || id.startsWith('anecdote'));
  if (!lines.length) return null;
  let bag = talk.bags[key];
  if (!bag || !bag.length) bag = talk.bags[key] = lines.slice().sort(() => Math.random() - 0.5);
  return bag.pop();
}
export function crowdLines(cat) {
  const opp = RULES.opponent;
  if (ABOUT_TAVERNIER.has(cat) && opp !== 'tavernier') return [];
  return TALK[cat].filter(([id, who]) => who !== opp && (!ONLY_VS[id] || ONLY_VS[id] === opp) && NOT_VS[id] !== opp);
}
export function pickLine(cat) { return pickFrom(`${cat}:${RULES.opponent}`, crowdLines(cat)); }
// Qui répond à un coup : l’adversaire lui-même (parfois, ou toujours quand les clients n’ont rien à dire), ou un client
// (`moment` : ce que l’adversaire dirait à la place d’un client ; par défaut celui de OWN_MOMENT)
export function chooseLine(cat, moment = OWN_MOMENT[cat]) {
  const opp = RULES.opponent;
  let lines = moment ? oppLines(opp, moment) : [], key = `${opp}:${moment}`;
  // l’adversaire qui ouvre la partie ne te tend pas les dés (tirage à part, pour ne pas mélanger les deux cas)
  if (moment === 'debut' && game.starter === 1) { lines = lines.filter(([id]) => !PLAYER_STARTS.has(id)); key += ':lui'; }
  const own = pickFrom(key, lines);
  const crowd = TALK[cat] ? pickLine(cat) : null;
  if (own && (!crowd || Math.random() < 0.55)) return own;
  return crowd;
}
// Les réactions s’adressent au joueur : pleine voix, légère réverbération. Les anecdotes se racontent
// plus loin dans la salle : plus bas, plus sourdes, noyées dans la réverbération.
const VOICE_MIX = {
  reaction: { gain: 0.95, dry: 1, wet: 0.12, lowpass: 0, duck: 0.45 },
  anecdote: { gain: 0.5, dry: 0.65, wet: 0.35, lowpass: 4200, duck: 0.75 },
};
export function say(line, anecdote = false) {
  if (!line) return false;
  const [id, who] = line, buf = talk.buffers[id];
  if (!buf || !audio.ctx || !audio.on.voices) return false;
  stopTalk();
  const { ctx } = audio, mix = VOICE_MIX[anecdote ? 'anecdote' : 'reaction'];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = mix.gain;
  let node = g;
  src.connect(g);
  if (mix.lowpass) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mix.lowpass;
    node.connect(lp); node = lp;
  }
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner(); pan.pan.value = who === RULES.opponent ? 0 : PATRONS[who].pan;
    node.connect(pan); node = pan;
  }
  const dry = ctx.createGain(); dry.gain.value = mix.dry;
  const wet = ctx.createGain(); wet.gain.value = mix.wet;
  node.connect(dry); dry.connect(audio.bus.voices);
  node.connect(wet); wet.connect(audio.voiceVerb);
  src.start();
  talk.current = { src, g, anecdote };
  talk.busyUntil = performance.now() + buf.duration * 1000;
  src.onended = () => {
    if (talk.current && talk.current.src === src) talk.current = null;
    if (anecdote) delete talk.buffers[id];
  };
  duckMusic(buf.duration, mix.duck);
  return true;
}
// Charge l’anecdote tirée puis la dit, sauf si une réaction a commencé entre-temps (`force` : bouton « Essayer »)
export async function playAnecdote(force = false) {
  const line = pickLine('anecdote');
  if (!line) return false;
  const [id] = line;
  if (!talk.buffers[id]) {
    const buf = await loadAudio(`audio/voix/${id}.mp3`);
    if (!buf) return false;
    talk.buffers[id] = buf;
  }
  if (!force && performance.now() < talk.busyUntil) { delete talk.buffers[id]; return false; }
  return say(line, true);
}
export function stopTalk() {
  if (!talk.current) return;
  const { src, g } = talk.current, t = audio.ctx.currentTime;
  g.gain.setTargetAtTime(0, t, 0.08);
  try { src.stop(t + 0.4); } catch { /* déjà arrêtée */ }
  talk.current = null;
  talk.busyUntil = 0;
}
// Réaction d’un client à un coup. Un Farkle, un abandon et la fin de la partie font toujours réagir quelqu’un ;
// les autres coups seulement de temps en temps (`chance`), jamais deux fois de suite.
// Une réaction coupe une anecdote en cours.
const MUST_REACT = new Set(['farkle_toi', 'farkle_tavernier', 'pot_perdu_toi', 'pot_perdu_tavernier', 'victoire_toi', 'victoire_tavernier', 'abandon']);
export function react(cat, chance = 1, delay = 700, moment = OWN_MOMENT[cat]) {
  if (!audio.ctx || !audio.on.voices) return;
  const now = performance.now(), speaking = now < talk.busyUntil && talk.current && !talk.current.anecdote;
  if (!MUST_REACT.has(cat) && (Math.random() > chance || now - talk.lastReaction < 7000 || speaking)) return;
  talk.lastReaction = now;
  setTimeout(() => say(chooseLine(cat, moment)), delay);
}
// Commente un lancer marquant : trois as, risque payant (un ou deux dés relancés) ou gros lancer, que les clients
// saluent et que l’adversaire envie (lancer du joueur) ou savoure (le sien) ; un lancer de l’adversaire qui
// ne rapporte presque rien avec quatre dés ou plus le fait grogner
export function commentRoll(counts, n) {
  let best = 0;
  for (const s of enumerateSubsets(counts)) best = Math.max(best, s.score);
  const moment = game.current === 0 ? 'jaloux' : 'beau_coup';
  if (counts[1] >= 3) return react('trois_as', 0.9, 700, moment);
  if (n <= 2) return react('risque_paye', 0.85, 700, moment);
  if (best >= 500) return react('beau_lancer', 0.7, 700, moment);
  if (game.current === 1 && n >= 4 && best <= 100) react('mauvais_coup', 0.6);
}
// L’adversaire s’impatiente quand le joueur tarde (deux fois par tour au plus), mais pas pendant qu’il lit
// les règles ou les réglages ; toucher l’écran ou une touche relance l’attente
export const nag = { since: 0, count: 0 };
export const playerActed = () => { nag.since = performance.now(); };
addEventListener('pointerdown', playerActed);
addEventListener('keydown', playerActed);
setInterval(() => {
  if (game.current !== 0 || !['idle', 'choosing'].includes(game.phase) || document.hidden) return;
  if (!$('rules').classList.contains('hidden') || !$('settings-panel').classList.contains('hidden')) { playerActed(); return; }
  if (nag.count >= 2 || performance.now() - nag.since < (nag.count ? 40000 : 20000)) return;
  nag.count++; playerActed();
  react('attente', 1, 0);
}, 1000);
// Une anecdote de temps en temps pendant la partie (toutes les 1 min 40 à 3 min), jamais par-dessus une réaction
setInterval(() => {
  if (!audio.ctx || !audio.on.voices || document.hidden) return;
  const now = performance.now();
  if (game.phase === 'menu' || game.phase === 'over') { talk.nextAnecdote = 0; return; }
  if (!talk.nextAnecdote) talk.nextAnecdote = now + rand(40000, 75000);
  if (now < talk.nextAnecdote || now < talk.busyUntil + 3000 || now - talk.lastReaction < 8000) return;
  talk.nextAnecdote = now + rand(100000, 180000);
  playAnecdote();
}, 1000);
