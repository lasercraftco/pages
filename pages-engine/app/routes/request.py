"""Approve a request → add to Readarr. Called by the web admin UI when
the owner approves a friend's request, or directly when an owner submits.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.db import SessionLocal, library_requests
from app.services import readarr

log = logging.getLogger("pages.request")
router = APIRouter(prefix="/requests", tags=["requests"])


class ApproveReq(BaseModel):
    requestId: str
    foreignBookId: str  # Goodreads / OpenLibrary id passed through to Readarr


@router.post("/approve")
async def approve(req: ApproveReq) -> dict:
    async with SessionLocal() as session:
        row = (
            await session.execute(select(library_requests).where(library_requests.c.id == req.requestId))
        ).first()
        if not row:
            raise HTTPException(404, "request not found")
        try:
            book = await readarr.add_book(foreign_book_id=req.foreignBookId)
        except Exception as e:
            log.exception("readarr add failed")
            raise HTTPException(502, f"readarr: {e}") from None
        await session.execute(
            library_requests.update()
            .where(library_requests.c.id == req.requestId)
            .values(status="downloading", readarr_id=book.get("id"), updated_at=datetime.now(timezone.utc))
        )
        await session.commit()
    return {"ok": True, "readarrId": book.get("id")}
