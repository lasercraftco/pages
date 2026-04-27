"""Settings — read from env, validated by pydantic."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgres://pages:pages@localhost:5434/pages"

    # Library roots (mounted from the iMac into the container).
    pages_ebook_roots: str = "/library/ebooks"
    pages_audiobook_roots: str = "/library/audiobooks"

    # Cache + scratch space (covers, conversion outputs, share tokens)
    pages_cache_dir: Path = Path("/var/lib/pages")

    # Auth — same secret as web for share-token signing
    tyflix_auth_jwt_secret: str = "dev-only-not-secret-change-me"

    # Metadata enrichment
    google_books_api_key: str | None = None
    open_library_user_agent: str = "Pages/1.0 (pages.tyflix.net)"
    goodreads_scrape_enabled: bool = True

    # Readarr (for the "request" feature)
    readarr_url: str | None = None
    readarr_api_key: str | None = None
    readarr_book_root: str = "/library/ebooks"
    readarr_audiobook_downloader_url: str | None = None
    readarr_audiobook_downloader_key: str | None = None

    # Migration sources
    kavita_url: str | None = None
    kavita_api_key: str | None = None
    abs_url: str | None = None
    abs_api_key: str | None = None

    # SMTP for Send-to-Kindle
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_from: str = "pages@tyflix.net"

    # Calibre
    calibre_bin: str = "/usr/bin/ebook-convert"
    convert_timeout_s: int = 120

    # Misc
    log_level: str = "info"

    @property
    def ebook_roots(self) -> list[Path]:
        return [Path(p.strip()) for p in self.pages_ebook_roots.split(",") if p.strip()]

    @property
    def audiobook_roots(self) -> list[Path]:
        return [Path(p.strip()) for p in self.pages_audiobook_roots.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
