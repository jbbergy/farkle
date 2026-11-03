# Farkle — dés à la chandelle

Le jeu de dés Farkle dans une taverne médiévale, contre le Tavernier. Tout le jeu tient dans `index.html` :
Three.js pour la 3D, cannon-es pour la physique des dés, et du JavaScript sans framework pour le reste.
La musique, l’ambiance, les bruitages et les voix des clients ont été générés avec ElevenLabs (dossier `audio/`).

En ligne : https://farkle.jibhey.fr

## Jouer en local

Le jeu doit être servi en `http://` : ouvert directement depuis le disque, le navigateur bloque le chargement des sons.

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765.

## Commandes

- Souris ou toucher : cliquer un dé pour le mettre de côté ou le reposer.
- Clavier : `R` lancer, `G` garder, flèches ou `Z Q S D` pour choisir un dé, `Espace` pour le prendre, `+ − 0` pour zoomer.
- Molette ou pincement à deux doigts : zoomer sur le plateau.

## Groschens et dés spéciaux

Avant chaque partie, le joueur mise des groschens ; le Tavernier en met autant et le gagnant empoche le pot.
Une mise de 0 permet de jouer pour l’honneur : la bourse ne bouge pas et tout le monde joue avec des dés ordinaires.
La bourse et les dés achetés sont gardés dans le navigateur (`localStorage`, clé `farkle.bourse`).
La partie en cours l’est aussi, à chaque début de tour (clé `farkle.partie`) : si la page est rechargée ou fermée,
le menu propose de la reprendre, sans reprendre de mise.
Dans l’échoppe du menu, on achète des dés spéciaux (14 dés, dont un joker) et on en met jusqu’à six dans sa main.
Leurs chances sont réglées dans `DIE_KINDS` (`index.html`) : chaque lancer est calculé d’avance par la physique,
puis rejoué en tournant l’image du dé pour que la face tirée selon ses chances arrive en haut.

## Adversaires, fin de partie et règles de la maison

Le menu propose quatre adversaires (`OPPONENTS` dans `index.html`) : Kuba l’ivrogne, le vieil Ota, Bětka la servante
et le Tavernier, du plus facile au plus coriace. Chacun a sa façon de jouer (`risk`, `slip`), sa mise maximale,
son sac de dés spéciaux, la couleur de ses dés et ses répliques, écrites (menu, fin de partie) et dites
(`OPP_TALK`, fichiers `audio/voix/<adversaire>_<moment>_<n>.mp3`). Les clients ne parlent du Tavernier comme
adversaire que lorsque c’est lui qui joue (`ONLY_VS`, `ABOUT_TAVERNIER`), et un adversaire ne commente jamais
la partie en spectateur. Le choix est gardé dans `farkle.adversaire`.

Chacun commence une partie sur deux. Dès qu’un joueur atteint l’objectif, l’autre joue un dernier tour et doit le dépasser.
Deux règles de la maison se cochent dans les réglages (`farkle.maison`) : ouverture à 500 points et trois Farkles = −500.

## Carnet et hauts faits

La bourse du menu ouvre le carnet : parties contre chaque adversaire, records et hauts faits (`FEATS`),
gardés dans `farkle.carnet`.

## Hors connexion

Le jeu s’installe comme une application (`manifest.webmanifest`, icônes dans `icons/`). Le service worker (`sw.js`)
garde la page, Three.js, cannon-es, les polices et les sons au fil des visites : une fois le jeu ouvert en ligne,
il se lance sans réseau. La page passe toujours par le réseau d’abord ; les sons sont servis depuis la copie gardée
et rafraîchis en arrière-plan (un son remplacé n’est entendu qu’au chargement suivant).

## Publier

```bash
./deploy.sh
```

Le script envoie les fichiers sur le serveur, régénère la configuration Caddy de `farkle.jibhey.fr`
(avec les empreintes CSP du code) et recharge Caddy.
