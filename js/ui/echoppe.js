// Échoppe : acheter, revendre et mettre en main des dés spéciaux.

import { isCoarse } from '../config.js';
import { $ } from '../outils.js';
import { DIE_CATS, DIE_KINDS } from '../des-speciaux.js';
import { HAND_SIZE, inHand, saveWallet, wallet } from '../bourse.js';
import { checkPurseFeats } from '../carnet.js';
import { initAudio, sfxCoins, sfxPlace } from '../sons.js';
import { dieIcon, kindIcon } from './icones.js';
import { renderMenu } from './menu.js';

function dieCard(id) {
  const k = DIE_KINDS[id], owned = wallet.owned[id] || 0, used = inHand(id), max = k.max || HAND_SIZE;
  const face = (v) => (v === k.joker ? 'tête cornue' : v);
  const odds = k.w.map((p, i) => `<div class="odd"><span>${p} %</span><i style="--p:${p}"></i>${dieIcon(i + 1 === k.joker ? 0 : i + 1)}</div>`).join('');
  const status = owned ? `Tu en as ${owned}${used ? (used === owned ? ', en main' : `, dont ${used} en main`) : ''}.` : '';
  const missing = k.price - wallet.purse;
  const buy = owned >= max ? '' : `<p class="price">${k.price} groschens${missing > 0 ? ` · il t’en manque ${missing}` : ''}</p>
    <button class="btn btn-wood" data-buy="${id}" aria-label="Acheter le ${k.name} pour ${k.price} groschens"${missing > 0 ? ' disabled' : ''}>Acheter</button>`;
  const equip = used < owned ? `<button class="btn btn-wax" data-equip="${id}"${wallet.hand.length >= HAND_SIZE ? ' disabled' : ''}>Mettre en main</button>` : '';
  const sell = owned ? `<button class="btn btn-ghost" data-sell="${id}" aria-label="Revendre un ${k.name} pour ${resale(id)} groschens">Revendre · ${resale(id)}</button>` : '';
  return `<article class="die-card">
    <div class="die-card-head">${kindIcon(id)}<div><h4>${k.name}</h4><p>${k.desc}</p></div></div>
    <div class="odds" role="img" aria-label="Chances : ${k.w.map((p, i) => `${face(i + 1)} ${p} %`).join(', ')}">${odds}</div>
    ${status ? `<p class="status">${status}</p>` : ''}
    <div class="die-card-foot">${buy}${equip}${sell}</div>
  </article>`;
}
// Un dé se revend à l’échoppe la moitié de son prix
const resale = (id) => Math.floor(DIE_KINDS[id].price / 2);
function shopHTML() {
  const slots = Array.from({ length: HAND_SIZE }, (_, i) => {
    const id = wallet.hand[i];
    return id
      ? `<button class="hand-slot" data-unequip="${i}" aria-label="Retirer le ${DIE_KINDS[id].name} de ta main">${kindIcon(id)}<span>${DIE_KINDS[id].name}</span></button>`
      : `<div class="hand-slot empty">${dieIcon(5)}<span>Dé ordinaire</span></div>`;
  }).join('');
  const byCat = DIE_CATS.map((cat, c) => {
    const ids = Object.keys(DIE_KINDS).filter((id) => DIE_KINDS[id].cat === c).sort((a, b) => DIE_KINDS[a].price - DIE_KINDS[b].price);
    return `<h3>${cat}</h3><div class="shop-list">${ids.map(dieCard).join('')}</div>`;
  }).join('');
  return `<h2 id="shop-title">Dés spéciaux</h2>
    <p class="lede">Ta bourse : <b>${wallet.purse}</b> groschens</p>
    <h3>Ta main</h3>
    <p>Les six dés que tu lances. ${isCoarse ? 'Touche' : 'Clique'} un dé spécial pour le ranger : un dé ordinaire reprend sa place.
      Un dé dont tu ne veux plus se revend à l’échoppe la moitié de son prix.</p>
    <div class="hand">${slots}</div>
    ${byCat}`;
}
// Après un achat, on garde la position dans la liste et le bouton actif (clavier)
function renderShop(from = null) {
  const body = $('shop-body'), top = body.scrollTop;
  const key = from && ['buy', 'equip', 'unequip', 'sell'].find((k) => from.dataset[k] !== undefined);
  const id = key && from.dataset[key];
  body.innerHTML = shopHTML();
  body.scrollTop = top;
  if (!key) return;
  const card = key === 'unequip' ? null : body.querySelector(`[data-buy="${id}"], [data-equip="${id}"], [data-sell="${id}"]`)?.closest('.die-card');
  const next = [body.querySelector(`[data-${key}="${id}"]`), card && card.querySelector('button:not(:disabled)')].find((b) => b && !b.disabled);
  if (next) next.focus({ preventScroll: true });
}
function openShop() {
  renderShop();
  $('shop-body').scrollTop = 0;
  $('menu').classList.add('hidden');
  $('shop').classList.remove('hidden');
}
export function closeShop() {
  if ($('shop').classList.contains('hidden')) return;
  $('shop').classList.add('hidden');
  $('menu').classList.remove('hidden');
  renderMenu();
}

// Boutons de l’échoppe
export function initShop() {
  $('btn-shop').addEventListener('click', openShop);
  $('btn-menu-shop').addEventListener('click', openShop);
  $('btn-shop-close').addEventListener('click', closeShop);
  $('shop').addEventListener('click', (e) => { if (e.target.id === 'shop') closeShop(); });
  $('shop-body').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    initAudio();
    const { buy, equip, unequip, sell } = b.dataset;
    if (sell) {
      // revente en deux temps, pour qu’un toucher maladroit ne vide pas l’étagère
      if (!b.dataset.armed) {
        b.dataset.armed = '1';
        b.textContent = `Sûr ? Revendre · ${resale(sell)}`;
        b.classList.add('armed');
        setTimeout(() => { if (b.isConnected) renderShop(b); }, 4000);
        return;
      }
      if (!wallet.owned[sell]) return;
      wallet.owned[sell]--;
      if (!wallet.owned[sell]) delete wallet.owned[sell];
      if (inHand(sell) > (wallet.owned[sell] || 0)) wallet.hand.splice(wallet.hand.lastIndexOf(sell), 1);
      wallet.purse += resale(sell);
      sfxCoins(0.5);
      checkPurseFeats();
    } else if (buy) {
      const k = DIE_KINDS[buy];
      if (wallet.purse < k.price || (wallet.owned[buy] || 0) >= (k.max || HAND_SIZE)) return;
      wallet.purse -= k.price;
      wallet.owned[buy] = (wallet.owned[buy] || 0) + 1;
      if (wallet.hand.length < HAND_SIZE) wallet.hand.push(buy); // un dé acheté va directement dans la main s’il y a de la place
      sfxCoins();
      checkPurseFeats();
    } else if (equip) {
      if (wallet.hand.length >= HAND_SIZE) return;
      wallet.hand.push(equip);
      sfxPlace('leather');
    } else if (unequip !== undefined) {
      wallet.hand.splice(+unequip, 1);
      sfxPlace('wood');
    } else return;
    saveWallet();
    renderShop(b);
  });
}
