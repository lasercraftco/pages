from pathlib import Path

from app.scanner.formats import identify


def test_identify_epub():
    assert identify(Path("/foo/bar.EPUB")) == ("ebook", "epub")


def test_identify_m4b():
    assert identify(Path("/foo/bar.m4b")) == ("audiobook", "m4b")


def test_identify_unknown():
    assert identify(Path("/foo/readme.md")) is None
