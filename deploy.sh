#!/usr/bin/env bash
# Publie le jeu sur https://farkle.jibhey.fr (serveur jibhey.fr, Caddy).
# Usage : ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

HOST=jibhey.fr
DOMAIN=farkle.jibhey.fr
ROOT=/srv/sites/$DOMAIN
SITE=/etc/caddy/sites/farkle.caddy

# 0. Hors connexion, le service worker ne sert que les fichiers de sa liste CODE : chaque fichier de css/ et js/ doit y être
missing=$(for f in css/*.css js/*.js js/ui/*.js; do grep -q "'$f'" sw.js || echo "$f"; done)
if [ -n "$missing" ]; then echo "À ajouter à la liste CODE de sw.js (et changer VERSION) :" $missing >&2; exit 1; fi

# 1. Fichiers du jeu (sans les prises audio d’origine, inutilisées), avec ce qui le rend installable :
#    manifeste, icônes et service worker (sw.js)
ssh "$HOST" "mkdir -p $ROOT"
rsync -az --delete --exclude 'originaux/' --exclude '.DS_Store' index.html css js manifest.webmanifest sw.js icons audio "$HOST:$ROOT/"

# 2. Les modules de js/ sont autorisés par 'self' ; le seul script écrit dans index.html, l’importmap, l’est par son
#    empreinte (sha256), recalculée à chaque publication puisqu’elle change dès que la carte change.
HASHES=$(python3 - <<'EOF'
import base64, hashlib, re
html = open('index.html', encoding='utf-8').read()
for body in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S):
    print("'sha256-%s'" % base64.b64encode(hashlib.sha256(body.encode()).digest()).decode(), end=' ')
EOF
)

# 3. Site Caddy (HTTPS automatique). En cas de configuration invalide, on retire le site et on s’arrête.
#    connect-src : le service worker va chercher lui-même les bibliothèques et les polices pour les garder hors ligne.
ssh "$HOST" "sudo tee $SITE > /dev/null" <<EOF
$DOMAIN {
	import security
	header Content-Security-Policy "default-src 'self'; script-src 'self' ${HASHES}https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self'; connect-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"

	encode zstd gzip
	root * $ROOT

	@audio path /audio/*
	header @audio Cache-Control "public, max-age=86400"
	@page not path /audio/*
	header @page Cache-Control "no-cache"

	file_server
}
EOF
ssh "$HOST" "sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null 2>&1 || { sudo rm -f $SITE; echo 'Configuration Caddy invalide : site retiré.' >&2; exit 1; }; sudo systemctl reload caddy"

echo "En ligne : https://$DOMAIN"
