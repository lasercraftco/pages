"""HTTP Range streaming for audiobook playback.

The browser <audio> element issues Range requests; we honor them so seek
is instant even on multi-GB m4b files. The response always includes
Accept-Ranges and the right CORS-friendly Content-Type.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select

from app.db import SessionLocal, book_files

router = APIRouter()

CHUNK = 256 * 1024  # 256 KiB

_MIME = {
    "m4b": "audio/mp4",
    "mp3": "audio/mpeg",
    "flac": "audio/flac",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
}


@router.get("/stream/{file_id}")
async def stream(file_id: str, request: Request) -> Response:
    async with SessionLocal() as session:
        row = (
            await session.execute(
                select(book_files.c.path, book_files.c.format, book_files.c.size_bytes).where(book_files.c.id == file_id)
            )
        ).first()
    if not row:
        raise HTTPException(404, "file not found")
    path_str, fmt, size = row[0], row[1], int(row[2] or 0)
    p = Path(path_str)
    if not p.exists():
        raise HTTPException(410, "file vanished")
    if not size:
        size = p.stat().st_size

    mime = _MIME.get(fmt, "application/octet-stream")
    rng = request.headers.get("range")
    if rng and rng.startswith("bytes="):
        try:
            spec = rng[len("bytes="):]
            start_s, _, end_s = spec.partition("-")
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else size - 1
            end = min(end, size - 1)
            length = end - start + 1
        except ValueError:
            raise HTTPException(416, "invalid range") from None

        async def reader() -> AsyncIterator[bytes]:
            with p.open("rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(CHUNK, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Cache-Control": "no-store",
        }
        return StreamingResponse(reader(), status_code=206, media_type=mime, headers=headers)

    async def reader() -> AsyncIterator[bytes]:
        with p.open("rb") as f:
            while True:
                chunk = f.read(CHUNK)
                if not chunk:
                    break
                yield chunk

    headers = {"Accept-Ranges": "bytes", "Content-Length": str(size), "Cache-Control": "no-store"}
    return StreamingResponse(reader(), media_type=mime, headers=headers)
