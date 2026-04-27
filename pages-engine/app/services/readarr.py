"""Thin Readarr client. Owners can direct-add; friend requests get queued
in `library_requests` and need owner approval first."""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings

log = logging.getLogger("pages.readarr")
settings = get_settings()


def _client() -> httpx.AsyncClient:
    if not settings.readarr_url or not settings.readarr_api_key:
        raise RuntimeError("Readarr not configured (READARR_URL / READARR_API_KEY missing)")
    return httpx.AsyncClient(
        base_url=settings.readarr_url,
        headers={"X-Api-Key": settings.readarr_api_key},
        timeout=15,
    )


async def lookup(query: str) -> list[dict]:
    async with _client() as c:
        r = await c.get("/api/v1/book/lookup", params={"term": query})
        r.raise_for_status()
        return r.json()


async def add_book(*, foreign_book_id: str, author_id: int | None = None) -> dict:
    """Add a book to Readarr's monitor list. The exact field set depends on
    Readarr's version; this is the minimum that works on v0.4+."""
    payload = {
        "foreignBookId": foreign_book_id,
        "monitored": True,
        "addOptions": {"searchForNewBook": True},
        "rootFolderPath": settings.readarr_book_root,
        "qualityProfileId": 1,
        "metadataProfileId": 1,
    }
    if author_id is not None:
        payload["author"] = {"id": author_id}
    async with _client() as c:
        r = await c.post("/api/v1/book", json=payload)
        r.raise_for_status()
        return r.json()
