// Sons : musique, ambiance et bruitages (Web Audio), avec des sons synthétisés si un fichier manque.

import { rand, sleep } from './outils.js';
import { G } from './physique.js';
import { sim } from './lancer.js';
import { loadVoices, stopTalk, talk } from './voix.js';

// Musique, ambiance et bruitages générés avec ElevenLabs (dossier audio/). Si un fichier
// manque (ou si la page est ouverte en file://), on retombe sur des sons synthétisés.
const SOUNDS = {
  bois: ['de_bois_1.wav', 'de_bois_2.wav', 'de_bois_3.wav'],                    // dé contre le plateau
  choc: ['de_de_1.wav', 'de_de_2.wav', 'de_de_3.wav', 'de_de_4.wav'],           // dé contre dé
  cuir: ['de_cuir_1.wav', 'de_cuir_2.wav', 'de_cuir_3.wav', 'de_cuir_4.wav'],   // dé posé sur le tapis
  secouer: ['secouer_1.mp3', 'secouer_2.mp3'],
  pieces: ['pieces_1.mp3', 'pieces_2.mp3'],
  genou: ['genou_1.mp3', 'genou_2.mp3'],                                        // genou cogné sous le plateau
  farkle: ['farkle.mp3'], brulants: ['des_brulants.mp3'], victoire: ['victoire.mp3'], defaite: ['defaite.mp3'],
  ambiance: ['ambiance_taverne.wav'],
  // événements de la table (voir js/evenements.js)
  acclamation: ['des_brulants.mp3'], coq: ['evt_coq.mp3'], grondement: ['evt_grondement.mp3'], brasier: ['evt_brasier.mp3'],
};
const MUSIC_URL = 'audio/musique_cromorne.mp3';
const LEVELS = { music: 0.25, ambience: 0.8, sfx: 0.8, voices: 1 };
export const audio = { ctx: null, master: null, bus: {}, noise: null, buffers: {}, last: {}, music: null, ambience: null, on: { music: true, ambience: true, sfx: true, voices: true } };
try { Object.assign(audio.on, JSON.parse(localStorage.getItem('farkle.son')) || {}); } catch { /* stockage indisponible */ }

export function initAudio() {
  if (audio.ctx) { if (audio.ctx.state !== 'running') audio.ctx.resume(); startMusic(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  // un compresseur doux en sortie : une volée de dés ne sature pas
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  const master = ctx.createGain();
  master.connect(comp); comp.connect(ctx.destination);
  const bus = {};
  for (const k of ['music', 'ambience', 'sfx', 'voices']) { bus[k] = ctx.createGain(); bus[k].gain.value = audio.on[k] ? level(k) : 0; bus[k].connect(master); }
  // petite réverbération de salle sur les bruitages
  const conv = ctx.createConvolver();
  const len = ctx.sampleRate * 0.9, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  conv.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.12;
  bus.sfx.connect(conv); conv.connect(wet); wet.connect(master);
  // réverbération de salle pour les voix : légère sur les réactions, forte sur les anecdotes (plus loin dans la salle)
  const voiceVerb = ctx.createConvolver();
  voiceVerb.buffer = roomImpulse(ctx, 0.8);
  voiceVerb.connect(bus.voices);
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  Object.assign(audio, { ctx, master, bus, noise: nb, voiceVerb });
  startMusic(); // avant les autres sons : c’est le plus long à télécharger
  talk.ready = loadSounds().then(loadVoices);
}
// Réponse impulsionnelle d’une petite salle en bois : bruit qui décroît vite, de plus en plus sourd vers la fin
function roomImpulse(ctx, seconds) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds), pre = Math.floor(sr * 0.015);
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const k = (i - pre) / (len - pre);
      lp += (0.4 - 0.32 * k) * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - k, 4);
    }
  }
  return ir;
}
// Le navigateur n’autorise le son qu’après un geste : on démarre au premier clic, toucher ou touche
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'keydown', 'click'];
function unlockAudio() {
  initAudio();
  if (audio.ctx && audio.ctx.state === 'running') for (const ev of UNLOCK_EVENTS) removeEventListener(ev, unlockAudio, true);
}
for (const ev of UNLOCK_EVENTS) addEventListener(ev, unlockAudio, true);

