// Les quatre adversaires : façon de jouer, mise, sac de dés spéciaux, couleur des dés et répliques écrites.

import { RULES } from './config.js';
import { DIE_KINDS } from './des-speciaux.js';

// risk : multiplie les seuils où il garde ses points (plus haut : il tente davantage) ; slip : chance de mal choisir
// ses dés ; maxStake : sa plus forte mise ; dice : les dés spéciaux qu’il peut sortir (null : toute l’échoppe) ;
// look : la couleur de ses dés ordinaires. Les répliques du menu et de la fin de partie sont les siennes.
export const OPPONENTS = {
  palefrenier: {
    name: 'Kuba', Name: 'Kuba', full: 'Kuba, le palefrenier', short: 'Kuba', row: 'Kuba', she: false,
    tag: 'Fougueux', risk: 1.8, slip: 0.3, maxStake: 25, dice: ['fele', 'bancal', 'pair', 'soufre'], look: { body: '#7a5434', pip: '#f0dfb6' },
    hello: 'Salut ! Je sors de l’écurie, ça sent un peu le foin… Mais aux dés, je galope !',
    resume: 'Ah, te revoilà ! J’ai juste eu le temps de bouchonner deux chevaux.',
    win: 'Tu m’as eu, cette fois. Revanche ?',
    loss: 'Ha ! Plus rapide qu’un cheval au galop ! On en refait une ?',
    honorWin: 'Pour l’honneur, hein ? Tant mieux : mes gages ne tombent qu’à la Saint-Martin.',
    honorLoss: 'Gagné ! Pour l’honneur… C’est toujours ça de pris.',
    rich: 'Avec une bourse pareille, tu pourrais t’acheter un cheval ! Ou deux ânes.',
    credit: 'Le patron t’a glissé quelques pièces ? Moi, il me paie en avoine.',
    stakes: { 0: 'Pour l’honneur ? Tant mieux, mes gages sont maigres.', 10: 'Dix groschens ? Va pour dix !', 25: 'Vingt-cinq ? Toute ma paie du mois… Allez, au galop !' },
    lengths: ['Une chope, vite fait : les chevaux attendent leur foin.', 'Une soirée ! J’ai tout mon temps.', 'Jusqu’à l’aube ? Je dormirai dans la paille, demain.'],
    beaten: 'Kuba tape du poing sur la table, puis éclate de rire.', wins: ['Il fourre tes pièces dans sa besace en sifflant.', 'Il pousse un hennissement de joie. Si, si.'],
  },
  vieux: {
    name: 'le vieil Ota', Name: 'Le vieil Ota', full: 'le vieil Ota', short: 'Ota', row: '<span class="art">Le vieil </span>Ota', she: false,
    tag: 'Prudent', risk: 0.6, slip: 0.12, maxStake: 50, dice: ['procope', 'venceslas', 'adalbert', 'fele'], look: { body: '#b3aa98', pip: '#2a1d14' },
    hello: 'Assieds-toi, petit. Les dés, ça se joue avec la tête, pas avec le cœur.',
    resume: 'Tu reviens ? J’ai gardé les dés au chaud.',
    win: 'Bien joué, petit. Tu iras loin… si tu sais t’arrêter.',
    loss: 'La patience, petit. La patience gagne toujours.',
    honorWin: 'Pas de mise, pas de regret. Tu as bien joué.',
    honorLoss: 'Pour l’honneur, c’est bien. Pour apprendre, c’est mieux.',
    rich: 'Une bourse pleine attire les voleurs, petit. Et les joueurs.',
    credit: 'Le Tavernier t’a remis à flot ? Ne gaspille pas tout, cette fois.',
    stakes: { 0: 'Pour l’honneur ? C’est ainsi qu’on apprend.', 10: 'Dix groschens. Une mise sage.', 25: 'Vingt-cinq… Voyons si tu as la main.', 50: 'Cinquante ? À mon âge, on compte ses sous… Mais soit.' },
    lengths: ['Une chope, pas plus. Mes vieux os ont besoin de repos.', 'Une soirée. Comme au bon vieux temps.', 'Jusqu’à l’aube ? De mon temps, on tenait trois nuits.'],
    beaten: 'Le vieil Ota hoche la tête, beau joueur.', wins: ['Il range tes pièces une à une, sans se presser.', 'Il sourit dans sa barbe.'],
  },
  servante: {
    name: 'Bětka', Name: 'Bětka', full: 'Bětka, la servante', short: 'Bětka', row: 'Bětka', she: true,
    tag: 'Vive et maligne', risk: 0.95, slip: 0.08, maxStake: 50, dice: ['chanceux', 'colporteur', 'venceslas', 'braise'], look: { body: '#b8573f', pip: '#f6ead0' },
    hello: 'Une partie entre deux tournées ? Je n’ai pas toute la nuit, alors lance !',
    resume: 'Ah, te revoilà ! J’ai servi trois tables en t’attendant.',
    win: 'Tu as eu de la chance. Le patron ne me paie pas pour perdre !',
    loss: 'Merci pour le pourboire ! On en refait une ?',
    honorWin: 'Pour l’honneur… Je t’aurai, la prochaine fois.',
    honorLoss: 'Même pour l’honneur, j’aime gagner.',
    rich: 'Te voilà riche ! Tu me laisseras un pourboire ?',
    credit: 'Le patron t’a avancé quelques pièces ? Il ne fait jamais ça pour moi.',
    stakes: { 0: 'Pour l’honneur ? Si tu veux, mais ça ne remplit pas le tablier.', 10: 'Dix groschens ? C’est un pourboire, ça !', 25: 'Vingt-cinq : ma paie de la semaine. Joue bien !', 50: 'Cinquante ! Tu veux m’impressionner ?' },
    lengths: ['Une chope, vite fait : j’ai du service.', 'Une soirée ? Le patron va grogner.', 'Jusqu’à l’aube ! Tant pis pour la vaisselle.'],
    beaten: 'Bětka tape du pied et retourne servir.', wins: ['Elle glisse tes pièces dans son tablier.', 'Elle te fait un clin d’œil et file servir.'],
  },
  tavernier: {
    name: 'le Tavernier', Name: 'Le Tavernier', full: 'le Tavernier', short: 'Tavernier', row: '<span class="art">Le </span>Tavernier', she: false,
    tag: 'Le plus coriace', risk: 1, slip: 0, maxStake: 100, dice: null, look: { body: '#a8673a', pip: '#f3e6c4' },
    hello: 'Assieds-toi, l’ami. Combien mets-tu sur la table ?',
    resume: 'Tu reviens finir notre partie ? Je n’ai touché à rien.',
    win: 'Tu m’as plumé, chenapan. Tu m’accordes une revanche ?',
    loss: 'Merci pour les groschens, l’ami. On remet ça ?',
    honorWin: 'Bien joué… Heureusement pour moi, il n’y avait rien sur la table.',
    honorLoss: 'L’honneur est sauf, ta bourse aussi. Une vraie partie, maintenant ?',
    rich: 'Te voilà les poches pleines… Elles ne le resteront pas longtemps.',
    credit: 'Ta bourse sonnait creux : je t’ai glissé quelques groschens. N’en parle à personne.',
    stakes: {
      0: 'Pour l’honneur ? Soit, mais avec des dés ordinaires.',
      10: 'Dix groschens ? Une mise de prudent… Assieds-toi quand même.',
      25: 'Vingt-cinq groschens, voilà une mise honnête.',
      50: 'Cinquante ! Tu as du cran, ou tu as trop bu.',
      100: 'Cent groschens… Ce soir, l’un de nous deux rentre les poches vides.',
    },
    lengths: ['Le temps d’une chope ? Alors ne traînons pas.', 'Une soirée entière, comme il se doit.', 'Jusqu’à l’aube ! Je mets un tonneau en perce.'],
    beaten: 'Le Tavernier grommelle et remplit ta chope.', wins: ['Il fait déjà sonner tes pièces.', 'Il bombe le torse.'],
  },
};
export const OPP_ORDER = ['palefrenier', 'vieux', 'servante', 'tavernier'];
export const OPP = () => OPPONENTS[RULES.opponent];
export const il = () => (OPP().she ? 'Elle' : 'Il');
// L’adversaire sort quelques dés spéciaux de son sac, d’autant plus que la mise est forte
const TAVERN_MAX = { 10: 1, 25: 2, 50: 3, 100: 4 };
export function pickTavernHand(stake) {
  const ids = OPP().dice || Object.keys(DIE_KINDS), hand = [];
  const n = Math.floor(Math.random() * ((TAVERN_MAX[stake] || 0) + 1));
  while (hand.length < n) {
    const id = ids[(Math.random() * ids.length) | 0];
    if (!(DIE_KINDS[id].max === 1 && hand.includes(id))) hand.push(id);
  }
  return hand;
}
