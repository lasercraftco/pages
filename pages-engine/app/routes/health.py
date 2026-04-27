from fastapi import APIRouter

from app import __version__

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, object]:
    return {"ok": True, "version": __version__, "service": "pages-engine"}