// Chargement d’un son : 4 téléchargements à la fois au plus, et jusqu’à 3 nouvelles tentatives.
// Un petit serveur local (python -m http.server) refuse des connexions si on lui en ouvre trop d’un coup.
let loadSlots = 4;
const loadWaiters = [];
// `urgent` : passe devant les fichiers qui attendent leur tour (le salut de l’adversaire, au début de la partie)
export async function loadAudio(url, urgent = false) {
  if (loadSlots > 0) loadSlots--; else await new Promise((r) => (urgent ? loadWaiters.unshift(r) : loadWaiters.push(r)));
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 404) return null;
        if (res.ok) return await audio.ctx.decodeAudioData(await res.arrayBuffer());
      } catch { /* connexion refusée : on réessaie */ }
      await sleep(300 * (attempt + 1));
    }
    return null;
  } finally {
    const next = loadWaiters.shift();
    if (next) next(); else loadSlots++;
  }
}
async function loadSounds() {
  await Promise.all(Object.entries(SOUNDS).map(async ([name, files]) => {
    const bufs = await Promise.all(files.map((f) => loadAudio(`audio/${f}`)));
    if (bufs.some(Boolean)) audio.buffers[name] = bufs.filter(Boolean);
    if (name === 'ambiance') startAmbience();
  }));
}
function startAmbience() {
  if (audio.ambience || !audio.buffers.ambiance) return;
  const { ctx } = audio, t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = audio.buffers.ambiance[0]; src.loop = true; // boucle sans couture (WAV)
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.8, t + 4);
  src.connect(g); g.connect(audio.bus.ambience);
  src.start();
  audio.ambience = src;
}
// La musique est décodée et jouée comme les autres sons. Un lecteur <audio> branché sur Web Audio restait muet
// sur certains appareils, sans erreur visible. Elle démarre dès qu’elle est chargée, en fondu.
let musicLoad = null;
function startMusic() {
  if (!audio.ctx || !audio.on.music || document.hidden || audio.music) return;
  if (!audio.buffers.musique) {
    musicLoad ||= loadAudio(MUSIC_URL).then((buf) => {
      if (!buf) { musicLoad = null; return; } // échec : on réessaiera au prochain geste
      audio.buffers.musique = buf;
      startMusic();
    });
    return;
  }
  const { ctx } = audio, t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = audio.buffers.musique; src.loop = true;
  src.connect(audio.bus.music);
  const g = audio.bus.music.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(LEVELS.music, t + 5);
  src.start();
  audio.music = src;
}
function stopMusic() {
  if (!audio.music) return;
  audio.music.stop(); audio.music.disconnect(); audio.music = null;
}
// Pendant le dernier tour, la salle retient son souffle : l’ambiance baisse (voir hushRoom)
let hush = 1;
const level = (k) => LEVELS[k] * (k === 'ambience' ? hush : 1);
export function hushRoom(on) {
  hush = on ? 0.35 : 1;
  if (!audio.ctx || !audio.on.ambience) return;
  const g = audio.bus.ambience.gain, t = audio.ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(level('ambience'), t + (on ? 2.5 : 1.5));
}
export function setSound(k, on) {
  audio.on[k] = on;
  try { localStorage.setItem('farkle.son', JSON.stringify(audio.on)); } catch { /* stockage indisponible */ }
  if (!audio.ctx) return;
  const g = audio.bus[k].gain, t = audio.ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(on ? level(k) : 0, t + 0.4);
  if (k === 'music') {
    if (on) startMusic();
    else setTimeout(() => { if (!audio.on.music) stopMusic(); }, 450);
  }
  if (k === 'voices' && !on) stopTalk();
}
// La musique s’efface un instant sous les clameurs de la salle ou quand un client parle
export function duckMusic(seconds, level = 0.35) {
  if (!audio.ctx || !audio.on.music) return;
  const g = audio.bus.music.gain, t = audio.ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(LEVELS.music * level, t + 0.3);
  g.setValueAtTime(LEVELS.music * level, t + seconds);
  g.linearRampToValueAtTime(LEVELS.music, t + seconds + 1.5);
}
document.addEventListener('visibilitychange', () => {
  if (!audio.ctx) return;
  if (document.hidden) audio.ctx.suspend(); // tout se fige, musique comprise, et reprend où il en était
  else { audio.ctx.resume(); startMusic(); }
});

