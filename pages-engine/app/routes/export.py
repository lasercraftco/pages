"""E-reader export endpoints: Send-to-Kindle (email), Send-to-Kobo (sync),
Apple Books deep link, share-link generation."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.db import SessionLocal, book_files, books
from app.exporters import kindle
from app.exporters.calibre import convert_file

router = APIRouter(prefix="/export", tags=["export"])


class KindleReq(BaseModel):
    fileId: str
    email: str  # user's @kindle.com address


@router.post("/kindle")
async def send_to_kindle(req: KindleReq) -> dict[str, bool]:
    async with SessionLocal() as session:
        row = (
            await session.execute(
                select(book_files.c.path, book_files.c.format, book_files.c.book_id).where(
                    book_files.c.id == req.fileId
                )
            )
        ).first()
        if not row:
            raise HTTPException(404, "file not found")
        path_str, src_fmt, book_id = row[0], row[1], row[2]
        title_row = (
            await session.execute(select(books.c.title).where(books.c.id == book_id))
        ).first()
        title = title_row[0] if title_row else Path(path_str).stem

    p = Path(path_str)
    if src_fmt != "epub":
        p = await convert_file(p, target="epub")

    kindle.send(req.email, p, title=title)
    return {"ok": True}


class AppleBooksReq(BaseModel):
    fileId: str


@router.post("/apple-books")
async def send_to_apple_books(req: AppleBooksReq) -> dict[str, str]:
    """Apple Books on iOS opens any books:// URL whose host is the file. We
    can't return an arbitrary file://, so we return an HTTPS download URL
    that, on iOS, will open in Books.app via the OS file sniffer."""
    return {"deepLink": f"/api/engine/file/{req.fileId}?format=epub"}
