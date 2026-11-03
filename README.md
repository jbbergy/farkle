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

## Publier

```bash
./deploy.sh
```

Le script envoie les fichiers sur le serveur, régénère la configuration Caddy de `farkle.jibhey.fr`
(avec les empreintes CSP du code) et recharge Caddy.
