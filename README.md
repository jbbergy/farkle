# Farkle — dés à la chandelle

Le jeu de dés Farkle dans une taverne médiévale, contre le Tavernier. La page `index.html`, sa feuille de style
`css/style.css` et le code en modules JavaScript du dossier `js/` (voir « Organisation du code ») : Three.js pour la 3D,
cannon-es pour la physique des dés, et du JavaScript sans framework ni étape de construction pour le reste.
La musique, l’ambiance, les bruitages et les voix des clients ont été générés avec ElevenLabs (dossier `audio/`).

En ligne : https://farkle.jibhey.fr

## Jouer en local

Le jeu doit être servi en `http://` : ouvert directement depuis le disque, le navigateur bloque le chargement des sons.

```bash
npx serve --no-clipboard -l 8765
```

Puis ouvrir http://localhost:8765. Il faut Node.js ; la première fois, `npx` propose d’installer `serve`.

## Commandes

- Souris ou toucher : cliquer un dé pour le mettre de côté ou le reposer.
- Clavier : `R` lancer, `G` garder, flèches ou `Z Q S D` pour choisir un dé, `Espace` pour le prendre, `+ − 0` pour zoomer.
- Molette ou pincement à deux doigts : zoomer sur le plateau.

Une fois les dés arrêtés, la vue se rapproche d’eux pour qu’on lise les points, puis revient au plateau entier au lancer suivant
(`frameDice` dans `js/cadrage.js`). Un zoom à la main la laisse tranquille jusqu’au lancer suivant ; le réglage
« Rapprocher la vue des dés » la coupe (clé `farkle.cadrage`).

## Organisation du code

Des modules JavaScript natifs (`import` / `export`), chargés par le navigateur sans outil de construction.
`js/main.js` est le point d’entrée : la boucle d’animation, la mise en route, et `window.FarkleDebug` pour la console.

- Réglages et données : `config.js` (table, objectif, mise, type d’écran), `des-speciaux.js`, `adversaires.js`,
  `repliques.js` (voix des clients et des adversaires).
- La table en 3D : `scene.js` (rendu, caméra, cadrage selon la place des panneaux), `textures.js`, `decor.js`
  (plateau, bougies, chopes, pièces), `physique.js`, `des.js`, `lancer.js`, `cadrage.js` (zoom et vue rapprochée).
- Le jeu : `regles.js` (combinaisons et score), `partie.js` (tours, Farkle, fin de partie), `ia.js`,
  `bourse.js`, `carnet.js` (records et hauts faits), `sauvegarde.js` (partie en cours).
- Le son : `sons.js` (musique, ambiance, bruitages), `voix.js` ; les vibrations du téléphone : `vibreur.js`.
- Les commandes : `entrees.js` (souris, toucher, clavier).
- Les fenêtres, dans `js/ui/` : `hud.js` (panneaux de la partie), `menu.js`, `echoppe.js`, `page-carnet.js`,
  `page-regles.js`, `reglages.js`, `parchemin.js` (bords déchirés, fenêtres qui se resserrent), `icones.js`.

Les modules qui branchent des boutons ou des commandes le font dans une fonction `init…()` appelée par `main.js`,
une fois tous les modules chargés : l’ordre de chargement ne compte donc pas. Hors de ces fonctions, un module ne lit
au chargement que des outils, des réglages et des données (`outils.js`, `config.js`, `des-speciaux.js`, `adversaires.js`,
`repliques.js`, `bourse.js`), qui n’importent rien d’autre.

## Groschens et dés spéciaux

Avant chaque partie, le joueur mise des groschens ; le Tavernier en met autant et le gagnant empoche le pot.
Une mise de 0 permet de jouer pour l’honneur : la bourse ne bouge pas et tout le monde joue avec des dés ordinaires.
La bourse et les dés achetés sont gardés dans le navigateur (`localStorage`, clé `farkle.bourse`).
La partie en cours l’est aussi, à chaque début de tour (clé `farkle.partie`) : si la page est rechargée ou fermée,
le menu propose de la reprendre, sans reprendre de mise.
Dans l’échoppe du menu, on achète des dés spéciaux (14 dés, dont un joker) et on en met jusqu’à six dans sa main.
Leurs chances sont réglées dans `DIE_KINDS` (`js/des-speciaux.js`) : chaque lancer est calculé d’avance par la physique,
puis rejoué en tournant l’image du dé pour que la face tirée selon ses chances arrive en haut.

## Adversaires, fin de partie et règles de la maison

