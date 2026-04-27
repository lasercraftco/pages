"""Calibre-backed conversion. We shell out to ebook-convert because Calibre
doesn't ship a reusable Python API. Outputs are cached by source-hash +
target so repeated requests are instant."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from pathlib import Path

from app.config import get_settings

log = logging.getLogger("pages.calibre")
settings = get_settings()
CONVERT_DIR = settings.pages_cache_dir / "converted"
CONVERT_DIR.mkdir(parents=True, exist_ok=True)


def _cache_key(src: Path, target: str) -> Path:
    h = hashlib.sha256()
    try:
        h.update(str(src.stat().st_size).encode())
        h.update(str(int(src.stat().st_mtime)).encode())
    except OSError:
        pass
    h.update(str(src).encode())
    h.update(target.encode())
    return CONVERT_DIR / f"{h.hexdigest()[:32]}.{target}"


async def convert_file(src: Path, *, target: str) -> Path:
    if not src.exists():
        raise FileNotFoundError(src)
    out = _cache_key(src, target)
    if out.exists():
        return out

    cmd = [settings.calibre_bin, str(src), str(out)]
    log.info("calibre: %s -> %s", src.name, target)
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=settings.convert_timeout_s)
    except TimeoutError:
        proc.kill()
        raise RuntimeError(f"calibre conversion timed out after {settings.convert_timeout_s}s") from None
    if proc.returncode != 0:
        raise RuntimeError(f"calibre failed: {stderr.decode(errors='ignore')[:500]}")
    if not out.exists():
        raise RuntimeError("calibre exited 0 but produced no output")
    return out
