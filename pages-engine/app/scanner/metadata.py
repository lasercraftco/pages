"""Per-file metadata extraction.

We try in this order, falling back at each step:
1. Embedded metadata (mutagen for audio, ebooklib for EPUB, pypdf for PDF).
2. Filename / parent-folder heuristics.
3. External enrichment (Google Books / OpenLibrary by ISBN or title+author).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import mutagen
from ebooklib import epub
from pypdf import PdfReader


@dataclass
class FileMeta:
    title: str
    author: str | None = None
    series: str | None = None
    series_index: float | None = None
    narrator: str | None = None
    isbn13: str | None = None
    isbn10: str | None = None
    asin: str | None = None
    publisher: str | None = None
    language: str | None = None
    summary: str | None = None
    page_count: int | None = None
    duration_seconds: float | None = None
    bitrate: int | None = None
    sample_rate: int | None = None
    chapters: list[dict] = field(default_factory=list)
    cover_bytes: bytes | None = None  # raw image bytes, if embedded
    tags: list[str] = field(default_factory=list)


# ─── ebook readers ───

def read_epub(path: Path) -> FileMeta:
    book = epub.read_epub(str(path))
    title = (book.get_metadata("DC", "title") or [("Unknown", {})])[0][0]
    creators = book.get_metadata("DC", "creator")
    author = creators[0][0] if creators else None
    publisher_md = book.get_metadata("DC", "publisher")
    publisher = publisher_md[0][0] if publisher_md else None
    lang_md = book.get_metadata("DC", "language")
    language = lang_md[0][0] if lang_md else None
    desc_md = book.get_metadata("DC", "description")
    summary = desc_md[0][0] if desc_md else None

    isbn13 = isbn10 = None
    for raw, _attrs in book.get_metadata("DC", "identifier") or []:
        digits = re.sub(r"[^0-9Xx]", "", raw)
        if len(digits) == 13:
            isbn13 = digits
        elif len(digits) == 10:
            isbn10 = digits

    cover_bytes: bytes | None = None
    cover_id = book.get_metadata("OPF", "cover")
    if cover_id:
        cover_item = book.get_item_with_id(cover_id[0][1].get("content", ""))
        if cover_item:
            cover_bytes = cover_item.get_content()

    return FileMeta(
        title=title,
        author=author,
        publisher=publisher,
        language=language,
        summary=summary,
        isbn13=isbn13,
        isbn10=isbn10,
        cover_bytes=cover_bytes,
    )


def read_pdf(path: Path) -> FileMeta:
    reader = PdfReader(str(path))
    info = reader.metadata or {}
    title = info.get("/Title") or path.stem
    author = info.get("/Author")
    return FileMeta(title=str(title), author=str(author) if author else None, page_count=len(reader.pages))


# ─── audio reader ───

_PARENS_NUMBER = re.compile(r"\(([\d.]+)\)")
_BOOK_NUMBER = re.compile(r"\b(?:book|vol|volume|#)\s*[\s.]?\s*(\d+)", re.IGNORECASE)


def read_audio(path: Path, format: str) -> FileMeta:
    f = mutagen.File(str(path), easy=True)
    tags = (f.tags or {}) if f else {}
    title = (tags.get("title") or [path.stem])[0]
    artist = (tags.get("artist") or [None])[0]
    album = (tags.get("album") or [None])[0]
    genre = tags.get("genre") or []
    series = album if album and album != title else None

    # Series index detection from title or album
    series_index = None
    for s in [title, album or ""]:
        m = _PARENS_NUMBER.search(s) or _BOOK_NUMBER.search(s)
        if m:
            try:
                series_index = float(m.group(1))
                break
            except ValueError:
                pass

    duration: float | None = None
    bitrate: int | None = None
    sample_rate: int | None = None
    if f and f.info:
        duration = float(getattr(f.info, "length", 0)) or None
        bitrate = getattr(f.info, "bitrate", None)
        sample_rate = getattr(f.info, "sample_rate", None)

    chapters: list[dict] = []
    if format == "m4b":
        # mutagen exposes m4b chapters via the underlying MP4 atoms.
        try:
            from mutagen.mp4 import MP4

            mp4 = MP4(str(path))
            chap_atom = mp4.tags.get("\xa9nam") if mp4.tags else None
            for i, c in enumerate(getattr(mp4, "chapters", []) or []):
                chapters.append({
                    "index": i,
                    "title": c.title or f"Chapter {i + 1}",
                    "startSeconds": float(c.start),
                    "endSeconds": float(c.start + c.duration) if c.duration else float(c.start),
                })
        except Exception:
            pass

    return FileMeta(
        title=title,
        author=artist,
        narrator=artist,  # often the same field; user can correct
        series=series,
        series_index=series_index,
        duration_seconds=duration,
        bitrate=bitrate,
        sample_rate=sample_rate,
        chapters=chapters,
        tags=list(genre),
    )


# ─── filename heuristics (last-resort fallback) ───

_AUTHOR_TITLE = re.compile(r"^(?P<author>[^-/]+?)\s*-\s*(?P<title>.+?)$")


def heuristic_from_path(path: Path) -> FileMeta:
    stem = path.stem
    parent = path.parent.name
    grandparent = path.parent.parent.name if path.parent.parent else None

    # "Author - Title" pattern in filename or parent folder.
    for s in (stem, parent):
        m = _AUTHOR_TITLE.match(s)
        if m:
            return FileMeta(title=m.group("title").strip(), author=m.group("author").strip())

    # Folder layout: Author/Series/Title — common Audiobookshelf shape.
    if grandparent and parent and stem and parent != stem:
        return FileMeta(title=stem, author=grandparent, series=parent if parent != grandparent else None)

    return FileMeta(title=stem)


def merge(*metas: FileMeta) -> FileMeta:
    """Combine multiple FileMeta — the first non-None value wins per field."""
    out: dict = {}
    for m in metas:
        for k, v in vars(m).items():
            if k in out and out[k]:
                continue
            if v in (None, "", [], {}):
                continue
            out[k] = v
    return FileMeta(**{**vars(metas[0]), **out})