const sfxOn = () => audio.ctx && audio.on.sfx;
// Joue une variante au hasard (jamais deux fois la même d’affilée).
// Renvoie false seulement si le son n’est pas chargé, pour laisser jouer le repli synthétisé.
function playSample(name, { gain = 1, rate = 1, when = 0, fadeAt = 0, fadeLen = 0.25 } = {}) {
  if (!sfxOn()) return true;
  const list = audio.buffers[name];
  if (!list) return false;
  let i = (Math.random() * list.length) | 0;
  if (list.length > 1 && i === audio.last[name]) i = (i + 1) % list.length;
  audio.last[name] = i;
  const { ctx } = audio, t = ctx.currentTime + when;
  try { // un raté du son ne doit jamais bloquer la partie
    const src = ctx.createBufferSource();
    src.buffer = list[i]; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(audio.bus.sfx);
    src.start(t);
    if (fadeAt) { g.gain.setValueAtTime(gain, t + fadeAt); g.gain.linearRampToValueAtTime(0, t + fadeAt + fadeLen); src.stop(t + fadeAt + fadeLen + 0.05); }
  } catch { /* ignoré */ }
  return true;
}
export function sfxHit(strength, kind, when = 0) {
  if (!sfxOn()) return;
  const k = Math.min(1, strength / 12);
  if (playSample(kind === 'dice' ? 'choc' : 'bois', { gain: Math.pow(k, 1.3) * (kind === 'dice' ? 0.7 : 0.85), rate: rand(0.9, 1.12), when })) return;
  synthHit(strength, kind, when);
}

// ─── Repli : sons synthétisés ───
function synthHit(strength, kind, when = 0) {
  if (!sfxOn()) return;
  const { ctx, noise } = audio, master = audio.bus.sfx;
  const t = ctx.currentTime + when;
  const vol = Math.min(1, strength / 12) * (kind === 'dice' ? 0.5 : 0.42);
  if (vol < 0.015) return;
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = kind === 'dice' ? rand(2600, 4200) : rand(900, 1500);
  bp.Q.value = kind === 'dice' ? 4 : 2.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + (kind === 'dice' ? 0.045 : 0.07));
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.8, 0.12);
  if (kind === 'wood') {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(rand(170, 240), t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const og = ctx.createGain(); og.gain.setValueAtTime(vol * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0008, t + 0.1);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.12);
  }
}
function tone(freq, t, dur, vol, type = 'triangle') {
  const { ctx } = audio;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audio.bus.sfx); o.start(t); o.stop(t + dur + 0.05);
}
const synthTune = (notes, step, dur, vol) => { if (!sfxOn()) return; const t = audio.ctx.currentTime; notes.forEach((f, i) => tone(f, t + i * step, dur, vol)); };

