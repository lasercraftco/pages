"""Cover-art resolution.

Order:
1. Embedded cover (set by metadata.py if present in the file).
2. cover.jpg / cover.png next to the file or in the parent folder.
3. Google Books API by ISBN, then by title+author.
4. OpenLibrary by ISBN.
5. Audible search (best-effort scrape) for audiobooks.

Saved into <cache_dir>/covers/<sha256>.jpg and exposed via /covers/<sha>.jpg.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import httpx
from PIL import Image
from io import BytesIO

from app.config import get_settings

log = logging.getLogger("pages.covers")
settings = get_settings()
COVER_DIR = settings.pages_cache_dir / "covers"
COVER_DIR.mkdir(parents=True, exist_ok=True)


def _save(content: bytes) -> str:
    """Write bytes as JPEG, return the relative cover URL (/covers/<sha>.jpg)."""
    sha = hashlib.sha256(content).hexdigest()[:32]
    out = COVER_DIR / f"{sha}.jpg"
    if not out.exists():
        try:
            img = Image.open(BytesIO(content)).convert("RGB")
            # Keep proportions; cap longest side at 800px for fast UI loads.
            img.thumbnail((800, 1200), Image.LANCZOS)
            img.save(out, "JPEG", quality=85, optimize=True)
        except Exception as e:
            log.warning("cover save failed: %s", e)
            return ""
    return f"/covers/{sha}.jpg"


def from_embedded(blob: bytes | None) -> str | None:
    if not blob:
        return None
    return _save(blob) or None


def from_sidecar(file_path: Path) -> str | None:
    for parent in (file_path.parent, file_path.parent.parent):
        for name in ("cover.jpg", "cover.png", "folder.jpg", "folder.png"):
            cand = parent / name
            if cand.exists():
                try:
                    return _save(cand.read_bytes())
                except Exception:
                    continue
    return None


async def from_google_books(client: httpx.AsyncClient, isbn: str | None, title: str, author: str | None) -> str | None:
    key = settings.google_books_api_key
    if isbn:
        q = f"isbn:{isbn}"
    else:
        q = f"intitle:{title}"
        if author:
            q += f"+inauthor:{author}"
    params: dict[str, str] = {"q": q, "maxResults": "1"}
    if key:
        params["key"] = key
    try:
        r = await client.get("https://www.googleapis.com/books/v1/volumes", params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        items = data.get("items", [])
        if not items:
            return None
        info = items[0].get("volumeInfo", {})
        links = info.get("imageLinks", {})
        url = (
            links.get("extraLarge")
            or links.get("large")
            or links.get("medium")
            or links.get("thumbnail")
        )
        if not url:
            return None
        url = url.replace("http://", "https://").replace("&edge=curl", "")
        ir = await client.get(url, timeout=15)
        ir.raise_for_status()
        return _save(ir.content)
    except Exception as e:
        log.debug("google books cover fail %s: %s", q, e)
        return None


async def from_openlibrary(client: httpx.AsyncClient, isbn: str | None, title: str, author: str | None) -> str | None:
    if not isbn:
        try:
            r = await client.get(
                "https://openlibrary.org/search.json",
                params={"title": title, "author": author or "", "limit": 1},
                headers={"User-Agent": settings.open_library_user_agent},
                timeout=10,
            )
            r.raise_for_status()
            docs = r.json().get("docs", [])
            isbn = (docs[0].get("isbn") or [None])[0] if docs else None
        except Exception as e:
            log.debug("openlibrary search fail: %s", e)
            return None
    if not isbn:
        return None
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    try:
        r = await client.get(url, timeout=15)
        if r.status_code == 200 and len(r.content) > 1000:
            return _save(r.content)
    except Exception:
        pass
    return None


async def resolve(
    *,
    embedded: bytes | None,
    file_path: Path,
    isbn: str | None,
    title: str,
    author: str | None,
) -> str | None:
    """Try every source in order; return the first cover URL we land on."""
    if (u := from_embedded(embedded)):
        return u
    if (u := from_sidecar(file_path)):
        return u
    async with httpx.AsyncClient(headers={"User-Agent": settings.open_library_user_agent}) as client:
        if (u := await from_google_books(client, isbn, title, author)):
            return u
        if (u := await from_openlibrary(client, isbn, title, author)):
            return u
    return None
