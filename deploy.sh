#!/usr/bin/env bash
# Publie le jeu sur https://farkle.jibhey.fr (serveur jibhey.fr, Caddy).
# Usage : ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

HOST=jibhey.fr
DOMAIN=farkle.jibhey.fr
ROOT=/srv/sites/$DOMAIN
SITE=/etc/caddy/sites/farkle.caddy

# 1. Fichiers du jeu (sans les prises audio d’origine, inutilisées)
ssh "$HOST" "mkdir -p $ROOT"
rsync -az --delete --exclude 'originaux/' --exclude '.DS_Store' index.html audio "$HOST:$ROOT/"

# 2. Le code du jeu est écrit dans index.html : la CSP l’autorise par son empreinte (sha256),
#    à recalculer à chaque publication puisqu’elle change dès que le code change.
HASHES=$(python3 - <<'EOF'
import base64, hashlib, re
html = open('index.html', encoding='utf-8').read()
for body in re.findall(r'<script[^>]*>(.*?)</script>', html, re.S):
    print("'sha256-%s'" % base64.b64encode(hashlib.sha256(body.encode()).digest()).decode(), end=' ')
EOF
)

# 3. Site Caddy (HTTPS automatique). En cas de configuration invalide, on retire le site et on s’arrête.
ssh "$HOST" "sudo tee $SITE > /dev/null" <<EOF
$DOMAIN {
	import security
	header Content-Security-Policy "default-src 'self'; script-src 'self' ${HASHES}https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"

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
