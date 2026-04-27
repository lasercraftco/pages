"""Scan trigger + status endpoints. Scans run as background tasks; the
endpoint returns immediately with a job id and progress is observable via
GET /scan/status."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.scanner import run_full_scan, run_path_scan

router = APIRouter(prefix="/scan", tags=["scan"])
log = logging.getLogger("pages.scan.api")

# In-memory job registry. Restart-safe is overkill for a personal library;
# losing the registry just means polling status returns "unknown".
_JOBS: dict[str, dict[str, Any]] = {}


class PathReq(BaseModel):
    path: str


def _start_job(coro_factory) -> str:
    job_id = uuid.uuid4().hex[:12]
    _JOBS[job_id] = {"status": "running", "stats": None}

    async def _run() -> None:
        try:
            stats = await coro_factory()
            _JOBS[job_id] = {"status": "done", "stats": stats}
        except Exception as e:
            log.exception("scan job %s failed", job_id)
            _JOBS[job_id] = {"status": "error", "error": str(e)}

    asyncio.create_task(_run())
    return job_id


@router.post("/full")
async def scan_full() -> dict[str, str]:
    job_id = _start_job(run_full_scan)
    return {"jobId": job_id}


@router.post("/path")
async def scan_path(req: PathReq) -> dict[str, str]:
    job_id = _start_job(lambda: run_path_scan(req.path))
    return {"jobId": job_id}


@router.get("/status/{job_id}")
async def scan_status(job_id: str) -> dict[str, Any]:
    return _JOBS.get(job_id, {"status": "unknown"})
