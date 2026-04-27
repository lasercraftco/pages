"""Pull libraries + reading progress from Kavita and merge into Pages.

Kavita exposes:
  POST /api/Plugin/authenticate (apiKey, pluginName) → JWT
  GET  /api/Library                                → libraries
  GET  /api/Series?LibraryId=&PageNumber=          → series in library
  GET  /api/Series/<id>/volumes                    → volumes (≈ books)
  GET  /api/User/has-progress                      → users with progress
  GET  /api/Tachiyomi/get-latest-chapter           → progress

Pages models a "book" per volume — we match by file path so that side-by-side
deploys converge on the same `book_files` rows the Pages scanner already
indexed (no doubles, no orphans).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, book_files, reading_progress, users

log = logging.getLogger("pages.migrations.kavita")
settings = get_settings()


async def _auth(client: httpx.AsyncClient) -> str:
    r = await client.post(
        "/api/Plugin/authenticate",
        params={"apiKey": settings.kavita_api_key, "pluginName": "pages"},
    )
    r.raise_for_status()
    return r.json()["token"]


async def _get_user_id_for_first_name(session, first_name: str) -> str | None:
    row = (
        await session.execute(select(users.c.id).where(users.c.first_name.ilike(first_name)))
    ).first()
    return row[0] if row else None


async def _file_id_for_path(session, path_substring: str) -> str | None:
    row = (
        await session.execute(
            select(book_files.c.id, book_files.c.book_id).where(book_files.c.path.ilike(f"%{path_substring}%"))
        )
    ).first()
    return row if row else None


async def run() -> dict[str, int]:
    if not settings.kavita_url or not settings.kavita_api_key:
        raise RuntimeError("KAVITA_URL / KAVITA_API_KEY not configured")
    stats = {"users": 0, "progress": 0, "skipped": 0}

    async with httpx.AsyncClient(base_url=settings.kavita_url, timeout=20) as client:
        token = await _auth(client)
        client.headers["Authorization"] = f"Bearer {token}"
        # /api/User returns Kavita's user list. Match by username (Kavita's
        # users are typically first-name / family-style).
        kusers = (await client.get("/api/Users")).json()
        async with SessionLocal() as session:
            for ku in kusers:
                stats["users"] += 1
                pages_user_id = await _get_user_id_for_first_name(session, ku.get("username", ""))
                if not pages_user_id:
                    stats["skipped"] += 1
                    continue
                # Per-user reading progress: GET /api/Reader/progress?volumeId=
                # We pull per-series via /api/Series and walk volumes.
                libs = (await client.get("/api/Library")).json()
                for lib in libs:
                    series_resp = await client.post(
                        f"/api/Series/all-v2",
                        json={"libraryId": lib["id"], "userId": ku["id"]},
                    )
                    for s in (series_resp.json() if series_resp.is_success else []):
                        vols = (await client.get(f"/api/Series/{s['id']}/volumes")).json()
                        for v in vols:
                            for chap in v.get("chapters", []):
                                files = chap.get("files", [])
                                for f in files:
                                    fid_row = await _file_id_for_path(session, f.get("filePath", ""))
                                    if not fid_row:
                                        continue
                                    fid, bid = fid_row
                                    progress = (chap.get("pagesRead") or 0) / max(1, (chap.get("pages") or 1))
                                    await session.execute(
                                        reading_progress.insert()
                                        .values(
                                            id=__import__("uuid").uuid4().hex,
                                            user_id=pages_user_id,
                                            book_id=bid,
                                            file_id=fid,
                                            cfi=None,
                                            position_seconds=None,
                                            progress=float(progress),
                                            updated_at=datetime.now(timezone.utc),
                                        )
                                        .prefix_with("INSERT")
                                    )
                                    stats["progress"] += 1
            await session.commit()
    log.info("kavita import done: %s", stats)
    return stats


if __name__ == "__main__":
    asyncio.run(run())
