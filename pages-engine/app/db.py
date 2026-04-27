"""Async SQLAlchemy session + a thin core-table mirror that matches the
Drizzle schema in pages-web. We don't ORM the whole graph — we just need a
handful of typed Core tables for the scanner, exporter, and importers.
Drizzle is the source of truth for migrations.
"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Double,
    Integer,
    JSON,
    MetaData,
    String,
    Table,
    Text,
    text,
)
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# asyncpg dialect needs `postgresql+asyncpg://`
url = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1).replace(
    "postgresql://", "postgresql+asyncpg://", 1
)
engine = create_async_engine(url, pool_size=10, pool_pre_ping=True, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

metadata = MetaData()

# Mirror just the columns the engine reads/writes. Drizzle owns the schema.
authors = Table(
    "authors",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("name", String(300), nullable=False),
    Column("sort_name", String(300), nullable=False),
    Column("bio", Text),
    Column("photo_url", String(800)),
    Column("metadata", JSON, nullable=False, server_default=text("'{}'::jsonb")),
    Column("created_at", DateTime(timezone=True), server_default=text("now()")),
)

series = Table(
    "series",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("name", String(300), nullable=False),
    Column("author_id", String(40)),
    Column("description", Text),
    Column("metadata", JSON, nullable=False, server_default=text("'{}'::jsonb")),
    Column("created_at", DateTime(timezone=True), server_default=text("now()")),
)

books = Table(
    "books",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("title", String(500), nullable=False),
    Column("sort_title", String(500), nullable=False),
    Column("subtitle", String(500)),
    Column("author_id", String(40)),
    Column("series_id", String(40)),
    Column("series_index", Double),
    Column("narrator", String(300)),
    Column("isbn10", String(16)),
    Column("isbn13", String(20)),
    Column("asin", String(20)),
    Column("publisher", String(300)),
    Column("published_at", DateTime(timezone=True)),
    Column("language", String(10)),
    Column("summary", Text),
    Column("page_count", Integer),
    Column("duration_seconds", Integer),
    Column("word_count", Integer),
    Column("content_rating", String(16)),
    Column("cover_url", String(800)),
    Column("cover_color", String(16)),
    Column("tags", JSON, nullable=False, server_default=text("'[]'::jsonb")),
    Column("genres", JSON, nullable=False, server_default=text("'[]'::jsonb")),
    Column("metadata", JSON, nullable=False, server_default=text("'{}'::jsonb")),
    Column("added_at", DateTime(timezone=True), server_default=text("now()")),
    Column("updated_at", DateTime(timezone=True), server_default=text("now()")),
)

book_files = Table(
    "book_files",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("book_id", String(40), nullable=False),
    Column("kind", String(16), nullable=False),
    Column("format", String(16), nullable=False),
    Column("path", String(1000), nullable=False),
    Column("size_bytes", BigInteger),
    Column("content_hash", String(80)),
    Column("duration_seconds", Integer),
    Column("chapters", JSON, nullable=False, server_default=text("'[]'::jsonb")),
    Column("bitrate", Integer),
    Column("sample_rate", Integer),
    Column("added_at", DateTime(timezone=True), server_default=text("now()")),
    Column("scanned_at", DateTime(timezone=True), server_default=text("now()")),
)

users = Table(
    "users",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("first_name", String(80), nullable=False),
    Column("role", String(20), nullable=False, server_default="friend"),
    Column("banned", Boolean, nullable=False, server_default=text("false")),
    Column("auto_approve", Boolean, nullable=False, server_default=text("false")),
    Column("daily_request_quota", Integer, nullable=False, server_default="5"),
    Column("kindle_email", String(320)),
    Column("kobo_token", String(200)),
    Column("reading_speed_wpm", Integer, nullable=False, server_default="250"),
    Column("settings", JSON, nullable=False, server_default=text("'{}'::jsonb")),
    Column("created_at", DateTime(timezone=True), server_default=text("now()")),
    Column("last_seen_at", DateTime(timezone=True)),
)

reading_progress = Table(
    "reading_progress",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("user_id", String(40), nullable=False),
    Column("book_id", String(40), nullable=False),
    Column("file_id", String(40), nullable=False),
    Column("cfi", String(600)),
    Column("position_seconds", Double),
    Column("progress", Double, nullable=False, server_default="0"),
    Column("device_id", String(80)),
    Column("updated_at", DateTime(timezone=True), server_default=text("now()")),
)

library_requests = Table(
    "library_requests",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("user_id", String(40), nullable=False),
    Column("title", String(500), nullable=False),
    Column("author", String(300)),
    Column("isbn13", String(20)),
    Column("asin", String(20)),
    Column("cover_url", String(800)),
    Column("format_preference", String(16), nullable=False, server_default="either"),
    Column("note", Text),
    Column("source", JSON, nullable=False, server_default=text("'{}'::jsonb")),
    Column("status", String(20), nullable=False, server_default="pending"),
    Column("readarr_id", Integer),
    Column("fulfilled_book_id", String(40)),
    Column("created_at", DateTime(timezone=True), server_default=text("now()")),
    Column("updated_at", DateTime(timezone=True), server_default=text("now()")),
)
