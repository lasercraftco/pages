"""File-format identification — the two source-of-truth maps for which
extensions Pages treats as ebooks vs. audiobooks."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

Kind = Literal["ebook", "audiobook"]

EBOOK_EXTS: dict[str, str] = {
    ".epub": "epub",
    ".pdf": "pdf",
    ".mobi": "mobi",
    ".azw3": "azw3",
    ".azw": "azw3",
    ".cbr": "cbr",
    ".cbz": "cbz",
    ".djvu": "djvu",
    ".fb2": "fb2",
}

AUDIOBOOK_EXTS: dict[str, str] = {
    ".m4b": "m4b",
    ".m4a": "m4b",   # Apple's audiobook container under another name
    ".mp3": "mp3",
    ".flac": "flac",
    ".aac": "aac",
    ".ogg": "ogg",
    ".oga": "ogg",
    ".opus": "ogg",
}


def identify(path: Path) -> tuple[Kind, str] | None:
    suffix = path.suffix.lower()
    if suffix in EBOOK_EXTS:
        return "ebook", EBOOK_EXTS[suffix]
    if suffix in AUDIOBOOK_EXTS:
        return "audiobook", AUDIOBOOK_EXTS[suffix]
    return None
