# Pages

Self-hosted unified ebook + audiobook library for the Tyflix family.

Replaces Kavita + Audiobookshelf with a single app that knows how to:

- **Read EPUBs, PDFs, comics** in the browser (epub.js + pdf.js + custom comic reader).
- **Listen to audiobooks** with chapter navigation, variable speed, sleep timer, position sync, and AirPlay/HomePod cast.
- **Export to your e-reader** — Send-to-Kindle email, Send-to-Kobo sync, Apple Books deep link, sideload conversion via Calibre.
- **Request books and audiobooks** — friends search Google Books / OpenLibrary, request, owner approves and Pages drops the request into Readarr.
- **Sync everything per-friend** — first-name sign-in at `pages.tyflix.net`, owner = `tyler`, everyone else = friend with their own progress, bookmarks, highlights, ratings, shelves.

Pages is the third sibling of [Genome](https://github.com/lasercraftco/genome) and [Reel](https://github.com/lasercraftco/reel) — same stack, same branding bible, same `.tyflix.net` shared-cookie auth.

## Stack

- **pages-web** — Next.js 15 (TypeScript, Tailwind v4, shadcn/ui, framer-motion). Standalone build. Port `3000` in container, `3035` on the iMac host.
- **pages-engine** — FastAPI (Python 3.12) for library scanning, audio streaming with Range, file conversion via Calibre subprocess, metadata extraction, e-reader exporters. Port `8003`.
- **postgres** — `pages` database. Drizzle owns the schema; the engine reads via SQLAlchemy.
- **calibre** — installed inside the engine image; `ebook-convert` is the conversion workhorse.
- **deploy** — single `docker-compose.yml`, multi-arch GHA build, GHCR images, Watchtower auto-deploy on the iMac, Cloudflare tunnel ingress for `pages.tyflix.net`.

## Local dev

```bash
make dev       # full stack via compose (web + engine + postgres)
make dev-web   # Next.js only (port 3035)
make dev-engine  # FastAPI only (port 8003)
```

`pnpm install` is run by Docker. If you want to develop the web outside Docker, `cd pages-web && pnpm install && pnpm dev`.

## Deploy

See [DEPLOY.md](./DEPLOY.md). Short version: push to `main`, GH Actions builds multi-arch images to GHCR, Watchtower on the iMac picks them up next poll cycle, Cloudflare tunnel routes `pages.tyflix.net` to `:3035`. The dispatcher also wires the cloudflared ingress rule + DNS.

## Migration from Kavita + Audiobookshelf

Pages **does not delete or move your existing files**. It scans the same `~/homelab/<book-drive>/...` directories Kavita and Audiobookshelf already index, so Pages can run side-by-side with both. When you're satisfied, run:

```bash
make migrate-from-kavita   # pulls read progress + library state via Kavita API
make migrate-from-abs      # pulls listening positions + bookmarks via Audiobookshelf API
```

…and then stop the old containers when ready.

## License

Private. © Tyler.
