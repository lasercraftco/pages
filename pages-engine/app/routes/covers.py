"""Serve cached cover images written by app.scanner.covers.

Covers are written to ``<PAGES_CACHE_DIR>/covers/<sha>.jpg``; the scanner
stores ``/covers/<sha>.jpg`` on book.cover_url. This route makes that URL
actually resolve. The pages-web side proxies through with the same path so
the cookie domain doesn't change.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import get_settings

router = APIRouter()


def _safe_path(name: str) -> Path:
    """Reject anything that would escape the cover dir."""
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(400, "bad cover name")
    return get_settings().pages_cache_dir / "covers" / name


@router.get("/covers/{name}")
async def get_cover(name: str) -> FileResponse:
    path = _safe_path(name)
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "cover not found")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"cache-control": "public, max-age=86400, immutable"},
    )
