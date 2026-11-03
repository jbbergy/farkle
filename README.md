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
Dans l’échoppe du menu, on achète des dés spéciaux (14 dés, dont un joker) et on en met jusqu’à six dans sa main.
Leurs chances sont réglées dans `DIE_KINDS` (`index.html`) : chaque lancer est calculé d’avance par la physique,
puis rejoué en tournant l’image du dé pour que la face tirée selon ses chances arrive en haut.

## Publier

```bash
./deploy.sh
```

Le script envoie les fichiers sur le serveur, régénère la configuration Caddy de `farkle.jibhey.fr`
(avec les empreintes CSP du code) et recharge Caddy.
