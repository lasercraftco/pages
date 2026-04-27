"""External metadata search — Google Books + OpenLibrary unified results
for the request-this-book search box."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()


async def _google(client: httpx.AsyncClient, q: str) -> list[dict[str, Any]]:
    params: dict[str, str] = {"q": q, "maxResults": "12", "printType": "books"}
    if settings.google_books_api_key:
        params["key"] = settings.google_books_api_key
    try:
        r = await client.get("https://www.googleapis.com/books/v1/volumes", params=params, timeout=10)
        r.raise_for_status()
    except Exception:
        return []
    out: list[dict[str, Any]] = []
    for item in r.json().get("items", [])[:12]:
        info = item.get("volumeInfo", {})
        ids = {x.get("type"): x.get("identifier") for x in info.get("industryIdentifiers", [])}
        out.append({
            "source": "google_books",
            "title": info.get("title"),
            "subtitle": info.get("subtitle"),
            "author": (info.get("authors") or [None])[0],
            "publishedDate": info.get("publishedDate"),
            "description": info.get("description"),
            "pageCount": info.get("pageCount"),
            "language": info.get("language"),
            "isbn13": ids.get("ISBN_13"),
            "isbn10": ids.get("ISBN_10"),
            "coverUrl": (info.get("imageLinks") or {}).get("thumbnail", "").replace("http://", "https://"),
            "kind": "ebook",
        })
    return out


async def _openlibrary(client: httpx.AsyncClient, q: str) -> list[dict[str, Any]]:
    try:
        r = await client.get(
            "https://openlibrary.org/search.json",
            params={"q": q, "limit": 12},
            headers={"User-Agent": settings.open_library_user_agent},
            timeout=10,
        )
        r.raise_for_status()
    except Exception:
        return []
    out: list[dict[str, Any]] = []
    for d in r.json().get("docs", [])[:12]:
        cover_id = d.get("cover_i")
        out.append({
            "source": "openlibrary",
            "title": d.get("title"),
            "author": (d.get("author_name") or [None])[0],
            "publishedDate": d.get("first_publish_year"),
            "isbn13": (d.get("isbn") or [None])[0],
            "language": (d.get("language") or [None])[0],
            "coverUrl": f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None,
            "kind": "ebook",
        })
    return out


async def search(q: str) -> list[dict[str, Any]]:
    if not q.strip():
        return []
    async with httpx.AsyncClient() as client:
        google_results, ol_results = await asyncio.gather(_google(client, q), _openlibrary(client, q))
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for r in google_results + ol_results:
        if not r.get("title"):
            continue
        key = (r.get("isbn13") or r.get("isbn10") or f"{r['title']}|{r.get('author','')}").lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(r)
    return merged
