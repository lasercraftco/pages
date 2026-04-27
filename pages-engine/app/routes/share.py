"""Expiring signed share links for sending a book to someone outside the
family. The signature uses the same TYFLIX_AUTH_JWT_SECRET so it's a
self-contained token (no DB row needed)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from jose import jwt, JWTError
from pathlib import Path
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, book_files

router = APIRouter()
settings = get_settings()


@router.post("/share/{file_id}")
async def make_share(file_id: str, ttl: int = 24) -> dict[str, str]:
    ttl = max(1, min(ttl, 7 * 24))  # cap at a week
    exp = datetime.now(timezone.utc) + timedelta(hours=ttl)
    token = jwt.encode(
        {"file": file_id, "exp": int(exp.timestamp()), "scope": "share"},
        settings.tyflix_auth_jwt_secret,
        algorithm="HS256",
    )
    return {"url": f"/api/engine/s/{token}", "expiresAt": exp.isoformat()}


@router.get("/s/{token}")
async def consume_share(token: str) -> FileResponse:
    try:
        payload = jwt.decode(token, settings.tyflix_auth_jwt_secret, algorithms=["HS256"])
    except JWTError as e:
        raise HTTPException(401, f"invalid or expired token: {e}") from None
    if payload.get("scope") != "share":
        raise HTTPException(403, "wrong scope")
    file_id = payload["file"]
    async with SessionLocal() as session:
        row = (
            await session.execute(select(book_files.c.path).where(book_files.c.id == file_id))
        ).first()
    if not row:
        raise HTTPException(404, "file not found")
    p = Path(row[0])
    if not p.exists():
        raise HTTPException(410, "file vanished")
    return FileResponse(p, filename=p.name)
