#!/usr/bin/env bash
# Pages bootstrap — first-time install on iMac (192.168.1.92).
#
# Usage (from your Mac):
#   ssh imac
#   git clone https://github.com/lasercraftco/pages.git ~/homelab/pages
#   cd ~/homelab/pages && bash deploy/bootstrap.sh
#
# Idempotent. Mirrors the conventions used by Genome and tyflix-karaoke.
set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:${PATH:-/usr/bin:/bin}"
if [ -S "$HOME/.docker/run/docker.sock" ] && [ -z "${DOCKER_HOST:-}" ]; then
  export DOCKER_HOST="unix://$HOME/.docker/run/docker.sock"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOMELAB_ENV="$HOME/homelab/.env"
TARGET_DIR="$HOME/homelab/pages"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
die()  { printf "  \033[31m✗\033[0m %s\n" "$1" >&2; exit 1; }

bold "1. Verify environment"
[ -f "$HOMELAB_ENV" ] || die "missing $HOMELAB_ENV — this script expects to run on the iMac"
command -v docker >/dev/null || die "docker not on PATH (Docker Desktop should be running)"
docker ps >/dev/null 2>&1 || die "docker daemon not reachable"
ok "docker ok ($(docker --version))"

read_env_key() {
  local key="$1" v
  v="$(grep -E "^${key}=" "$HOMELAB_ENV" 2>/dev/null | head -1 | sed -E "s/^${key}=//" | sed -E 's/^"//; s/"$//; s/^'"'"'//; s/'"'"'$//' || true)"
  printf %s "$v"
}

read_secret_file() {
  local f="$HOME/homelab/$1"
  if [ -f "$f" ]; then tr -d '\n\r' < "$f"; fi
}

TYFLIX_AUTH_JWT_SECRET="$(read_env_key TYFLIX_AUTH_JWT_SECRET)"
GOOGLE_BOOKS_API_KEY="$(read_env_key GOOGLE_BOOKS_API_KEY)"
# Tyler's homelab .env uses READARR_KEY; bootstrap respects either name.
READARR_API_KEY="$(read_env_key READARR_API_KEY)"
[ -z "$READARR_API_KEY" ] && READARR_API_KEY="$(read_env_key READARR_KEY)"
[ -z "$READARR_API_KEY" ] && READARR_API_KEY="$(read_secret_file .readarr-api-key)"
KAVITA_API_KEY="$(read_env_key KAVITA_API_KEY)"
[ -z "$KAVITA_API_KEY" ] && KAVITA_API_KEY="$(read_secret_file .kavita-api-key)"
ABS_API_KEY="$(read_env_key ABS_API_KEY)"
[ -z "$ABS_API_KEY" ] && ABS_API_KEY="$(read_secret_file .audiobookshelf-token)"
KAVITA_URL="$(read_env_key KAVITA_URL)"
[ -z "$KAVITA_URL" ] && KAVITA_URL="http://192.168.1.92:5000"
ABS_URL="$(read_env_key AUDIOBOOKSHELF_URL)"
[ -z "$ABS_URL" ] && ABS_URL="$(read_env_key ABS_URL)"
[ -z "$ABS_URL" ] && ABS_URL="http://192.168.1.92:13378"
READARR_URL="$(read_env_key READARR_URL)"
[ -z "$READARR_URL" ] && READARR_URL="http://192.168.1.92:8787"
SMTP_HOST="$(read_env_key SMTP_HOST)"
SMTP_USER="$(read_env_key SMTP_USER)"
SMTP_PASS="$(read_env_key SMTP_PASS)"
SMTP_FROM="$(read_env_key SMTP_FROM)"
CF_API_TOKEN="$(read_env_key CF_API_TOKEN)"
CF_ACCOUNT_ID="$(read_env_key CF_ACCOUNT_ID)"
CF_ZONE_ID="$(read_env_key CF_ZONE_ID)"
CF_TUNNEL_ID="$(read_env_key CF_TUNNEL_ID)"
POSTGRES_USER="pages"
POSTGRES_DB="pages"
POSTGRES_PASSWORD="$(read_env_key PAGES_POSTGRES_PASSWORD)"
[ -z "$POSTGRES_PASSWORD" ] && POSTGRES_PASSWORD="$(openssl rand -hex 16)"

