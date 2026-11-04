// Répliques dites à voix haute : clients de la taverne et adversaires (fichiers audio/voix/).

// Les clients racontent une anecdote de temps en temps et réagissent aux coups marquants.
// Chacun a sa place dans la salle (panoramique gauche/droite). Les paroles ne sont pas affichées à l’écran.
export const PATRONS = {
  vieux: { name: 'Le vieil Ota', pan: -0.55 },
  voyageur: { name: 'Un voyageur', pan: 0.6 },
  palefrenier: { name: 'Kuba, le palefrenier', pan: 0.35 },
  jeune: { name: 'Le jeune Vojta', pan: -0.25 },
  servante: { name: 'Bětka, la servante', pan: 0.1 },
  commere: { name: 'La mère Ludmila', pan: -0.7 },
  tavernier: { name: 'Le Tavernier', pan: 0 },
};
// fichier, client, texte prononcé (pour mémoire)
export const TALK = {
  anecdote: [
    ['anecdote_1', 'vieux', 'De mon temps, on jouait aux dés avec des osselets de mouton, et le perdant payait la bière de toute la compagnie. Un soir, le sergent a perdu trois fois de suite… Il a vendu son casque pour payer. Il a fait toute la campagne suivante avec une marmite sur la tête !'],
    ['anecdote_2', 'servante', 'Le forgeron jure qu’un chat noir lui a volé un jambon entier la semaine dernière. Moi, je dis surtout que le chat avait une barbe… et qu’on l’a retrouvé le lendemain, en train de ronfler dans la grange.'],
    ['anecdote_3', 'jeune', 'Paraît que le seigneur promet une bourse d’argent à qui retrouvera son faucon. Toute la paroisse court dans les bois depuis trois jours… et le faucon, lui, dort tranquille sur le clocher de l’église !'],
    ['anecdote_4', 'commere', 'Ma grand-mère disait toujours : ne joue jamais aux dés un vendredi… et jamais contre un homme qui sourit trop. Regardez donc le Tavernier… Il sourit, là.'],
    ['anecdote_5', 'palefrenier', 'Moi, j’ai vu un chevalier boire dix chopes sans s’asseoir ! Bon… à la onzième, il s’est assis. Dans l’auge des cochons.'],
    ['anecdote_6', 'voyageur', 'J’ai traversé trois royaumes pour arriver jusqu’ici. Et partout, c’est la même chose : la bière est tiède, les routes sont boueuses… et quelqu’un perd sa chemise aux dés.'],
    ['anecdote_7', 'commere', 'Le curé cherche encore qui a remplacé le vin de messe par de la piquette. Il a longuement regardé le sacristain… et le sacristain, lui, regardait ses chaussures.'],
    ['anecdote_8', 'vieux', 'Il y a quarante hivers, le gel a pris la rivière si fort qu’on a tenu la foire dessus. Le meunier y avait installé son étal de saucisses… Au dégel, l’étal est parti au fil de l’eau vers la ville, avec le meunier assis dessus… qui vendait encore !'],
    ['anecdote_9', 'vieux', 'Mon père disait : un dé qui roule par terre, c’est le diable qui veut jouer. Alors on le laissait là jusqu’au matin. Un soir, il en manquait trois… Et le chien du voisin, lui, avait l’air très content.'],
    ['anecdote_10', 'servante', 'Le seigneur est passé ce matin, il voulait goûter notre bière. Il en a bu une gorgée, il a fait une de ces grimaces… et puis il en a commandé un tonneau entier. Allez comprendre les nobles.'],
    ['anecdote_11', 'servante', 'Il y a un moine qui vient tous les jeudis pour prêcher contre la boisson. Il prêche jusqu’à la fermeture… et il repart toujours en chantant.'],
    ['anecdote_12', 'jeune', 'Mon maître dit qu’un jour, je serai le meilleur forgeron du pays. Pour l’instant, j’ai surtout réussi à ferrer un cheval… à l’envers. Il marche très bien, remarquez. Mais il recule quand on lui dit d’avancer.'],
    ['anecdote_13', 'jeune', 'On dit qu’un trésor est enterré sous le vieux chêne, près du moulin. Hier soir, on était six à creuser… Pas de trésor. Mais on a trouvé le bailli, qui creusait déjà de l’autre côté, avec sa lanterne éteinte !'],
    ['anecdote_14', 'palefrenier', 'La bière d’ici, c’est la meilleure du royaume ! Enfin… c’est la seule que je connaisse. Mais c’est la meilleure !'],
    ['anecdote_15', 'palefrenier', 'Hier, j’ai parié avec le charron que je rentrerais chez moi sans tomber dans le fossé. Et j’ai gagné ! Bon… je suis tombé dans le puits. Mais pas dans le fossé !'],
    ['anecdote_16', 'voyageur', 'Dans une grande ville, j’ai vu une horloge où de petits hommes de bois sortent à chaque heure, saluent… et rentrent dormir. Ici, c’est pareil : à minuit, Kuba se lève, salue… et retourne dormir sous la table.'],
    ['anecdote_17', 'commere', 'La fille du meunier a trois prétendants : le boulanger, le forgeron et le fils du tonnelier. Elle a promis d’épouser celui qui battrait le Tavernier aux dés… Ça fait deux ans qu’elle attend.'],
  ],
  farkle_toi: [
    ['farkle_toi_1', 'palefrenier', 'Rien du tout ! Les dés t’ont joué un sale tour !'],
    ['farkle_toi_2', 'commere', 'Oh, quelle déveine… La chance reviendra, va.'],
    ['farkle_toi_3', 'voyageur', 'Pas un seul point ! Ça arrive aux meilleurs.'],
    ['farkle_toi_4', 'vieux', 'Les dés sont capricieux, ce soir…'],
    ['farkle_toi_5', 'servante', 'Aïe, aïe, aïe… Rien à garder !'],
  ],
  farkle_tavernier: [
    ['farkle_tavernier_1', 'jeune', 'Le Tavernier fait chou blanc !'],
    ['farkle_tavernier_2', 'servante', 'Même le patron n’a pas la main, ce soir !'],
    ['farkle_tavernier_3', 'palefrenier', 'Ha ! Le patron s’est fait avoir !'],
    ['farkle_tavernier_4', 'vieux', 'Même le Tavernier ne commande pas aux dés.'],
  ],
  pot_perdu_toi: [
    ['pot_perdu_toi_1', 'voyageur', 'Aïe… Tout ce pot envolé. Il fallait garder !'],
    ['pot_perdu_toi_2', 'palefrenier', 'Ooooh ! Tout perdu ! J’en aurais pleuré dans ma bière.'],
  ],
  pot_perdu_tavernier: [
    ['pot_perdu_tavernier_1', 'commere', 'Le Tavernier a eu les yeux plus gros que le ventre ! Bien fait.'],
    ['pot_perdu_tavernier_2', 'jeune', 'Tout son pot, envolé ! Ce soir, la bière va être chère.'],
  ],
  des_brulants: [
    ['des_brulants_1', 'jeune', 'Les six dés ! Quelle main !'],
    ['des_brulants_2', 'servante', 'Dés brûlants ! Ça sent la chance, ça !'],
    ['des_brulants_3', 'vieux', 'Tous les six, d’un coup ? Le diable s’en mêle !'],
  ],
  trois_as: [
    ['trois_as_1', 'palefrenier', 'Trois as ! Vous avez vu ça ?'],
    ['trois_as_2', 'voyageur', 'Trois as sur la table ! Mille d’un coup !'],
  ],
  beau_lancer: [
    ['beau_lancer_1', 'servante', 'Oh, joli lancer, ça !'],
    ['beau_lancer_2', 'vieux', 'Ça, c’est un coup de maître !'],
  ],
  grosse_mise_toi: [
    ['grosse_mise_toi_1', 'jeune', 'Un beau pot à l’abri ! Le Tavernier peut trembler !'],
    ['grosse_mise_toi_2', 'commere', 'Voilà qui remplit la bourse !'],
  ],
  grosse_mise_tavernier: [
    ['grosse_mise_tavernier_1', 'palefrenier', 'Le patron se remplit les poches… comme d’habitude.'],
    ['grosse_mise_tavernier_2', 'voyageur', 'Il a de la veine, ce vieux renard.'],
  ],
  risque_paye: [
    ['risque_paye_1', 'jeune', 'Il fallait oser ! Et ça passe !'],
    ['risque_paye_2', 'servante', 'Ha ! Le risque a payé !'],
  ],
  victoire_toi: [
    ['victoire_toi_1', 'palefrenier', 'Le Tavernier est battu ! À boire pour tout le monde !'],
    ['victoire_toi_2', 'vieux', 'Bien joué. Ça faisait longtemps qu’on n’avait pas vu ça, ici.'],
  ],
  victoire_tavernier: [
    ['victoire_tavernier_1', 'voyageur', 'La maison gagne toujours…'],
    ['victoire_tavernier_2', 'servante', 'Allez, une autre partie ? Le Tavernier n’attend que ça.'],
  ],
};
// Ce que dit l’adversaire lui-même, assis en face du joueur (fichiers audio/voix/<adversaire>_<moment>_<n>.mp3) :
// debut (première main), nargue (le joueur fait Farkle), deveine (il fait Farkle), gros_tour (il garde 1000 ou plus),
// victoire, defaite, attente (le joueur tarde à jouer), beau_coup (il fait un beau lancer), mauvais_coup (son lancer
// ne rapporte presque rien), jaloux (le joueur fait un beau lancer), tente (il relance avec un ou deux dés)
export const OPP_TALK = {
  tavernier: {
    debut: ['Allez, montre-moi ce que tu as dans le ventre.', 'Les dés sont à toi… pour l’instant.'],
    nargue: ['Ha ! La maison te remercie.', 'Rien ? Quel dommage… pour toi.'],
    deveine: ['Bah ! Ces dés sont à moi, ils finiront par m’obéir.', 'Fichtre… Ça ne se reproduira pas.'],
    gros_tour: ['Et voilà comment on tient une taverne !'],
    victoire: ['La maison gagne toujours, l’ami.'],
    defaite: ['Bien joué… Mais ne t’y habitue pas.'],
    attente: ['Alors, l’ami ? Les dés ne vont pas se lancer tout seuls.', 'Je ferme à minuit, tu sais.', 'Tu comptes les poutres du plafond ? Lance donc !'],
    beau_coup: ['Ha ! Regarde-moi ça. Pas mal, hein ?', 'Voilà un lancer digne de la maison !'],
    mauvais_coup: ['Hmm… Pas fameux, ça.', 'Bah, on a vu mieux. Mais on a vu pire.'],
    jaloux: ['Pas mal… Ne t’emballe pas pour autant.', 'Tiens, tiens… La chance te sourit, ce soir.'],
    tente: ['Allez, encore un ! Qui ne risque rien n’a rien.', 'On ne tient pas une taverne sans prendre de risques !'],
  },
  palefrenier: {
    debut: ['Allez, à nous deux ! Et que le meilleur gagne.', 'J’ai les mains pleines de foin, mais les dés, ça me connaît !'],
    nargue: ['Ha ! Tu me ferais presque pitié… Presque !', 'Rien du tout ? Même mon âne fait mieux !'],
    deveine: ['Hé ! Ces dés ruent plus qu’une mule !', 'Bah ! Je suis tombé de selle. Je remonte !'],
    gros_tour: ['Au galop ! Ça, c’est de la course !'],
    victoire: ['Gagné ! Je vais le raconter aux chevaux !'],
    defaite: ['Perdu ? Bah… Tu as eu de la veine, voilà tout !'],
    attente: ['Hé, tu dors debout, comme un cheval ?', 'Allez, lance ! On ne va pas y passer la nuit !', 'Même une mule se déciderait plus vite !'],
    beau_coup: ['Hop ! Tu as vu ça ? Pas mal, hein ?', 'Ha ! Pur-sang, ce lancer !'],
    mauvais_coup: ['Oh… Un lancer de vieille carne, ça.', 'Hmm. On fera mieux au prochain.'],
    jaloux: ['Hé ! D’où tu sors ça, toi ?', 'Pas mal… Tu as mis des fers neufs, ou quoi ?'],
    tente: ['Allez, au galop ! Je relance !', 'Qui n’est jamais tombé n’est jamais monté à cheval !'],
  },
  vieux: {
    debut: ['Doucement, petit. Les dés n’aiment pas qu’on les brusque.', 'Voyons voir ce que les dés nous réservent.'],
    nargue: ['Tu as trop tenté, petit. Il faut savoir s’arrêter.', 'Hé hé. La patience, petit, la patience.'],
    deveine: ['Hmm. Même les vieux renards se font prendre.', 'Bah. Les dés ont la mémoire courte… Moi aussi.'],
    gros_tour: ['Voilà ce que donnent quarante ans de taverne.'],
    victoire: ['La sagesse finit toujours par payer, petit.'],
    defaite: ['Bien joué, petit. Tu me rappelles moi, à ton âge.'],
    attente: ['Prends ton temps, petit… Mais pas toute la nuit.', 'À mon âge, on n’a plus l’éternité devant soi, tu sais.', 'Tu réfléchis ? C’est bien. Mais lance, maintenant.'],
    beau_coup: ['Hé hé. Le vieux a encore de beaux restes.', 'Voilà ce qu’on appelle un lancer de patience.'],
    mauvais_coup: ['Hmm. Pas brillant. Il faudra s’en contenter.', 'Les dés sont fatigués, ce soir. Comme moi.'],
    jaloux: ['Joli, petit. Mais un beau lancer ne fait pas une partie.', 'Tiens donc… Tu apprends vite.'],
    tente: ['Allez… Une fois n’est pas coutume.', 'Je relance. Ne le dis à personne.'],
  },
  servante: {
    debut: ['Vite, vite ! J’ai des chopes qui attendent.', 'Allez, lance ! Et ne me fais pas perdre mon pourboire.'],
    nargue: ['Oh, rien du tout ? Pauvre chou !', 'Ha ! Ça, c’est pour la fois où tu as renversé ta bière.'],
    deveine: ['Zut ! Le patron m’a distraite.', 'Rien ? Bon… J’ai des chopes qui m’attendent, de toute façon.'],
    gros_tour: ['Et hop ! Ça, c’est le pourboire de la semaine !'],
    victoire: ['Gagné ! Je file servir, tu paieras en sortant.'],
    defaite: ['Bien joué… Mais je veux ma revanche après le service !'],
    attente: ['Tu lances, oui ? J’ai six chopes qui m’attendent !', 'Si tu t’endors, je te sers une soupe !', 'Dépêche-toi, le patron va me gronder !'],
    beau_coup: ['Et hop ! Servi chaud !', 'Ha ! Tu as vu ça ? Rapide comme le service.'],
    mauvais_coup: ['Pfff… Même la vaisselle tombe mieux que ça.', 'Bon. On ne gagne pas à tous les coups.'],
    jaloux: ['Oh ! Tu as triché, avoue !', 'Joli… Mais rien n’est encore joué.'],
    tente: ['Allez, je relance ! Qui ne risque rien n’a pas de pourboire !', 'Encore un, pour la route !'],
  },
};
// [fichier, qui parle, texte] pour chaque réplique d’un adversaire
export const oppLines = (opp, moment) => OPP_TALK[opp][moment].map((text, i) => [`${opp}_${moment}_${i + 1}`, opp, text]);
// Moment où l’adversaire peut répondre lui-même, pour chaque réaction des clients
// (attente, mauvais_coup et tente : l’adversaire seul, les clients n’ont rien à en dire)
export const OWN_MOMENT = {
  farkle_toi: 'nargue', pot_perdu_toi: 'nargue', farkle_tavernier: 'deveine', pot_perdu_tavernier: 'deveine',
  grosse_mise_tavernier: 'gros_tour', victoire_toi: 'defaite', victoire_tavernier: 'victoire', debut: 'debut',
  grosse_mise_toi: 'jaloux', attente: 'attente', mauvais_coup: 'mauvais_coup', tente: 'tente',
};
// Les clients parlent de l’adversaire du moment, jamais d’un autre : les réactions qui nomment le Tavernier
// (ou le font passer pour ton adversaire) ne viennent que quand c’est lui qui joue ;
// l’anecdote sur Kuba n’est pas racontée quand il est assis à ta table
export const ABOUT_TAVERNIER = new Set(['farkle_tavernier', 'pot_perdu_tavernier', 'grosse_mise_tavernier', 'victoire_tavernier']);
export const ONLY_VS = { grosse_mise_toi_1: 'tavernier', victoire_toi_1: 'tavernier', anecdote_4: 'tavernier' };
export const NOT_VS = { anecdote_16: 'palefrenier' };
