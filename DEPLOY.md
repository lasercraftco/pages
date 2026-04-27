# Deploying Pages

End-state goal: `https://pages.tyflix.net` loads, first-name sign-in works, all of Tyler's existing ebook + audiobook library shows up, click anything → reader/player opens in-browser.

## One-shot deploy (recommended)

From your Mac:

```bash
# 1. Push the repo (first time)
cd /Users/tyler/Documents/pages
git init -b main
git add .
git commit -m "feat: Pages v1 — unified ebook + audiobook library"
gh repo create lasercraftco/pages --public --source=. --remote=origin --push

# 2. SSH to iMac and bootstrap
ssh imac '
  cd ~/homelab && \
  git clone https://github.com/lasercraftco/pages.git && \
  cd pages && \
  bash deploy/bootstrap.sh
'
```

`bootstrap.sh` is idempotent. It:

1. Verifies Docker is running on the iMac.
2. Reads secrets from `~/homelab/.env` (Tyler's family secret store) and stitches them into `pages/.env` (chmod 600).
3. Detects the existing Kavita and Audiobookshelf book-drive paths and configures `PAGES_EBOOK_ROOTS` + `PAGES_AUDIOBOOK_ROOTS` to those exact paths (read-only mounts — Pages does not move or modify files).
4. Brings the stack up: `pages-postgres`, `pages-engine`, `pages-web`. Web container's entrypoint runs `pnpm drizzle:migrate` first.
5. Verifies `/api/healthz` (web) and `/healthz` (engine).
6. Adds `pages.tyflix.net` ingress rule to `cloudflared` on **infra** over SSH and creates the CNAME via the Cloudflare API (using `CF_API_TOKEN` / `CF_ZONE_ID` / `CF_TUNNEL_ID` from `~/homelab/.env`).
7. Triggers a first library scan.

When it finishes, hit https://pages.tyflix.net and enter your first name.

## First sign-in

The first user whose first name matches `PAGES_OWNER_FIRST_NAME` (default `tyler`) becomes owner. Everyone else lands as a `friend` and can read, listen, and request — but their requests are queued for owner approval (configurable per-user via `auto_approve`).

Friends can be granted `auto_approve` (direct add to Readarr) or banned from `/admin/users`.

## Ports

| Service          | Container | Host (iMac) |
|------------------|-----------|-------------|
| pages-web        | 3000      | 3035        |
| pages-engine     | 8003      | 127.0.0.1:8003 |
| pages-postgres   | 5432      | 127.0.0.1:5436 |

The Cloudflare tunnel routes `pages.tyflix.net` → `http://localhost:3035` on the iMac.

## Watchtower auto-deploy

Same pattern as Genome and tyflix-karaoke:

- Push to `lasercraftco/pages` `main` triggers GH Actions builds (`build-engine.yml`, `build-web.yml`).
- Multi-arch images (`linux/amd64,linux/arm64`) push to `ghcr.io/lasercraftco/pages-engine:latest` and `ghcr.io/lasercraftco/pages-web:latest`.
- Watchtower polls daily at 02:00 UTC, sees new digests, restarts both containers (label-gated via `com.centurylinklabs.watchtower.enable=true`).

For an immediate deploy after a push:

```bash
ssh imac 'docker compose -f ~/homelab/pages/deploy/docker-compose.yml pull && docker compose -f ~/homelab/pages/deploy/docker-compose.yml up -d'
```

## Migration from Kavita + Audiobookshelf

Pages reads the same book files Kavita and Audiobookshelf already index — nothing is moved or copied.

```bash
# Pull read-progress + library state from Kavita
docker compose -f ~/homelab/pages/deploy/docker-compose.yml exec engine python -m app.migrations.kavita_importer

# Pull listening positions + bookmarks from Audiobookshelf
docker compose -f ~/homelab/pages/deploy/docker-compose.yml exec engine python -m app.migrations.abs_importer
```

Both importers are idempotent; rerunning won't duplicate state.

Once you're satisfied Pages has full feature-parity, stop the old containers:

```bash
docker compose -f ~/homelab/kavita/docker-compose.yml down
docker compose -f ~/homelab/audiobookshelf/docker-compose.yml down
```

…and update the tyflix portal cards to point at `pages.tyflix.net`.

## Troubleshooting

**Library scan doesn't find anything**

The book-drive paths must be mounted into the engine container. Check:

```bash
docker compose -f ~/homelab/pages/deploy/docker-compose.yml exec engine ls /library/ebooks
docker compose -f ~/homelab/pages/deploy/docker-compose.yml exec engine ls /library/audiobooks
```

If empty, edit `deploy/docker-compose.yml`'s engine `volumes:` to mount your real book-drive paths read-only.

**Calibre conversion fails**

The engine image bundles Calibre. If `ebook-convert` complains about a specific format, try the file from the host:

```bash
ssh imac 'docker compose -f ~/homelab/pages/deploy/docker-compose.yml exec engine ebook-convert /library/ebooks/path/to/book.azw3 /tmp/test.epub'
```

**First-name auth not propagating from genome/reel**

Confirm `TYFLIX_AUTH_JWT_SECRET` is identical across all four services and that `TYFLIX_AUTH_COOKIE_DOMAIN=.tyflix.net` (leading dot).
