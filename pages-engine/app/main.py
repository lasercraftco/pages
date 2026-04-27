"""FastAPI entrypoint for pages-engine."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routes import (
    convert,
    export,
    file,
    health,
    request as request_route,
    scan,
    search,
    share,
    stream,
)

logging.basicConfig(level=getattr(logging, get_settings().log_level.upper(), logging.INFO))


app = FastAPI(
    title="pages — engine",
    version=__version__,
    description="Library scanner, audio streaming, ebook conversion, e-reader exporters.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router)
app.include_router(search.router)
app.include_router(stream.router)
app.include_router(file.router)
app.include_router(convert.router)
app.include_router(export.router)
app.include_router(request_route.router)
app.include_router(share.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "pages-engine", "version": __version__, "docs": "/docs"}
