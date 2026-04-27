"""Download / sideload an ebook (or audiobook chunk).

For ebooks we serve the raw file or, if `?format=` is requested and
differs from the source format, run an on-the-fly Calibre conversion.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.db import SessionLocal, book_files
from app.exporters.calibre import convert_file

router = APIRouter()

_EBOOK_MIME = {
    "epub": "application/epub+zip",
    "pdf": "application/pdf",
    "mobi": "application/x-mobipocket-ebook",
    "azw3": "application/vnd.amazon.ebook",
    "cbr": "application/vnd.comicbook-rar",
    "cbz": "application/vnd.comicbook+zip",
    "djvu": "image/vnd.djvu",
    "fb2": "application/x-fictionbook+xml",
}


@router.get("/file/{file_id}")
async def get_file(file_id: str, format: str | None = None) -> FileResponse:
    async with SessionLocal() as session:
        row = (
            await session.execute(
                select(book_files.c.path, book_files.c.format, book_files.c.kind).where(book_files.c.id == file_id)
            )
        ).first()
    if not row:
        raise HTTPException(404, "file not found")
    path_str, src_fmt, kind = row[0], row[1], row[2]
    p = Path(path_str)
    if not p.exists():
        raise HTTPException(410, "file vanished")

    if format and format != src_fmt and kind == "ebook":
        out = await convert_file(p, target=format)
        return FileResponse(
            out,
            media_type=_EBOOK_MIME.get(format, "application/octet-stream"),
            filename=f"{p.stem}.{format}",
        )
    return FileResponse(
        p,
        media_type=_EBOOK_MIME.get(src_fmt, "application/octet-stream"),
        filename=p.name,
    )
