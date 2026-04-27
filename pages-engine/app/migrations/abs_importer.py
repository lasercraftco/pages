"""Pull listening progress + bookmarks from Audiobookshelf and merge into Pages.

Audiobookshelf exposes:
  POST /login                     → token
  GET  /api/me/items-in-progress  → in-progress media items per user
  GET  /api/me/listening-stats    → stats
  GET  /api/users                 → users (admin token)
  GET  /api/users/<id>/listening-sessions → per-user sessions

Match audiobook files by path so side-by-side deploys converge on the same
`book_files` rows.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, book_files, reading_progress, users

log = logging.getLogger("pages.migrations.abs")
settings = get_settings()


async def _auth(client: httpx.AsyncClient) -> str:
    return settings.abs_api_key or ""


async def run() -> dict[str, int]:
    if not settings.abs_url or not settings.abs_api_key:
        raise RuntimeError("ABS_URL / ABS_API_KEY not configured")
    stats = {"users": 0, "progress": 0, "skipped": 0}

    async with httpx.AsyncClient(
        base_url=settings.abs_url,
        headers={"Authorization": f"Bearer {settings.abs_api_key}"},
        timeout=20,
    ) as client:
        ausers = (await client.get("/api/users")).json().get("users", [])
        async with SessionLocal() as session:
            for au in ausers:
                stats["users"] += 1
                # Audiobookshelf usernames map directly to Pages first names
                row = (
                    await session.execute(
                        select(users.c.id).where(users.c.first_name.ilike(au["username"]))
                    )
                ).first()
                if not row:
                    stats["skipped"] += 1
                    continue
                pages_uid = row[0]

                items = (await client.get(f"/api/users/{au['id']}/listening-sessions")).json()
                for it in items.get("sessions", []):
                    media_path = it.get("mediaMetadata", {}).get("path") or it.get("path") or ""
                    if not media_path:
                        continue
                    f_row = (
                        await session.execute(
                            select(book_files.c.id, book_files.c.book_id, book_files.c.duration_seconds).where(
                                book_files.c.path.ilike(f"%{media_path.split('/')[-1]}")
                            )
                        )
                    ).first()
                    if not f_row:
                        continue
                    fid, bid, dur = f_row
                    pos = float(it.get("currentTime", 0))
                    progress = pos / float(dur) if dur else 0.0
                    await session.execute(
                        reading_progress.insert().values(
                            id=uuid.uuid4().hex,
                            user_id=pages_uid,
                            book_id=bid,
                            file_id=fid,
                            position_seconds=pos,
                            progress=min(progress, 1.0),
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                    stats["progress"] += 1
            await session.commit()
    log.info("abs import done: %s", stats)
    return stats


if __name__ == "__main__":
    asyncio.run(run())
