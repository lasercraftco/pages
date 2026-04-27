"""Walk the configured roots, identify each file, extract metadata, dedupe
into authors/series/books/book_files, persist to Postgres.

Idempotent: rerunning is safe and only updates rows whose path or content
hash changed.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, authors, book_files, books, series
from app.scanner.covers import resolve as resolve_cover
from app.scanner.formats import identify
from app.scanner.metadata import (
    FileMeta,
    heuristic_from_path,
    merge,
    read_audio,
    read_epub,
    read_pdf,
)
from app.utils import sortable_author, sortable_title

log = logging.getLogger("pages.scan")
settings = get_settings()


def _fast_hash(p: Path) -> str:
    """Cheap content fingerprint: size + first 64 KiB + last 64 KiB. Avoids
    re-reading multi-GB files on every scan."""
    h = hashlib.blake2s(digest_size=16)
    try:
        st = p.stat()
        h.update(str(st.st_size).encode())
        with p.open("rb") as f:
            h.update(f.read(64 * 1024))
            try:
                f.seek(-64 * 1024, os.SEEK_END)
                h.update(f.read(64 * 1024))
            except OSError:
                pass
    except OSError:
        return ""
    return h.hexdigest()


def _walk(roots: Iterable[Path]) -> Iterable[Path]:
    for root in roots:
        if not root.exists():
            log.warning("scan root missing: %s", root)
            continue
        for dirpath, _dirs, filenames in os.walk(root):
            for fn in filenames:
                yield Path(dirpath) / fn


def _read_metadata(path: Path, kind: str, fmt: str) -> FileMeta:
    try:
        if kind == "ebook":
            if fmt == "epub":
                return merge(read_epub(path), heuristic_from_path(path))
            if fmt == "pdf":
                return merge(read_pdf(path), heuristic_from_path(path))
            return heuristic_from_path(path)
        if kind == "audiobook":
            return merge(read_audio(path, fmt), heuristic_from_path(path))
    except Exception as e:
        log.debug("metadata read failed for %s: %s", path, e)
    return heuristic_from_path(path)


# ─── upserts ───

async def _upsert_author(session, name: str | None) -> str | None:
    if not name:
        return None
    sort = sortable_author(name)
    found = (await session.execute(select(authors.c.id).where(authors.c.sort_name == sort))).first()
    if found:
        return found[0]
    aid = str(uuid.uuid4())
    await session.execute(authors.insert().values(id=aid, name=name, sort_name=sort))
    return aid


async def _upsert_series(session, name: str | None, author_id: str | None) -> str | None:
    if not name:
        return None
    found = (
        await session.execute(
            select(series.c.id).where(series.c.name == name, series.c.author_id == author_id)
        )
    ).first()
    if found:
        return found[0]
    sid = str(uuid.uuid4())
    await session.execute(series.insert().values(id=sid, name=name, author_id=author_id))
    return sid


async def _upsert_book(session, meta: FileMeta, author_id: str | None, series_id: str | None) -> str:
    cond = []
    if meta.isbn13:
        cond.append(books.c.isbn13 == meta.isbn13)
    cond.append(
        (books.c.sort_title == sortable_title(meta.title)) & (books.c.author_id == author_id)
    )
    for c in cond:
        found = (await session.execute(select(books.c.id).where(c))).first()
        if found:
            return found[0]
    bid = str(uuid.uuid4())
    await session.execute(
        books.insert().values(
            id=bid,
            title=meta.title,
            sort_title=sortable_title(meta.title),
            author_id=author_id,
            series_id=series_id,
            series_index=meta.series_index,
            narrator=meta.narrator,
            isbn13=meta.isbn13,
            isbn10=meta.isbn10,
            asin=meta.asin,
            publisher=meta.publisher,
            language=meta.language,
            summary=meta.summary,
            page_count=meta.page_count,
            duration_seconds=int(meta.duration_seconds) if meta.duration_seconds else None,
            tags=meta.tags or [],
        )
    )
    return bid


async def _upsert_file(
    session,
    *,
    path: Path,
    book_id: str,
    kind: str,
    fmt: str,
    meta: FileMeta,
    content_hash: str,
) -> None:
    found = (
        await session.execute(select(book_files.c.id, book_files.c.content_hash).where(book_files.c.path == str(path)))
    ).first()
    if found:
        if found[1] == content_hash:
            return  # unchanged
        await session.execute(
            book_files.update()
            .where(book_files.c.id == found[0])
            .values(
                content_hash=content_hash,
                duration_seconds=int(meta.duration_seconds) if meta.duration_seconds else None,
                chapters=meta.chapters,
                bitrate=meta.bitrate,
                sample_rate=meta.sample_rate,
                size_bytes=path.stat().st_size,
                scanned_at=datetime.now(timezone.utc),
            )
        )
        return
    fid = str(uuid.uuid4())
    await session.execute(
        book_files.insert().values(
            id=fid,
            book_id=book_id,
            kind=kind,
            format=fmt,
            path=str(path),
            size_bytes=path.stat().st_size,
            content_hash=content_hash,
            duration_seconds=int(meta.duration_seconds) if meta.duration_seconds else None,
            chapters=meta.chapters,
            bitrate=meta.bitrate,
            sample_rate=meta.sample_rate,
        )
    )


# ─── public entrypoints ───

async def _scan_iter(paths: Iterable[Path]) -> dict[str, int]:
    stats = {"scanned": 0, "ebooks": 0, "audiobooks": 0, "skipped": 0}
    sem = asyncio.Semaphore(8)

    async def process(p: Path) -> None:
        ident = identify(p)
        if not ident:
            stats["skipped"] += 1
            return
        kind, fmt = ident
        stats["scanned"] += 1
        if kind == "ebook":
            stats["ebooks"] += 1
        else:
            stats["audiobooks"] += 1

        meta = _read_metadata(p, kind, fmt)
        digest = _fast_hash(p)

        async with sem, SessionLocal() as session:
            try:
                aid = await _upsert_author(session, meta.author)
                sid = await _upsert_series(session, meta.series, aid)
                bid = await _upsert_book(session, meta, aid, sid)
                await _upsert_file(
                    session,
                    path=p,
                    book_id=bid,
                    kind=kind,
                    fmt=fmt,
                    meta=meta,
                    content_hash=digest,
                )
                # Cover lookup if the book doesn't already have one
                row = (await session.execute(select(books.c.cover_url).where(books.c.id == bid))).first()
                if row and not row[0]:
                    cover_url = await resolve_cover(
                        embedded=meta.cover_bytes,
                        file_path=p,
                        isbn=meta.isbn13 or meta.isbn10,
                        title=meta.title,
                        author=meta.author,
                    )
                    if cover_url:
                        await session.execute(
                            books.update().where(books.c.id == bid).values(cover_url=cover_url)
                        )
                await session.commit()
            except Exception as e:
                await session.rollback()
                log.warning("scan failed for %s: %s", p, e)

    await asyncio.gather(*(process(p) for p in paths))
    return stats


async def run_full_scan() -> dict[str, int]:
    log.info("starting full scan: ebooks=%s audiobooks=%s", settings.ebook_roots, settings.audiobook_roots)
    paths = list(_walk(settings.ebook_roots)) + list(_walk(settings.audiobook_roots))
    stats = await _scan_iter(paths)
    log.info("full scan done: %s", stats)
    return stats


async def run_path_scan(path: str) -> dict[str, int]:
    p = Path(path)
    if not p.exists():
        return {"error": 0, "scanned": 0}
    paths = [p] if p.is_file() else list(_walk([p]))
    return await _scan_iter(paths)
