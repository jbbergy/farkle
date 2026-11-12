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
  tavernier: { name: 'Le Tavernier', pan: -0.35 }, // derrière son comptoir, quand il ne joue pas
};
// fichier, client, texte prononcé (pour mémoire)
export const TALK = {
  anecdote: [
    ['anecdote_1', 'vieux', 'À Constantinople, on jouait aux dés avec des osselets de mouton, et le perdant payait la bière de toute la compagnie. Un soir, le sergent a perdu trois fois de suite… Il a vendu son casque pour payer. Il a fait toute la campagne suivante avec une marmite sur la tête !'],
    ['anecdote_2', 'servante', 'Le forgeron jure qu’un chat noir lui a volé un jambon entier la semaine dernière. Moi, je dis surtout que le chat avait une barbe… et qu’on l’a retrouvé le lendemain, en train de ronfler dans la grange.'],
    ['anecdote_3', 'jeune', 'Paraît que le seigneur promet une bourse d’argent à qui retrouvera son faucon. Toute la paroisse court dans les bois depuis trois jours… et le faucon, lui, dort tranquille sur le clocher de l’église !'],
    ['anecdote_4', 'commere', 'Ma grand-mère disait toujours : ne joue jamais aux dés un vendredi… et jamais contre un homme qui sourit trop. Regardez donc le Tavernier… Il sourit, là.'],
    ['anecdote_5', 'palefrenier', 'Moi, j’ai vu un chevalier boire dix chopes sans s’asseoir ! Bon… à la onzième, il s’est assis. Dans l’auge des cochons.'],
    ['anecdote_6', 'voyageur', 'J’ai traversé trois royaumes pour arriver jusqu’ici. Et partout, c’est la même chose : la bière est tiède, les routes sont boueuses… et quelqu’un perd sa chemise aux dés.'],
    ['anecdote_7', 'commere', 'Le curé cherche encore qui a remplacé le vin de messe par de la piquette. Il a longuement regardé le sacristain… et le sacristain, lui, regardait ses chaussures.'],
    ['anecdote_8', 'vieux', 'À Novgorod, le gel a pris la rivière si fort qu’on a tenu la foire dessus. Un meunier y avait installé son étal de saucisses… Au dégel, l’étal est parti au fil de l’eau vers la mer, avec le meunier assis dessus… qui vendait encore !'],
    ['anecdote_9', 'vieux', 'Mon père disait : un dé qui roule par terre, c’est le diable qui veut jouer. Alors on le laissait là jusqu’au matin. Un soir, il en manquait trois… Et le chien du voisin, lui, avait l’air très content.'],
    ['anecdote_10', 'servante', 'Le seigneur est passé ce matin, il voulait goûter notre bière. Il en a bu une gorgée, il a fait une de ces grimaces… et puis il en a commandé un tonneau entier. Allez comprendre les nobles.'],
    ['anecdote_11', 'servante', 'Il y a un moine qui vient tous les jeudis pour prêcher contre la boisson. Il prêche jusqu’à la fermeture… et il repart toujours en chantant.'],
    ['anecdote_12', 'jeune', 'Mon maître dit qu’un jour, je serai le meilleur forgeron du pays. Pour l’instant, j’ai surtout réussi à ferrer un cheval… à l’envers. Il marche très bien, remarquez. Mais il recule quand on lui dit d’avancer.'],
    ['anecdote_13', 'jeune', 'On dit qu’un trésor est enterré sous le vieux chêne, près du moulin. Hier soir, on était six à creuser… Pas de trésor. Mais on a trouvé le bailli, qui creusait déjà de l’autre côté, avec sa lanterne éteinte !'],
    ['anecdote_14', 'palefrenier', 'La bière d’ici, c’est la meilleure du royaume ! Enfin… c’est la seule que je connaisse. Mais c’est la meilleure !'],
    ['anecdote_15', 'palefrenier', 'Hier, j’ai parié avec le charron que je rentrerais chez moi sans tomber dans le fossé. Et j’ai gagné ! Bon… je suis tombé dans le puits. Mais pas dans le fossé !'],
    ['anecdote_16', 'voyageur', 'Dans une grande ville, j’ai vu une horloge où de petits hommes de bois sortent à chaque heure, saluent… et rentrent dormir. Ici, c’est pareil : à minuit, Kuba se lève, salue… et retourne dormir sous la table.'],
    ['anecdote_17', 'commere', 'La fille du meunier a trois prétendants : le boulanger, le forgeron et le fils du tonnelier. Elle a promis d’épouser celui qui battrait le Tavernier aux dés… Ça fait deux ans qu’elle attend.'],
    ['anecdote_18', 'voyageur', 'Sur la route des mines d’argent, j’ai croisé un marchand de reliques. Il m’a montré un doigt de saint Procope… puis un deuxième… puis un troisième. Je lui ai demandé si son saint avait des mains de râteau. Il m’a vendu le quatrième à moitié prix.'],
    ['anecdote_19', 'jeune', 'Hier, le bailli m’a envoyé compter les moutons du seigneur. J’en ai compté quarante le matin… et quarante et un le soir. Le quarante et unième, c’était le meunier, à quatre pattes dans l’herbe, qui cherchait sa bague.'],
    ['anecdote_20', 'commere', 'La femme du boulanger se vante que son mari se lève avant le coq. C’est vrai, je l’ai vu… Il se lève avant le coq pour aller chez la veuve d’à côté. Et depuis, le coq chante deux fois chaque matin : une fois pour le jour, une fois pour la veuve.'],
    ['anecdote_21', 'vieux', 'Un soir, en Valachie, j’ai joué aux dés contre le diable, à la croisée des chemins. Il a fait trois six. Moi aussi, j’ai fait trois six… avec ses dés à lui. Il est reparti furieux. Depuis, il ne joue plus qu’avec les gens de la ville.'],
    ['anecdote_22', 'servante', 'Ce matin, un chevalier m’a demandé une chambre avec vue sur la rivière. Je lui ai donné la grange : quand il pleut, la rivière entre jusque sous le lit. Il a dit que c’était la plus belle vue de tout son voyage.'],
    ['anecdote_23', 'voyageur', 'À la frontière, un douanier m’a fait payer une taxe sur mon chapeau, une sur mes bottes… et une sur ma barbe. Alors je me suis rasé la barbe, là, devant lui. Il m’a fait payer la taxe sur le rasoir.'],
    ['anecdote_24', 'palefrenier', 'Le cheval du bailli n’avance que si on lui chante une chanson. Mais le bailli chante faux… Alors maintenant, il va partout à pied, et c’est le cheval qui le suit derrière, pour se moquer de lui !'],
    ['anecdote_25', 'commere', 'Le sonneur de cloches est sourd comme un pot. Dimanche, il a sonné le glas en plein mariage. Le marié est devenu tout blanc, la mariée a fondu en larmes… Ils se sont mariés quand même. Mais depuis, ils se disputent à chaque coup de cloche.'],
    ['anecdote_26', 'jeune', 'Pour impressionner la fille du meunier, j’ai porté deux sacs de farine à la fois. Je suis arrivé chez elle tout blanc, de la tête aux pieds. Elle a crié au fantôme… et son père m’a couru après avec une fourche jusqu’au pont.'],
    ['anecdote_27', 'servante', 'Un marchand de passage a payé sa chambre avec une poule qui pondait des œufs d’or, à ce qu’il disait. Le patron a accepté. Ça fait trois semaines que la poule pond… des œufs tout à fait normaux. Et le marchand, lui, on ne l’a jamais revu.'],
    ['anecdote_28', 'voyageur', 'Sur la route de Prague, j’ai croisé un chevalier qui demandait son chemin à un panneau. Le panneau ne répondait pas… alors il l’a provoqué en duel. Il a perdu. Le panneau est toujours debout, et le chevalier, lui, cherche encore son chemin.'],
    ['anecdote_29', 'vieux', 'À Venise, j’ai parié avec un gondolier que je traverserais le Grand Canal sans me mouiller les pieds. Il a misé sa gondole. Et j’ai traversé… sur le pont du Rialto. Depuis, quand je passe, il me salue avec sa rame. Et pas pour me dire bonjour.'],
    ['anecdote_30', 'palefrenier', 'Le cheval du meunier a appris à ouvrir la porte de l’écurie tout seul. Chaque nuit, il sort, il va manger les pommes du curé… et il rentre se coucher avant l’aube. Le curé accuse les enfants du village. Moi, je ne dis rien : le cheval me paie en pommes.'],
    ['anecdote_31', 'commere', 'Le bailli s’est fait peindre par un peintre de passage. Le peintre l’a fait plus mince, plus grand, avec toutes ses dents… Le bailli était si content qu’il a accroché le tableau sur la place. Depuis, tout le village salue le portrait… et plus personne ne salue le bailli.'],
    ['anecdote_32', 'servante', 'Hier soir, un marchand m’a demandé une bière pas trop froide, pas trop chaude, pas trop mousseuse, pas trop plate. J’ai rempli une chope au hasard et je lui ai dit que c’était une bière spéciale, rien que pour lui. Il l’a trouvée parfaite. Il en a recommandé six… toutes du même tonneau.'],
  ],
  farkle_toi: [
    ['farkle_toi_1', 'palefrenier', 'Rien du tout ! Les dés t’ont joué un sale tour !'],
    ['farkle_toi_2', 'commere', 'Oh, quelle déveine… La chance reviendra, va.'],
    ['farkle_toi_3', 'voyageur', 'Pas un seul point ! Ça arrive à tout le monde.'],
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
  // plus de trois as : la mère Ludmila n’en revient pas (voir commentRoll)
  quatre_as: [
    ['quatre_as_1', 'commere', 'Quatre as ! Sainte Vierge, je n’ai jamais vu ça !'],
  ],
  cinq_as: [
    ['cinq_as_1', 'commere', 'Cinq as ! Mais qui a béni ces dés-là ?'],
  ],
  six_as: [
    ['six_as_1', 'commere', 'Six as ! Seigneur… Je vais raconter ça jusqu’à ma mort !'],
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
  // le Tavernier, de loin, quand le joueur écrase l’insecte (dit directement par catchBug, dans evenements.js)
  merci: [
    ['tavernier_merci_1', 'tavernier', 'Merci !'],
  ],
};
// Ce que dit l’adversaire lui-même, assis en face du joueur (fichiers audio/voix/<adversaire>_<moment>_<n>.mp3) :
// debut (première main), nargue (le joueur fait Farkle), deveine (il fait Farkle), gros_tour (il garde 1000 ou plus),
// victoire, defaite, attente (le joueur tarde à jouer), beau_coup (il fait un beau lancer), mauvais_coup (son lancer
// ne rapporte presque rien), jaloux (le joueur fait un beau lancer), tente (il relance avec un ou deux dés),
// abandon (son dernier tour est perdu d’avance : il ne lance pas, voir concede dans partie.js),
// insecte (une bestiole traverse le plateau, voir evenements.js ; jamais chez le Tavernier, qui n’en a donc pas),
// ecrase (le joueur vient d’écraser la bestiole, juste avant le « Merci ! » du Tavernier),
// brulant (ses six dés rapportent : il les reprend tous), rattrapage (le joueur a atteint l’objectif : il commence
// son dernier tour pour le dépasser), dernier_tour (il vient d’atteindre l’objectif : le joueur commence le sien),
// devant (il passe devant le joueur en gardant ses points), prudent (le joueur garde peu, avec encore trois dés ou plus)
export const OPP_TALK = {
  tavernier: {
    debut: ['Allez, montre-moi ce que tu as dans le ventre.', 'Les dés sont à toi… pour l’instant.', 'Bienvenue à ma table. Ici, les dés sont honnêtes… presque toujours.', 'Installe-toi. La maison ne refuse jamais un client.'],
    nargue: ['Ha ! La maison te remercie.', 'Rien ? Quel dommage… pour toi.', 'Rien du tout ! Je mets ça sur ta note ?', 'Ah, les dés… Ils savent qui tient la taverne.', 'Rien ? La maison compatit. Enfin… elle fait semblant.'],
    deveine: ['Bah ! Ces dés sont à moi, ils finiront par m’obéir.', 'Fichtre… Ça ne se reproduira pas.', 'Qui a renversé de la bière sur mes dés ?', 'Même la maison a ses mauvais soirs.', 'Hmm. Je vais dire au menuisier de raboter ces dés.'],
    gros_tour: ['Et voilà comment on tient une taverne !', 'Ça, c’est le loyer de la semaine.', 'Je range ça au tiroir, avec la recette du soir.'],
    victoire: ['La maison gagne toujours.', 'Ne fais pas cette tête. La prochaine chope, c’est moi qui l’offre.', 'Reviens quand tu veux. Ma porte et mes dés t’attendent.'],
    defaite: ['Bien joué… Mais ne t’y habitue pas.', 'Battu dans ma propre taverne… Ça, on ne le racontera pas.', 'Bon. Tu as gagné. Mais tu reviendras… Ils reviennent tous.'],
    attente: ['Alors ? Les dés ne vont pas se lancer tout seuls.', 'Je ferme à minuit, tu sais.', 'Tu comptes les poutres du plafond ? Lance donc !', 'Les dés refroidissent…', 'Prends ton temps… Je compte les chopes, en attendant.', 'Tu veux que je t’apporte un oreiller ? Ce sera un groschen.'],
    beau_coup: ['Ha ! Regarde-moi ça. Pas mal, hein ?', 'Voilà un lancer digne de la maison !', 'Tu as vu ça ? Ces dés me connaissent.', 'Et hop ! La maison a encore de la ressource.', 'Voilà ! Servi comme une bière bien tirée.'],
    mauvais_coup: ['Hmm… Pas fameux, ça.', 'Bah, on a vu mieux. Mais on a vu pire.', 'Tss… Ces dés ont trop bu, ce soir.', 'Hmm. Ça ne paiera pas le tonneau, ça.'],
    jaloux: ['Pas mal… Ne t’emballe pas pour autant.', 'Tiens, tiens… La chance te sourit, ce soir.', 'Hmm… Tu ne me caches pas un dé dans ta manche, toi ?', 'Joli. Profites-en, ça ne durera pas.', 'Hmm… Tu as soufflé sur tes dés, ou tu as payé le curé ?'],
    tente: ['Allez, encore un ! Qui ne risque rien n’a rien.', 'On ne tient pas une taverne sans prendre de risques !', 'Je relance. La maison ne recule jamais.', 'Un dernier pour la route… et pour la caisse !'],
    abandon: ['Bon… Même la maison sait quand il faut fermer boutique. Tu as gagné.', 'Rattraper tout ça ? Même avec mes meilleurs dés… Allez, je te sers une chope, tu l’as méritée.', 'Je range mes dés. Ce soir, la caisse est pour toi… Mais n’en parle à personne.'],
    brulant: ['Les six ! La maison reprend tout, et elle remet ça.', 'Tous les six ! On ne quitte pas une table aussi généreuse.', 'Ha ! Les six dés reviennent à la maison. Comme les clients.'],
    rattrapage: ['Tu crois m’avoir ? On va voir ce que vaut la maison, le dos au mur.', 'Dernier tour. Tiens bien ta chope : la maison va tout tenter.'],
    dernier_tour: ['À toi, maintenant. Il te faudra plus que de la chance pour me passer devant.', 'Ton dernier tour. Ne tremble pas trop, ça porte malheur aux dés.'],
    devant: ['Et voilà la maison devant. C’est l’ordre naturel des choses.', 'Je passe devant. Ne le prends pas mal : c’est ma taverne.', 'Tiens, compte les points. Qui mène, maintenant ?'],
    prudent: ['Si peu ? Avec autant de dés en main ? Tu me déçois.', 'Tu ramasses les miettes… La maison, elle, prend le pain.', 'Sage décision. Ou peureuse, je ne sais pas encore.'],
  },
  palefrenier: {
    debut: ['Allez, à nous deux ! Et que les dés décident !', 'J’ai les mains pleines de foin, mais les dés, ça me connaît !', 'J’ai bouchonné six chevaux aujourd’hui. Les dés, ce sera du repos !', 'Allez, en selle ! Que la partie commence !'],
    nargue: ['Ha ! Tu me ferais presque pitié… Presque !', 'Rien du tout ? Même mon âne fait mieux !', 'Rien ! Tu viens de tomber de cheval !', 'Ha ! Les dés t’ont fait un croche-pied !', 'Rien ! Même les mouches de l’écurie ont pitié de toi !'],
    deveine: ['Hé ! Ces dés ruent plus qu’une mule !', 'Bah ! Je suis tombé de selle. Je remonte !', 'Rien ! On dirait mon vieux cheval : il refuse l’obstacle !', 'Rien ! Bah, je l’avais bien cherché, celle-là.', 'Rien ! Bah, c’est ma tournée de malchance, ce soir.'],
    gros_tour: ['Au galop ! Ça, c’est de la course !', 'Ha ! Ça, c’est de l’avoine pour tout l’hiver !', 'Je garde tout ! Ce soir, c’est moi qui paie la tournée… enfin, peut-être !'],
    victoire: ['Gagné ! Je vais le raconter aux chevaux !', 'Gagné ! Gagné ! Je n’y crois pas moi-même !', 'Victoire ! Le palefrenier passe la ligne en premier !'],
    defaite: ['Perdu ? Bah… Tu as eu de la veine, voilà tout !', 'Perdu… Je retourne à mes écuries, la queue basse.', 'Bien joué, va ! On fera la revanche après le foin.'],
    attente: ['Hé, tu dors debout, comme un cheval ?', 'Allez, lance ! On ne va pas y passer la nuit !', 'Même une mule se déciderait plus vite !', 'Mes chevaux vont finir par s’inquiéter, tu sais !', 'Tu lances, ou tu fais tes prières ?', 'Je pourrais ferrer un cheval, le temps que tu lances !'],
    beau_coup: ['Hop ! Tu as vu ça ? Pas mal, hein ?', 'Ha ! Pur-sang, ce lancer !', 'Ha ! Ça galope, ce soir !', 'Tu as vu ? Net comme un fer tout neuf !', 'Ha ! Tu as vu ça ? J’ai la main bénie, ce soir !'],
    mauvais_coup: ['Oh… Un lancer de vieille carne, ça.', 'Hmm. On fera mieux au prochain.', 'Pfff… Ces dés boitent, ce soir.', 'Bah. Même le meilleur cheval trébuche.'],
    jaloux: ['Hé ! D’où tu sors ça, toi ?', 'Pas mal… Tu as mis des fers neufs, ou quoi ?', 'Oh ! Tu caches un trèfle à quatre feuilles dans ta botte ?', 'Joli… Tu cours comme un poulain, toi !', 'Ho ho ! Tu as de la veine, comme un cheval qui trouve l’avoine !'],
    tente: ['Allez, au galop ! Je relance !', 'Qui n’est jamais tombé n’est jamais monté à cheval !', 'Hue ! Je relance, et advienne que pourra !', 'Allez, encore un saut d’obstacle !'],
    abandon: ['Autant courir après un cheval échappé ! J’abandonne, tu as gagné.', 'Rattraper tout ça ? Même au grand galop, je n’y arriverais pas ! Bien joué.', 'Bah ! Je jette l’éponge… et je vais boire un coup pour me consoler.'],
    insecte: ['Hé ! Tu as vu ça ?! Une bestiole sur la table !', 'Ouh là ! Tu as vu ça ? Même à l’écurie, on n’en a pas des comme ça !', 'Regarde ! Il y a une bête qui galope sur le plateau !'],
    ecrase: ['Tu l’as eu ! Joli coup de sabot !', 'Ha ! Tu l’as eu ! Elle ne galopera plus, celle-là !', 'Tu l’as eu ! Bien visé !'],
    brulant: ['Les six ! Allez, on remet en selle !', 'Tous les six ! Ça, c’est un sans-faute à l’obstacle !', 'Ha ! Les six dés ! Je reprends tout, et je fonce !'],
    rattrapage: ['Dernier tour ? Alors je lâche la bride, et advienne que pourra !', 'Bon ! Il faut que je te rattrape. J’ai rattrapé des chevaux plus rapides que toi !'],
    dernier_tour: ['À toi de me rattraper ! Mais je galope loin devant.', 'Ton dernier tour ! Je croise les doigts… pour moi !'],
    devant: ['Je passe devant ! Comme à la course de la foire !', 'Ha ! Une encolure d’avance !', 'Devant ! Je te laisse ma poussière.'],
    prudent: ['Tu t’arrêtes déjà ? Tu ne vas pas loin, au petit trot !', 'Si peu ? Allez, un peu de courage, voyons !', 'Tu gardes ça ? Moi, j’aurais relancé les yeux fermés !'],
  },
  vieux: {
    debut: ['À toi de lancer ! Je finis d’expliquer la partie à mes dés.', 'Ces dés-là ont fait le tour du monde dans ma botte. Excuse l’odeur !', 'Assieds-toi ! Non, pas là : c’est la place de mon ami invisible.', 'J’ai joué aux dés à Venise, au Caire et à Samarcande. Partout, j’ai perdu ma chemise. Ici, je la garde !'],
    nargue: ['Rien ! À Constantinople, pour un lancer pareil, on t’aurait offert un chameau… par pitié.', 'Hé hé ! Mes dés m’avaient prévenu. Ils sont très bavards, ce soir.', 'Rien du tout ! J’ai connu un chameau qui lançait mieux que ça. Il trichait, remarque.', 'Tu sais ce qu’on dit, à Damas ? Moi non plus, je n’ai jamais rien compris. Mais là, tu as perdu !', 'Rien ! À Venise, les gondoliers chantent pour les perdants. Moi, je ne chanterai pas : j’ai promis à mes dés.'],
    deveine: ['Rien ! Je l’avais bien dit, à Lisbonne : n’achète jamais de dés à un perroquet.', 'Bah ! À Gênes, j’ai perdu un navire entier au jeu. Alors, quelques points…', 'Toi, le dé du milieu, on en reparlera ce soir, tous les deux !', 'Rien ! C’est la faute de la lune. Elle est passée derrière mon oreille.', 'Rien ! Mon ami invisible a soufflé sur les dés. Il est de l’autre côté, ce traître.'],
    gros_tour: ['Je garde tout ! Le sultan m’avait bien dit que j’irais loin. Il me l’a dit en me chassant.', 'Petit à petit, l’oiseau fait son nid. Moi, j’en ai connu un qui le faisait dans ma barbe.', 'Voilà. On garde, et on ne fait pas le malin.'],
    victoire: ['Gagné ! Ce soir, je danse la danse des marins de Gênes. Tiens-moi ma chope !', 'Ne sois pas triste. Au Caire, qui perd doit embrasser un crocodile. Ici, tu t’en tires bien !', 'Gagné ! Mon ami invisible te remercie pour la partie. Il dit que tu sens bon.'],
    defaite: ['Bien joué ! À Samarcande, on t’aurait mis sur le trône. Ou à la potence. Je confonds toujours.', 'Battu ! Bon, je le note sur ma botte gauche. La droite est déjà pleine.', 'Bah ! Ces dés m’ont trahi. Je les abandonnerai sur la première île venue !'],
    attente: ['Prends ton temps… J’ai traversé le désert plus vite que ça.', 'Pendant que tu réfléchis, je vais à Venise et je reviens. Tu veux quelque chose ?', 'Tu réfléchis ? C’est bien. Mais lance, maintenant.', 'Les dés me demandent si tu dors. Je leur ai dit d’attendre encore un peu.', 'Tu connais l’histoire du joueur qui ne lançait jamais ? Non ? Elle n’a pas de fin, elle non plus.', 'Pendant que tu réfléchis, mon ami invisible fait la sieste. Il ronfle, d’ailleurs.'],
    beau_coup: ['Hé hé ! Ce lancer-là, je l’ai appris chez les pirates !', 'Ha ! C’est ce que j’appelle un lancer de Constantinople. Ça ne veut rien dire, mais c’est beau !', 'Merci, les dés ! Je vous achèterai le petit chapeau promis.', 'Ah ! Celui-là, je l’attendais depuis la Saint-Martin.', 'Hé hé ! Celui-là, je l’ai lancé comme on lance un filet, à Lisbonne.'],
    mauvais_coup: ['Hmm. Pas brillant. À Lisbonne, on jetterait ça aux mouettes.', 'Les dés ont le mal de mer, ce soir. C’est ma faute, je les ai trop fait voyager.', 'Hé ! Qui a soufflé ? Mon ami invisible, je t’ai vu !', 'Hmm. C’est peu… Mais c’est mieux que rien.'],
    jaloux: ['Joli ! Mais j’ai vu mieux, à Bagdad. Un singe, avec un seul dé.', 'Tiens donc… Tu as appris ça où ? Chez les pirates, je parie.', 'Ha ! Mes dés me disent que tu leur as fait les yeux doux.', 'Joli coup. Ne le dis pas trop fort, les dés écoutent.', 'Joli ! Mes dés veulent changer de camp. Je leur ai dit non.'],
    tente: ['Allez… Une fois n’est pas coutume.', 'Je relance. Ne le dis à personne.', 'Un jour, j’ai sauté d’un navire pour un pari. Ce n’est pas un dé qui va me faire peur !', 'Mon ami invisible dit de relancer. La dernière fois, il avait tort. Je relance !'],
    abandon: ['Hmm… Même à Samarcande, on ne joue pas une partie perdue. Je repose les dés.', 'Il me faudrait un miracle. Et le dernier, je l’ai échangé contre une chèvre, à Damas. Tu as gagné !', 'Non, non… Je garde mes forces pour la prochaine traversée. Bien joué !'],
    insecte: ['Tiens… Tu as vu ça ? On a de la visite.', 'Hé hé… Une petite bête qui veut jouer aux dés avec nous.', 'Tu as vu ça ? Au Caire, elles sont plus grosses… et elles paient leur bière !'],
    ecrase: ['Hé hé… Tu l’as eu ! Bons réflexes.', 'Tu l’as eu ! Aux Indes, on t’aurait confié la chasse aux tigres !', 'Tu l’as eu. Paix à son âme… hé hé.'],
    brulant: ['Les six ! Au Caire, ça vaut une fête de trois jours.', 'Tous les six ! Revenez, mes dés, on repart en voyage !', 'Hé hé ! Six dés, six amis. Le septième est invisible.'],
    rattrapage: ['Mon dernier tour ? J’ai traversé des tempêtes, je traverserai bien celle-là.', 'Allez, mes dés. Comme à Gênes : on rame, et on ne se retourne pas !'],
    dernier_tour: ['À toi ! Mes dés te souhaitent bonne chance. Ils mentent, ce sont des voyous.', 'Ton dernier tour ! À Damas, on boirait un thé en attendant. Ici, je bois ma bière.'],
    devant: ['Hé hé ! Je passe devant, comme un chameau qui a senti l’oasis.', 'Devant ! Mon ami invisible danse sur la table. Tu ne le vois pas ? Tant mieux.', 'Oh ! Je mène. Qui l’eût cru ? Pas mes dés, en tout cas.'],
    prudent: ['Tu gardes si peu ? Même moi, je ne suis pas si sage. Enfin… si, parfois.', 'Hé hé ! On ne prend pas la mer par gros temps, hein ? C’est sage.', 'Si peu ? Mes dés bâillent. Regarde, ils bâillent !'],
  },
  servante: {
    debut: ['Vite, vite ! J’ai des chopes qui attendent.', 'Allez, lance ! Et ne me fais pas perdre mon pourboire.', 'Une petite partie entre deux chopes ? Allez, j’ai cinq minutes !', 'Le patron regarde ailleurs… On peut jouer !'],
    nargue: ['Oh, rien du tout ? Pauvre chou !', 'Ha ! Ça, c’est pour la fois où tu as renversé ta bière.', 'Rien ! Tu veux une chope pour te consoler ? Elle n’est pas gratuite !', 'Oh là là ! Même le chien de la cour lance mieux que ça.', 'Rien ! Je te mets une chope de consolation sur l’ardoise ?'],
    deveine: ['Zut ! Le patron m’a distraite.', 'Rien ? Bon… J’ai des chopes qui m’attendent, de toute façon.', 'Pfff ! J’ai encore les mains mouillées de vaisselle !', 'Rien… Et mon pourboire qui s’envole.', 'Rien ! C’est la faute du patron : il m’a fait laver les dés dans l’eau de vaisselle.'],
    gros_tour: ['Et hop ! Ça, c’est le pourboire de la semaine !', 'Je garde ! Le patron va être jaloux !', 'Hop, dans mon tablier ! Personne n’a rien vu.'],
    victoire: ['Gagné ! Je file servir, tu paieras en sortant.', 'Gagné ! Attends que je raconte ça en cuisine !', 'Merci pour la partie ! Tu laisseras un pourboire, hein ?'],
    defaite: ['Bien joué… Mais je veux ma revanche après le service !', 'Perdu… Bon, retour aux chopes.', 'Tu as gagné ? Alors c’est toi qui paies la prochaine tournée !'],
    attente: ['Tu lances, oui ? J’ai six chopes qui m’attendent !', 'Si tu t’endors, je te sers une soupe !', 'Dépêche-toi, le patron va me gronder !', 'La bière tiédit, et toi, tu réfléchis !', 'J’aurais le temps de laver toute la vaisselle, le temps que tu te décides !', 'Tu lances, ou je débarrasse ?'],
    beau_coup: ['Et hop ! Servi chaud !', 'Ha ! Tu as vu ça ? Rapide comme le service.', 'Oh, regarde ! Même le patron n’en fait pas des comme ça !', 'Ha ! Une tournée générale de points !', 'Ha ! Celui-là, je le sers avec le sourire.'],
    mauvais_coup: ['Pfff… Même la vaisselle tombe mieux que ça.', 'Bon. On ne gagne pas à tous les coups.', 'Bah ! Des miettes. Comme les pourboires du bailli.', 'Pas terrible… J’aurais dû souffler dessus.'],
    jaloux: ['Oh ! Tu as triché, avoue !', 'Joli… Mais rien n’est encore joué.', 'Oh, oh ! Tu as bu la potion de la sorcière, toi ?', 'Joli… Je vais mettre de l’eau dans ta bière, moi !', 'Oh, joli ! Tu as dû laisser un bon pourboire à la chance.'],
    tente: ['Allez, je relance ! Qui ne risque rien n’a pas de pourboire !', 'Encore un, pour la route !', 'Allez, je tente ! Le patron n’en saura rien.', 'Encore ! Je sens que la chance a soif, ce soir.'],
    abandon: ['Rattraper tout ça ? Même le patron n’y croirait pas ! J’abandonne.', 'Tant pis, je rends mon tablier ! Enfin… seulement pour cette partie.', 'Bravo ! Je ne vais pas lancer pour rien : j’ai six tables à servir.'],
    insecte: ['Ah ! Tu as vu ça ?! Une bestiole ! Le patron va encore dire que je nettoie mal !', 'Beurk ! Écrase-la, vite, avant que le patron la voie !', 'Oh non, pas encore une ! Tu as vu ça ? Elle file vers ta chope !'],
    ecrase: ['Tu l’as eu ! Ouf… le patron n’a rien vu.', 'Beurk ! Mais bravo, tu l’as eu !', 'Tu l’as eu ! Merci, moi je n’aurais jamais osé !'],
    brulant: ['Les six ! Comme une tournée générale !', 'Tous les six ! Je ramasse, et je ressers !', 'Ha ! Six sur six ! Le patron n’en reviendrait pas.'],
    rattrapage: ['Mon dernier tour ? Bon, je retrousse mes manches.', 'Il faut que je te rattrape ? J’ai rattrapé des chopes qui tombaient de plus haut !'],
    dernier_tour: ['À toi ! Et sans traîner : il y a du monde qui attend la table.', 'Ton dernier tour ! Je croise les doigts… mais pas pour toi.'],
    devant: ['Hop ! Je passe devant, comme au comptoir.', 'Devant ! Pardon, je me faufile, comme entre les tables.', 'Et voilà qui mène, maintenant ! Tu as vu ?'],
    prudent: ['C’est tout ? Même le bailli laisse plus de pourboire.', 'Tu gardes ça ? Ça ne paierait même pas une demi-chope !', 'Prudence, prudence… Moi, j’aurais tenté !'],
  },
  chevalier: {
    debut: ['Bonjour ! Enfin, bonsoir. Enfin… bonne partie !', 'À toi de lancer ! Moi, je regarde comment tu fais, et après je fais pareil.', 'Mon seigneur m’a envoyé en quête. J’ai oublié de quoi. Alors je cherche aux dés, on ne sait jamais.', 'Les dés, c’est le jeu avec les petits cubes ? Ah, parfait ! J’ai révisé.'],
    nargue: ['Rien du tout ! Même moi, je n’arrive pas à faire aussi peu. Et pourtant, je m’entraîne !', 'Oh, rien ? Ne t’en fais pas. Moi, ça m’arrive tout le temps, et je suis chevalier !', 'Rien ! Ça veut dire que j’ai gagné ? Non ? Ah. Mais c’est bien pour moi quand même ?', 'Rien… Comme disait ma mère : qui sème le vent… euh… perd ses graines.', 'Rien ! C’est comme ma quête, ça : on cherche, on cherche… et rien.'],
    deveine: ['Rien ? J’ai pourtant lancé très fort. Peut-être pas dans le bon sens.', 'Rien ! Ce n’est pas grave, j’ai l’habitude. C’est même ce que je fais le mieux.', 'Attends… Zéro, c’est combien, déjà ? Ah. C’est rien. D’accord.', 'Rien. Mon épée aussi, elle me fait ça : je la sors, et puis rien.', 'Hé ! Il y avait un trois, tout à l’heure. Où il est parti, le trois ?'],
    gros_tour: ['Je garde tout ! Je ne sais pas combien ça fait, mais ça a l’air beaucoup.', 'Mille ! Ou cent. Il y a beaucoup de zéros, en tout cas : c’est bon signe.', 'Ha ! Je range ça dans mon armure. Il y a de la place, elle est trop grande.'],
    victoire: ['J’ai gagné ? Moi ? Il faut que je l’écrive ! Quelqu’un sait écrire ?', 'Victoire ! Mon seigneur va être fier. Enfin, s’il se souvient de moi.', 'Gagné ! Je ne sais pas comment, mais je recommencerai pareil.'],
    defaite: ['Perdu ! Bon, je note : la prochaine fois, gagner.', 'J’ai perdu ? Pourtant, j’avais plein de points. Ah, tu en avais plus. C’est malin.', 'Bravo ! Tu joues mieux que moi. Bon, ce n’est pas très difficile, mais bravo quand même !'],
    attente: ['Tu dors ? Moi, quand je dors, je ferme les yeux. Toi, tu as les yeux ouverts, je crois.', 'Prends ton temps. Moi, j’ai mis trois ans à trouver la porte de la taverne.', 'Psst… Les dés, il faut les lancer. Je dis ça pour aider.', 'Je compte jusqu’à dix, et tu lances. Un… deux… trois… sept… Bon : dix !', 'Tu réfléchis ? Moi, j’ai essayé une fois. J’ai eu mal à la tête.', 'Pendant que tu réfléchis, je polis mon casque. Il brille déjà, mais pas assez.'],
    beau_coup: ['Oh ! Tu as vu ça ? Je n’ai rien fait, je le jure !', 'Ha ! C’est ma botte secrète. Elle est tellement secrète que je ne la connais pas.', 'Plein de un et de cinq ! Ce sont mes préférés. Après le jambon.', 'Regarde ! Les dés m’aiment bien. C’est réciproque.', 'Ça, c’est un lancer de chevalier ! Enfin, je crois. Je n’en ai jamais vu d’autre.'],
    mauvais_coup: ['Hmm. C’est peu, ça ? Ou c’est beaucoup de peu ?', 'Pas terrible ! Mais pas nul. Enfin, presque nul.', 'Il m’en manque. Je ne sais pas lesquels, mais il m’en manque.', 'Ces dés sont comme mon cheval : ils ne vont jamais où je veux.'],
    jaloux: ['Oh ! Comment tu fais ça ? Tu peux me montrer ? Lentement.', 'Hé ! Tu as échangé les dés quand j’avais le dos tourné ? Je n’ai pas tourné le dos ? Ah.', 'Joli ! On dirait un tour de magie. Ce n’est pas de la sorcellerie, au moins ?', 'C’est injuste ! Tu as les mêmes dés que moi, et les tiens marchent mieux.', 'Oh là ! Même mon seigneur ne fait pas mieux. Bon, il ne joue jamais, mais quand même.'],
    tente: ['Je relance ! Un chevalier ne recule jamais. Sauf devant les oies.', 'Encore ! Qui ne tente rien… euh… n’a pas tenté. Voilà.', 'Presque plus de dés ? Parfait : moins de dés, moins de soucis !', 'Allez, je tente ! Mon seigneur dit que je fonce sans réfléchir. C’est ma grande qualité.'],
    abandon: ['J’ai compté, et recompté… Je ne te rattraperai pas. Même avec mes doigts de pied. Tu as gagné !', 'J’abandonne ! Un chevalier sait reconnaître une bataille perdue. Surtout moi, j’ai l’habitude.', 'Non, je ne lance pas. Mon seigneur dit qu’il ne faut pas gaspiller les dés. Bravo à toi !'],
    insecte: ['Hé ! Tu as vu ça ?! Un dragon ! Ah non, c’est un cafard.', 'Tu as vu ça ?! Une bête ! À l’attaque ! Enfin… attaque, toi. Moi, j’ai peur.', 'Chut… Tu as vu ça ? Ne bouge pas. Il ne nous a pas vus.'],
    ecrase: ['Tu l’as eu ! La bête est terrassée ! On chantera ça dans tout le royaume !', 'Tu l’as eu ! Ouf. J’aurais bien aidé, mais j’étais occupé à avoir peur.', 'Tu l’as eu ! Quel courage ! Moi, je l’aurais invité à jouer.'],
    brulant: ['Les six ! Ils sont tous bons ? Même celui-là ? Je reprends tout, alors !', 'Tous les six ! Comment on dit, déjà, quand ils sont tous bons ? Ah oui : formidable !', 'Six dés, six points pour moi ! Enfin, plus que six, je crois.'],
    rattrapage: ['Mon dernier tour ? Alors je sors l’épée ! Non, les dés. Je sors les dés.', 'Il faut que je te rattrape ? D’accord ! Tu es où, exactement ?'],
    dernier_tour: ['J’ai atteint le bout ! À toi, maintenant. Moi, je ne bouge plus, je suis arrivé.', 'Ton dernier tour ! Bonne chance. Mais pas trop, quand même.'],
    devant: ['Je suis devant ? Devant toi ? Il faut que je m’assoie. Ah, je suis déjà assis.', 'Je passe devant ! C’est la première fois que je ne suis pas derrière. Ça fait drôle.', 'Regarde ! Je mène ! Je ne sais pas où, mais je mène !'],
    prudent: ['Tu t’arrêtes déjà ? Il restait plein de dés ! Je peux les lancer, moi ?', 'Si peu ? Tu fais des économies ?', 'Prudence est mère de… de quelqu’un. Je ne sais plus qui.'],
  },
};
// [fichier, qui parle, texte] pour chaque réplique d’un adversaire
export const oppLines = (opp, moment) => (OPP_TALK[opp]?.[moment] || []).map((text, i) => [`${opp}_${moment}_${i + 1}`, opp, text]);
// Saluts qui laissent la main au joueur (« les dés sont à toi », « lance ! ») : seulement quand c’est lui qui commence
export const PLAYER_STARTS = new Set(['tavernier_debut_2', 'vieux_debut_1', 'servante_debut_2', 'chevalier_debut_2']);
// Moment où l’adversaire peut répondre lui-même, pour chaque réaction des clients
// (attente, mauvais_coup, tente, abandon, rattrapage, dernier_tour, devant et prudent : l’adversaire seul,
// les clients n’ont rien à en dire)
export const OWN_MOMENT = {
  farkle_toi: 'nargue', pot_perdu_toi: 'nargue', farkle_tavernier: 'deveine', pot_perdu_tavernier: 'deveine',
  grosse_mise_tavernier: 'gros_tour', victoire_toi: 'defaite', victoire_tavernier: 'victoire', debut: 'debut',
  grosse_mise_toi: 'jaloux', attente: 'attente', mauvais_coup: 'mauvais_coup', tente: 'tente', abandon: 'abandon', insecte: 'insecte',
  rattrapage: 'rattrapage', dernier_tour: 'dernier_tour', devant: 'devant', prudent: 'prudent',
};
// Les clients parlent de l’adversaire du moment, jamais d’un autre : les réactions qui nomment le Tavernier
// (ou le font passer pour ton adversaire) ne viennent que quand c’est lui qui joue ;
// l’anecdote sur Kuba n’est pas racontée quand il est assis à ta table, ni celle du chevalier perdu devant sire Radek
export const ABOUT_TAVERNIER = new Set(['farkle_tavernier', 'pot_perdu_tavernier', 'grosse_mise_tavernier', 'victoire_tavernier']);
export const ONLY_VS = { grosse_mise_toi_1: 'tavernier', victoire_toi_1: 'tavernier', anecdote_4: 'tavernier' };
export const NOT_VS = { anecdote_16: 'palefrenier', anecdote_28: 'chevalier' };