// ─── Bruitages du jeu ───
// Les chocs sont notés pendant le calcul d’un lancer (voir simulateThrow), puis joués avec l’animation
export function onDieCollide(d, e) {
  if (!sim || sim.time - d.lastSound < 0.045) return;
  const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
  if (v < 1.2) return;
  const g = e.body.collisionFilterGroup;
  if (g === G.DICE && e.body.die && e.body.die.id < d.id) return; // un seul son par choc entre deux dés
  d.lastSound = sim.time;
  sim.sounds.push(g === G.DICE ? { t: sim.time, v, kind: 'dice' } : { t: sim.time, v: g === G.FLOOR ? v : v * 0.45, kind: 'wood' });
}
export function sfxRattle(side = 0) {
  if (playSample('secouer', { gain: side === 0 ? 0.5 : 0.38, rate: rand(0.95, 1.05), fadeAt: 0.55 })) return;
  for (let i = 0; i < 9; i++) synthHit(rand(3, 6), 'dice', rand(0, 0.35));
}
// dé qui se pose en fin de déplacement : sur le tapis de cuir ou de retour sur le plateau
export function sfxPlace(surface) {
  if (playSample(surface === 'leather' ? 'cuir' : 'bois', { gain: surface === 'leather' ? 0.6 : 0.4, rate: rand(0.95, 1.08) })) return;
  synthHit(surface === 'leather' ? 6 : 4, 'wood');
}
export function sfxCoins(gain = 0.7) {
  if (playSample('pieces', { gain, rate: rand(0.97, 1.04) }) || !sfxOn()) return;
  const t0 = audio.ctx.currentTime;
  for (let i = 0; i < 7; i++) { const t = t0 + i * 0.055 + Math.random() * 0.03, f = rand(2300, 3600); tone(f, t, 0.35, 0.06, 'sine'); tone(f * 2.76, t, 0.2, 0.025, 'sine'); }
}
export function sfxFarkle() {
  duckMusic(2);
  if (playSample('farkle', { gain: 0.45 }) || !sfxOn()) return;
  const { ctx } = audio, t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(65, t + 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.7);
  o.connect(g); g.connect(audio.bus.sfx); o.start(t); o.stop(t + 0.75);
  synthHit(10, 'wood');
}
export function sfxHot() { duckMusic(2); if (!playSample('brulants', { gain: 0.5 })) synthTune([293.7, 349.2, 392, 440, 587.3], 0.08, 0.5, 0.12); }
// Bruitage d’un événement de la table, la musique baisse le temps qu’il dure ; sans fichier, un repli pour le grondement
export function sfxEvent(name, gain, seconds) {
  if (!sfxOn()) return;
  duckMusic(seconds, 0.5);
  if (playSample(name, { gain })) return;
  const t = audio.ctx.currentTime;
  if (name === 'grondement') thump(gain, t, 0);
}
// L’insecte écrasé : un petit craquement sec
export function sfxSquash() {
  if (!sfxOn()) return;
  playSample('bois', { gain: 0.45, rate: rand(1.7, 1.9) });
  playSample('cuir', { gain: 0.5, rate: rand(1.3, 1.5), when: 0.02 });
}
// petit carillon d’un haut fait
export function sfxFeat() { synthTune([587.3, 740, 880, 1174.7], 0.07, 0.6, 0.06); }
export function sfxVictory() { duckMusic(4); if (!playSample('victoire', { gain: 0.7 })) synthTune([293.7, 440, 392, 440, 587.3, 740, 587.3], 0.14, 0.7, 0.12); }
export function sfxDefeat() { duckMusic(3); if (!playSample('defaite', { gain: 0.7 })) synthTune([440, 392, 349.2, 293.7, 220], 0.2, 0.8, 0.1); }
// Quelqu’un se cogne le genou sous le plateau de la table : un choc sourd venu d’en dessous (genou_*.mp3), puis les chopes
// d’étain et les pièces qui retombent (voir bangTable). Sans `pewter`, un simple choc sourd : le sceau du Farkle qui s’écrase.
export function sfxThud(k = 1, when = 0, pewter = true) {
  if (!sfxOn()) return;
  const t = audio.ctx.currentTime + when;
  if (!pewter) { thump(k, t, when); return; }
  if (!playSample('genou', { gain: 0.85 * k, rate: rand(0.96, 1.04), when })) thump(k, t, when);
  // l’étain sonne en retombant : des partiels inharmoniques, comme une cloche mate
  for (const dt of [0.36, 0.43]) {
    const f = rand(820, 980);
    tone(f, t + dt, 0.32, 0.05 * k, 'sine'); tone(f * 2.71, t + dt, 0.18, 0.025 * k, 'sine'); tone(f * 4.13, t + dt, 0.1, 0.012 * k, 'sine');
  }
  // et les pièces des bourses qui retombent en tintant
  for (let i = 0; i < 6; i++) { const f = rand(2600, 3700), dt = rand(0.2, 0.42); tone(f, t + dt, 0.14, 0.022 * k, 'sine'); tone(f * 2.76, t + dt, 0.08, 0.008 * k, 'sine'); }
}
// Choc sourd synthétisé : un coup dans le bois, plus grave, et une basse qui retombe
function thump(k, t, when) {
  const { ctx } = audio;
  playSample('bois', { gain: 0.9 * k, rate: rand(0.5, 0.58), when });
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45 * k, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
  o.connect(g); g.connect(audio.bus.sfx); o.start(t); o.stop(t + 0.35);
}
// Cliquetis d’une pièce à chaque cinquantaine que passe le compteur du score, un peu plus aigu à chaque pièce
// (plus grave pour l’adversaire)
export function sfxTick(side, n) {
  if (!sfxOn()) return;
  const t = audio.ctx.currentTime, f = (side === 0 ? 2500 : 1900) * (1 + Math.min(n, 16) * 0.022) * rand(0.99, 1.01);
  tone(f, t, 0.08, 0.035, 'sine'); tone(f * 2.76, t, 0.05, 0.012, 'sine');
}