[ -n "$TYFLIX_AUTH_JWT_SECRET" ] || die "TYFLIX_AUTH_JWT_SECRET missing in ~/homelab/.env (shared family auth secret)"
ok "secrets present (readarr=$([ -n "$READARR_API_KEY" ] && echo yes || echo no), kavita=$([ -n "$KAVITA_API_KEY" ] && echo yes || echo no), abs=$([ -n "$ABS_API_KEY" ] && echo yes || echo no), cf=$([ -n "$CF_API_TOKEN" ] && echo yes || echo no))"

bold "2. Detect existing Kavita + Audiobookshelf library paths"
detect_from_container() {
  local name="$1" container_path_glob="$2"
  docker inspect "$name" --format '{{json .Mounts}}' 2>/dev/null \
    | python3 -c "import json,sys,re;m=json.load(sys.stdin);g=re.compile(sys.argv[1]);print('\n'.join(x['Source'] for x in m if g.match(x.get('Destination',''))))" "$container_path_glob" \
    | head -1
}
EBOOK_PATHS=()
for d in $(detect_from_container kavita '^/(books|comics|manga)$' || true); do
  [ -n "$d" ] && [ -d "$d" ] && EBOOK_PATHS+=("$d")
done
[ ${#EBOOK_PATHS[@]} -eq 0 ] && EBOOK_PATHS=("/Volumes/Music/Books")
EBOOK_PATH="${EBOOK_PATHS[0]}"

AUDIO_PATHS=()
for d in $(detect_from_container audiobookshelf '^/(audiobooks)$' || true); do
  [ -n "$d" ] && [ -d "$d" ] && AUDIO_PATHS+=("$d")
done
[ ${#AUDIO_PATHS[@]} -eq 0 ] && AUDIO_PATHS=("/Volumes/Music/Audiobooks")
AUDIO_PATH="${AUDIO_PATHS[0]}"

ok "ebooks: $EBOOK_PATH"
ok "audiobooks: $AUDIO_PATH"

bold "3. Stage code under ~/homelab/pages"
if [ "$REPO_ROOT" != "$TARGET_DIR" ]; then
  mkdir -p "$(dirname "$TARGET_DIR")"
  if [ -d "$TARGET_DIR/.git" ]; then
    warn "$TARGET_DIR already a git checkout — pulling latest"
    (cd "$TARGET_DIR" && git fetch --all && git reset --hard origin/main || git pull --rebase --autostash)
  elif [ -d "$TARGET_DIR" ]; then
    warn "$TARGET_DIR exists but isn't a git checkout — leaving in place"
  else
    cp -R "$REPO_ROOT" "$TARGET_DIR"
    ok "copied repo to $TARGET_DIR"
  fi
fi
cd "$TARGET_DIR"

bold "4. Compose .env"
[ -f .env ] || cp .env.example .env
update_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    # Use a different delim because val may contain /
    python3 -c "import sys,re,os;p=sys.argv[1];k=sys.argv[2];v=sys.argv[3];s=open(p).read();s=re.sub(rf'^{re.escape(k)}=.*$', f'{k}={v}', s, count=1, flags=re.M);open(p,'w').write(s)" .env "$key" "$val"
  else
    echo "${key}=${val}" >> .env
  fi
}
update_env POSTGRES_USER              "$POSTGRES_USER"
update_env POSTGRES_DB                "$POSTGRES_DB"
update_env POSTGRES_PASSWORD          "$POSTGRES_PASSWORD"
update_env DATABASE_URL               "postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
update_env TYFLIX_AUTH_JWT_SECRET     "$TYFLIX_AUTH_JWT_SECRET"
update_env TYFLIX_AUTH_COOKIE_DOMAIN  ".tyflix.net"
update_env PAGES_OWNER_FIRST_NAME     "tyler"
update_env GOOGLE_BOOKS_API_KEY       "${GOOGLE_BOOKS_API_KEY:-}"
update_env READARR_API_KEY            "${READARR_API_KEY:-}"
update_env READARR_URL                "${READARR_URL:-http://192.168.1.92:8787}"
update_env KAVITA_API_KEY             "${KAVITA_API_KEY:-}"
update_env KAVITA_URL                 "${KAVITA_URL:-http://192.168.1.92:5000}"
update_env ABS_API_KEY                "${ABS_API_KEY:-}"
update_env ABS_URL                    "${ABS_URL:-http://192.168.1.92:13378}"
update_env SMTP_HOST                  "${SMTP_HOST:-}"
update_env SMTP_USER                  "${SMTP_USER:-}"
update_env SMTP_PASS                  "${SMTP_PASS:-}"
update_env SMTP_FROM                  "${SMTP_FROM:-pages@tyflix.net}"
update_env PAGES_EBOOK_HOST_PATH      "$EBOOK_PATH"
update_env PAGES_AUDIOBOOK_HOST_PATH  "$AUDIO_PATH"
chmod 600 .env
rm -f .env.bak
ok ".env composed"

bold "5. Pull + start the stack"
docker compose -f deploy/docker-compose.yml --env-file .env pull || warn "pull failed (first deploy?)"
docker compose -f deploy/docker-compose.yml --env-file .env up -d
ok "stack up"

bold "6. Wait for healthchecks"
for i in {1..40}; do
  state="$(docker compose -f deploy/docker-compose.yml --env-file .env ps --format json 2>/dev/null | tr -d '\n')"
  if [[ "$state" == *'"Health":"healthy"'* ]] && [[ "$state" == *'"Service":"web"'* ]]; then
    ok "containers healthy"; break
  fi
  sleep 3
done
docker compose -f deploy/docker-compose.yml --env-file .env ps || true

bold "7. Cloudflare tunnel ingress for pages.tyflix.net (dashboard-managed)"
if [ -n "$CF_API_TOKEN" ] && [ -n "$CF_ACCOUNT_ID" ] && [ -n "$CF_TUNNEL_ID" ]; then
  TMP=$(mktemp)
  HTTP_CODE=$(curl -sS -o "$TMP" -w "%{http_code}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/configurations" || echo 000)
  if [ "$HTTP_CODE" = "200" ]; then
    NEW=$(python3 - "$TMP" <<'PY'
import json, sys
p = sys.argv[1]
data = json.load(open(p))
cfg = data['result']['config']
ingress = cfg.get('ingress', [])
hostname = "pages.tyflix.net"
target = "http://192.168.1.92:3035"
# Drop any existing rule for this hostname
ingress = [r for r in ingress if r.get('hostname') != hostname]
# Find catch-all (no hostname) and insert above it
for i, r in enumerate(ingress):
    if 'hostname' not in r:
        ingress.insert(i, {"hostname": hostname, "service": target})
        break
else:
    ingress.append({"hostname": hostname, "service": target})
    ingress.append({"service": "http_status:404"})
cfg['ingress'] = ingress
out = {"config": cfg}
print(json.dumps(out))
PY
)
    PUT_RESP=$(curl -sS -X PUT \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$NEW" \
      "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/configurations")
    if echo "$PUT_RESP" | grep -q '"success":true'; then
      ok "tunnel ingress: pages.tyflix.net → http://192.168.1.92:3035"
    else
      warn "tunnel update failed: $(echo "$PUT_RESP" | head -c 400)"
    fi
  else
    warn "could not fetch tunnel config (HTTP $HTTP_CODE)"
  fi
  rm -f "$TMP"

  if [ -n "${CF_ZONE_ID:-}" ]; then
    DNS_RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"CNAME\",\"name\":\"pages\",\"content\":\"${CF_TUNNEL_ID}.cfargotunnel.com\",\"proxied\":true}")
    if echo "$DNS_RESP" | grep -q '"success":true'; then
      ok "DNS CNAME pages → tunnel"
    elif echo "$DNS_RESP" | grep -q "An identical record already exists"; then
      ok "DNS CNAME already present"
    else
      warn "CNAME response: $(echo "$DNS_RESP" | head -c 300)"
    fi
  fi
else
  warn "Cloudflare creds incomplete (need CF_API_TOKEN + CF_ACCOUNT_ID + CF_TUNNEL_ID)"
fi

bold "8. Trigger first library scan"
sleep 3
curl -sS -X POST http://localhost:8003/scan/full || warn "scan trigger failed (engine may still be booting; safe to retry later)"

ok "done — visit https://pages.tyflix.net"
