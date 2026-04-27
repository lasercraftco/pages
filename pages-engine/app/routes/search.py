"""External search across Google Books + OpenLibrary."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.external_search import search

router = APIRouter()


@router.get("/search/external")
async def search_external(q: str = Query(..., min_length=2)) -> dict:
    return {"results": await search(q)}
