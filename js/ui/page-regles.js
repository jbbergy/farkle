// Page des règles du jeu.

import { CONFIG, isCoarse, RULES } from '../config.js';
import { $ } from '../outils.js';
import { DIE_KINDS } from '../des-speciaux.js';
import { FEATS } from '../carnet.js';
import { FARKLE_FINE, OPENING } from '../partie.js';
import { diceIcons, dieIcon } from './icones.js';

function rulesHTML() {
  const rows = [
    ...[[[1], 100], [[5], 50], [[1, 1, 1], 1000], [[2, 2, 2], 200], [[3, 3, 3], 300], [[4, 4, 4], 400], [[5, 5, 5], 500], [[6, 6, 6], 600]]
      .map(([vs, pts]) => [diceIcons(...vs), pts]),
    ['Quatre dés identiques', 'brelan ×2'], ['Cinq dés identiques', 'brelan ×4'], ['Six dés identiques', 'brelan ×8'],
    [diceIcons(1, 2, 3, 4, 5), 500], [diceIcons(2, 3, 4, 5, 6), 750], [diceIcons(1, 2, 3, 4, 5, 6), 1500],
  ];
  const controls = isCoarse
    ? `<dl class="controls">
        <dt>Toucher un dé</dt><dd>le mettre de côté, ou le reposer sur le plateau</dd>
        <dt>Lancer</dt><dd>lancer ou relancer les dés restants</dd>
        <dt>Garder</dt><dd>inscrire le pot du tour à ton score</dd>
        <dt>Pincer à deux doigts</dt><dd>zoomer sur le plateau et déplacer la vue</dd>
      </dl>`
    : `<dl class="controls">
        <dt>Clic sur un dé</dt><dd>le mettre de côté, ou le reposer sur le plateau</dd>
        <dt><kbd>R</kbd></dt><dd>lancer ou relancer</dd>
        <dt><kbd>G</kbd></dt><dd>garder le pot du tour</dd>
        <dt><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd></dt><dd>choisir un dé (ou <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd>)</dd>
        <dt><kbd>Espace</kbd></dt><dd>prendre ou reposer le dé choisi (ou <kbd>Entrée</kbd>)</dd>
        <dt>Molette</dt><dd>zoomer sur le plateau, vers le pointeur</dd>
        <dt><kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd></dt><dd>zoomer, dézoomer, revenir à la vue d’ensemble</dd>
        <dt><kbd>Échap</kbd></dt><dd>fermer cette page</dd>
      </dl>`;
  return `<h2 id="rules-title">Les règles du Farkle</h2>
    <p class="lede">Six dés, deux joueurs et un pot. Il faut atteindre <b>${RULES.target}</b> points… et rester devant.</p>

    <h3>Un tour de jeu</h3>
    <ol class="steps">
      <li><b>Lance</b> les six dés.</li>
      <li><b>Mets de côté</b> au moins un dé qui rapporte (voir le tableau). Ses points s’ajoutent au pot du tour.</li>
      <li>Choisis ensuite : <b>relancer</b> les dés restants pour grossir le pot, ou <b>garder</b> pour inscrire le pot à ton score. La main passe alors à ton adversaire.</li>
      <li>Si un lancer ne rapporte rien, c’est un <b class="red">Farkle</b> : le pot du tour est perdu et la main passe.</li>
    </ol>

    <h3>Ce qui rapporte</h3>
    <table class="rules-table">
      ${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}
    </table>

    <h3>Un exemple</h3>
    <div class="example">Tu lances ${diceIcons(1, 3, 5, 3, 6, 3)}<br>
      Le 1 (100), le 5 (50) et les trois 3 (300) font <b>450</b> dans le pot. Tu peux garder ces 450 points tout de suite,
      ou relancer le dernier dé : un 1 ou un 5 (une chance sur trois) ajoute des points et te rend les six dés (ce sont les dés brûlants, juste en dessous),
      sinon c’est le Farkle et les 450 sont perdus.</div>

    <h3>Les dés brûlants</h3>
    <p>Quand <b>tes six dés</b> ont tous rapporté et sont mis de côté, ce sont des <b>dés brûlants</b> : tu reprends les six dés,
      et le pot du tour reste à toi. Tu choisis alors de <b>relancer les six</b> pour grossir encore le pot, ou de <b>garder</b> tes points.
      Si tu relances et que c’est un Farkle, tout le pot du tour est perdu, comme d’habitude.</p>
    <div class="example">Tu lances ${diceIcons(1, 1, 1, 5, 2, 4)}<br>
      Tu mets de côté les trois 1 et le 5 : <b>1050</b> dans le pot. Tu relances les deux derniers dés et tu sors ${diceIcons(1, 5)} :
      150 de plus. Tes six dés sont de côté : <b>dés brûlants</b> ! Tu reprends les six dés avec <b>1200</b> dans le pot.</div>

    <h3>La fin de la partie</h3>
    <p>Dès qu’un joueur atteint <b>${RULES.target}</b> points, l’autre joue un <b>dernier tour</b> : il doit le <b>dépasser</b> pour l’emporter,
      et il ne peut garder ses points qu’une fois passé devant. S’il fait un Farkle, le premier arrivé gagne la partie.</p>
    <p>Pour que personne ne soit avantagé, chacun <b>commence</b> une partie sur deux : une fois toi, une fois ton adversaire.</p>

    <h3>Bon à savoir</h3>
    <p>Une combinaison doit sortir d’un <b>même lancer</b> : deux 4 de ce lancer et un 4 du suivant ne font pas un brelan.</p>

    <h3>Groschens et dés spéciaux</h3>
    <p>Avant la partie, choisis ta <b>mise</b> : ${CONFIG.aiLower} en met autant, et le gagnant empoche les deux.
      Ta bourse est gardée d’une partie à l’autre. Avec une mise de 0, tu joues <b>pour l’honneur</b> : rien à gagner ni à perdre, et des dés ordinaires pour tout le monde.</p>
    <p>Avec tes gains, achète des <b>dés spéciaux</b> à l’échoppe (ligne « Tes dés » du menu) : chacun tombe plus souvent sur certains chiffres.
      Mets-en jusqu’à six dans ta main ; les autres restent des dés ordinaires. Sur le plateau, tu les reconnais à leur couleur.
      Un dé dont tu ne veux plus se revend la moitié de son prix.</p>
    <p>Ton adversaire a son propre jeu, de sa couleur. Quand on mise, il sort lui aussi quelques dés spéciaux de son sac :
      plus la mise est forte, plus il en a. ${isCoarse ? 'Touche' : 'Survole'} un dé spécial pour lire son nom.</p>
    <p>${dieIcon(0, DIE_KINDS.cornu)} La tête cornue du <b>Dé du Cornu</b> est un joker : elle remplace n’importe quel chiffre
      pour compléter un brelan, un carré ou une suite, mais ne rapporte rien seule.</p>

    <h3>Les adversaires</h3>
    <p>Choisis contre qui tu joues dans le menu (ligne « Ton adversaire »), du plus facile au plus coriace :</p>
    <dl class="controls opponents">
      <dt>Kuba, le palefrenier</dt><dd>fougueux comme un poulain, il tente tout et se trompe souvent de dés ; il ne mise jamais plus de 25 groschens.</dd>
      <dt>Le vieil Ota</dt><dd>prudent, il garde ses points dès qu’il le peut ; 50 groschens au plus.</dd>
      <dt>Bětka, la servante</dt><dd>vive et maligne, elle sait quand s’arrêter ; 50 groschens au plus.</dd>
      <dt>Le Tavernier</dt><dd>le maître des lieux, le plus coriace ; il suit jusqu’à 100 groschens.</dd>
    </dl>

    <h3>Les règles de la maison</h3>
    <p>Deux règles connues des tavernes, à choisir dans les réglages (la roue dentée) ; elles comptent dès la partie suivante, pour les deux joueurs.</p>
    <dl class="controls opponents">
      <dt>Ouvrir à ${OPENING} points</dt><dd>pour inscrire ton premier score de la partie, il faut garder au moins ${OPENING} points en un seul tour.</dd>
      <dt>Trois Farkles : −${FARKLE_FINE}</dt><dd>trois Farkles d’affilée coûtent ${FARKLE_FINE} points (jamais au-dessous de zéro).</dd>
    </dl>

    <h3>Ton carnet</h3>
    <p>Touche ta bourse, dans le menu, pour ouvrir ton carnet : tes parties contre chacun, tes records,
      et ${FEATS.length} <b>hauts faits</b> à décrocher, comme garder 1000 points d’un coup ou battre le Tavernier sur une mise de 100 groschens.</p>

    <h3>Commandes</h3>
    ${controls}`;
}
// Page des règles : remplace le menu quand on vient du menu, se superpose au plateau en cours de partie
let rulesFrom = null;
function openRules(from) {
  rulesFrom = from;
  $('rules-body').innerHTML = rulesHTML();
  $('rules-body').scrollTop = 0;
  $('btn-rules-close').textContent = from === 'menu' ? 'Retour au menu' : 'Reprendre la partie';
  if (from === 'menu') $('menu').classList.add('hidden');
  $('rules').classList.remove('hidden');
}
export function closeRules() {
  if ($('rules').classList.contains('hidden')) return;
  $('rules').classList.add('hidden');
  if (rulesFrom === 'menu') $('menu').classList.remove('hidden');
}

// Boutons des règles
export function initRules() {
  $('btn-menu-rules').addEventListener('click', () => openRules('menu'));
  $('btn-rules').addEventListener('click', () => openRules('game'));
  $('btn-rules-close').addEventListener('click', closeRules);
  $('rules').addEventListener('click', (e) => { if (e.target.id === 'rules') closeRules(); });
}
