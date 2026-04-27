"""POST /convert/<file_id>/<target_fmt> — synchronous Calibre conversion.

Returns a relative URL the browser can hit to download the converted file.
"""

from __future__ import annotations

from pathlib import Path
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.db import SessionLocal, book_files
from app.exporters.calibre import convert_file

router = APIRouter()

ALLOWED = {"epub", "mobi", "pdf", "azw3"}


@router.post("/convert/{file_id}/{target}")
async def convert(file_id: str, target: str) -> dict[str, str]:
    if target not in ALLOWED:
        raise HTTPException(400, f"target must be one of {sorted(ALLOWED)}")
    async with SessionLocal() as session:
        row = (
            await session.execute(select(book_files.c.path, book_files.c.format).where(book_files.c.id == file_id))
        ).first()
    if not row:
        raise HTTPException(404, "file not found")
    path_str, src_fmt = row[0], row[1]
    if src_fmt == target:
        return {"url": f"/file/{file_id}", "expiresAt": ""}
    out = await convert_file(Path(path_str), target=target)
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    return {"url": f"/file/{file_id}?format={target}", "expiresAt": expires, "outFile": out.name}