Le menu propose quatre adversaires (`OPPONENTS` dans `js/adversaires.js`) : Kuba le palefrenier, le vieil Ota, Bětka la servante
et le Tavernier, du plus facile au plus coriace. Chacun a sa façon de jouer (`risk`, `slip`), sa mise maximale,
son sac de dés spéciaux, la couleur de ses dés et ses répliques, écrites (menu, fin de partie) et dites
(`OPP_TALK` dans `js/repliques.js`, fichiers `audio/voix/<adversaire>_<moment>_<n>.mp3`) : début de partie, Farkle, gros tour, beau ou mauvais lancer,
beau lancer du joueur, relance risquée, abandon, fin de partie, et impatience quand le joueur tarde (20 s, puis 40 s).
Une réplique écrite sans fichier audio est simplement sautée. Les saluts qui laissent la main au joueur
(« les dés sont à toi », `PLAYER_STARTS`) ne sont dits que lorsque c’est lui qui commence. Les clients ne parlent du Tavernier comme
adversaire que lorsque c’est lui qui joue (`ONLY_VS`, `ABOUT_TAVERNIER`), et un adversaire ne commente jamais
la partie en spectateur. Le choix est gardé dans `farkle.adversaire`.

Chacun commence une partie sur deux. Dès qu’un joueur atteint l’objectif, l’autre joue un dernier tour et doit le dépasser.
Si l’adversaire aborde son dernier tour avec 3000 points de retard ou plus (`HOPELESS` dans `js/ia.js`), il sait la partie
perdue : il abandonne sans lancer, le dit (moment `abandon`) et la fin de partie l’annonce (`gaveUp` dans `js/adversaires.js`).
Le joueur, lui, joue toujours son dernier tour.
Deux règles de la maison se cochent dans les réglages (`farkle.maison`) : ouverture à 500 points et trois Farkles = −500.

## Effets de la table

- Les bougies vacillent au Farkle, s’embrasent quand le joueur garde 1000 points ou plus et quand il gagne (`flareCandles`
  dans `js/decor.js`), et baissent pendant le dernier tour, avec le reste de la salle et l’ambiance sonore
  (`updateMood` dans `js/main.js`, `setRoomLight`, `hushRoom`) ; le rond de lumière sur les dés ne change pas.
- Sur un lancer qui vaut 1000 points ou plus, et à la victoire du joueur, quelqu’un se cogne le genou sous la table :
  chopes et pièces sautent (`bangTable`), avec le choc sourd du plateau (`audio/genou_*.mp3`) et leur tintement (`sfxThud`).
  Les dés ne bougent pas.
- Les annonces s’animent selon leur genre (`#toast[data-kind]` dans `css/style.css`) : sceau qui s’écrase pour un Farkle,
  flamme pour les dés brûlants, pièce qui brille pour les points gardés. Le score qui change grossit un instant et
  tinte à chaque cinquantaine (`updateScoresDisplay`). Ces animations s’arrêtent si le système demande moins de mouvements.
- Les grandes combinaisons déclenchent un événement (`js/evenements.js`) : trois 1, les bougies qui s’embrasent et la salle qui acclame ;
  la suite 1→6, l’aube qui se lève et un coq ; trois paires (si le lancer marque), la taverne qui trinque ;
  quatre, cinq ou six dés pareils, la table qui tremble, puis la sciure qui tombe des poutres, puis une éclipse rouge.
  Plus de trois as font toujours s’écrier la mère Ludmila (`quatre_as`, `cinq_as`, `six_as`, même sans ces événements).
  Les dés brûlants embrasent le plateau. Une fois par partie au plus, un cafard ou un cloporte traverse le plateau
  (jamais contre le Tavernier) ; l’adversaire le signale (moment `insecte`) et l’écraser rapporte 10 groschens,
  avec le « Merci ! » du Tavernier crié de loin. Le réglage « Événements de la table » (`farkle.evenements`) coupe tout cela.
  En console : `FarkleDebug.event('bougies' | 'aube' | 'tournee' | 'tremblement' | 'hot', n)` et `FarkleDebug.bug('cafard' | 'cloporte')`.
- Sur téléphone, les dés vibrent à leurs chocs, plus longuement au Farkle, deux fois à la victoire (`js/vibreur.js`).
  Le réglage « Vibrations » (`farkle.vibrations`) n’apparaît que si le navigateur sait faire vibrer (pas sur iPhone).

## Carnet et hauts faits

La bourse du menu ouvre le carnet : parties contre chaque adversaire, records et hauts faits (`FEATS` dans `js/carnet.js`),
gardés dans `farkle.carnet`.

## Hors connexion

Le jeu s’installe comme une application (`manifest.webmanifest`, icônes dans `icons/`). Le service worker (`sw.js`)
garde la page, sa feuille de style et ses modules, Three.js, cannon-es, les polices et les sons : une fois le jeu ouvert
en ligne, il se lance sans réseau. La page, la feuille de style et les modules passent toujours par le réseau d’abord,
pour qu’une nouvelle version arrive tout entière ; les sons sont servis depuis la copie gardée et rafraîchis
en arrière-plan (un son remplacé n’est entendu qu’au chargement suivant). Un fichier ajouté dans `css/` ou `js/`
doit être ajouté à la liste `CODE` de `sw.js`, en changeant `VERSION`.

## Publier

```bash
./deploy.sh
```

Le script vérifie que chaque fichier de `css/` et `js/` est dans la liste `CODE` de `sw.js`, envoie les fichiers
sur le serveur, régénère la configuration Caddy de `farkle.jibhey.fr` (avec l’empreinte CSP de l’importmap,
seul script écrit dans la page) et recharge Caddy.
