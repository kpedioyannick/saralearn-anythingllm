#!/usr/bin/env bash
#
# Génère un lien démo pour un prospect.
# Usage:  ./gen-demo-link.sh [workspace-slug]
#
# Le workspace par défaut peut être surchargé en argument :
#   ./gen-demo-link.sh                       → /workspace/$DEFAULT_WORKSPACE
#   ./gen-demo-link.sh phonetique            → /workspace/phonetique
#   ./gen-demo-link.sh 4eme-mathematiques    → /workspace/4eme-mathematiques
#
# Pré-requis (une seule fois) :
#   1. SIMPLE_SSO_ENABLED=1 dans server/.env
#   2. User démo créé avec accès aux workspaces à montrer (id à mettre dans
#      SARA_DEMO_USER_ID, défaut 11 = "orthophoniste")
#   3. API key admin créée dans /settings/api-keys, exportée en env :
#         echo 'export SARA_DEMO_API_KEY="<clé>"' > ~/.sara-env
#         chmod 600 ~/.sara-env
#         echo 'source ~/.sara-env' >> ~/.bashrc    # auto-load à chaque shell
#         source ~/.sara-env                       # pour la session courante

set -euo pipefail

# Charge ~/.sara-env si présent et si la clé n'est pas déjà dans l'env.
# Permet d'invoquer le script via cron / sans .bashrc sourcé.
if [[ -z "${SARA_DEMO_API_KEY:-}" && -r "$HOME/.sara-env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.sara-env"
fi

: "${SARA_DEMO_API_KEY:?SARA_DEMO_API_KEY non defini. Voir le commentaire en haut du script (~/.sara-env).}"

DEMO_USER_ID="${SARA_DEMO_USER_ID:-11}"
HOST="${SARA_DEMO_HOST:-https://sara.education}"
DEFAULT_WORKSPACE="${SARA_DEMO_DEFAULT_WORKSPACE:-phonetique}"

WORKSPACE="${1:-$DEFAULT_WORKSPACE}"

# Demande un token frais. La durée de vie + le caractère multi-use sont
# pilotés par server/models/temporaryAuthToken.js (actuellement 120 jours,
# multi-use — campagnes mailing prospect).
TOKEN=$(curl -fsS -H "Authorization: Bearer ${SARA_DEMO_API_KEY}" \
  "${HOST}/api/v1/users/${DEMO_USER_ID}/issue-auth-token" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

if [[ -z "$TOKEN" ]]; then
  echo "Erreur : pas de token reçu. Vérifie SARA_DEMO_API_KEY et SARA_DEMO_USER_ID." >&2
  exit 1
fi

URL="${HOST}/sso/simple?token=${TOKEN}&redirectTo=/workspace/${WORKSPACE}"

echo
echo "=== Lien démo prêt ==="
echo "$URL"
echo
echo "Workspace ciblé : $WORKSPACE"
echo
