/**
 * Drizzle schema for the `pages` Postgres database.
 * Source of truth for table structure — both pages-web and pages-engine
 * agree on these names + columns.
 *
 * Multi-user model: progress / bookmarks / highlights / notes / ratings /
 * shelves / requests all carry a user_id. The book + audiobook catalog
 * is global (deduped across users by content hash + title-author).
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ─────────── users (first-name auth, family-shared cookie) ─────────── */

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("friend"), // owner | trusted | friend
    banned: boolean("banned").notNull().default(false),
    // Auto-approve is the family default — friends fulfill their own requests
    // immediately. Set to false to fall back to a manual queue (kept for
    // future use; the UI doesn't surface it).
    autoApprove: boolean("auto_approve").notNull().default(true),
    // 10/day for friends, owner gets unlimited (enforced in request handler).
    dailyRequestQuota: integer("daily_request_quota").notNull().default(10),
    kindleEmail: varchar("kindle_email", { length: 320 }),
    koboToken: varchar("kobo_token", { length: 200 }),
    readingSpeedWpm: integer("reading_speed_wpm").notNull().default(250),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("uq_users_first_name").on(sql`lower(${t.firstName})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: varchar("user_agent", { length: 500 }),
    ip: varchar("ip", { length: 64 }),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 40 }).references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 80 }).notNull(),
    target: varchar("target", { length: 200 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_audit_user").on(t.userId), index("idx_audit_action").on(t.action)],
);

/* ─────────── catalog: authors / series / books / audiobooks / files ─────────── */

export const authors = pgTable(
  "authors",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    name: varchar("name", { length: 300 }).notNull(),
    sortName: varchar("sort_name", { length: 300 }).notNull(),
    bio: text("bio"),
    photoUrl: varchar("photo_url", { length: 800 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_authors_sort").on(t.sortName), index("idx_authors_name").on(t.name)],
);

export const series = pgTable(
  "series",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    name: varchar("name", { length: 300 }).notNull(),
    authorId: varchar("author_id", { length: 40 }).references(() => authors.id, { onDelete: "set null" }),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_series_name_author").on(sql`lower(${t.name})`, t.authorId),
    index("idx_series_author").on(t.authorId),
  ],
);

/**
 * A `book` is a logical work — Pride and Prejudice, regardless of edition or
 * format. It can be backed by any number of `book_files` (an EPUB, an MP3 m4b,
 * a PDF) and by both an ebook + an audiobook. The read-or-listen toggle works
 * because both formats hang off the same book.
 */
export const books = pgTable(
  "books",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    title: varchar("title", { length: 500 }).notNull(),
    sortTitle: varchar("sort_title", { length: 500 }).notNull(),
    subtitle: varchar("subtitle", { length: 500 }),
    authorId: varchar("author_id", { length: 40 }).references(() => authors.id, { onDelete: "set null" }),
    seriesId: varchar("series_id", { length: 40 }).references(() => series.id, { onDelete: "set null" }),
    seriesIndex: doublePrecision("series_index"),
    narrator: varchar("narrator", { length: 300 }),
    isbn10: varchar("isbn10", { length: 16 }),
    isbn13: varchar("isbn13", { length: 20 }),
    asin: varchar("asin", { length: 20 }),
    publisher: varchar("publisher", { length: 300 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    language: varchar("language", { length: 10 }),
    summary: text("summary"),
    pageCount: integer("page_count"),
    durationSeconds: integer("duration_seconds"),
    wordCount: integer("word_count"),
    contentRating: varchar("content_rating", { length: 16 }), // family / teen / adult
    coverUrl: varchar("cover_url", { length: 800 }),
    coverColor: varchar("cover_color", { length: 16 }), // dominant hex (UI shimmer)
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_books_sort_title").on(t.sortTitle),
    index("idx_books_author").on(t.authorId),
    index("idx_books_series").on(t.seriesId),
    index("idx_books_added").on(t.addedAt),
    uniqueIndex("uq_books_isbn13").on(t.isbn13),
  ],
);

/** A file on disk that backs a book in some format. Ebook OR audiobook. */
export const bookFiles = pgTable(
  "book_files",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(), // ebook | audiobook
    format: varchar("format", { length: 16 }).notNull(), // epub|pdf|mobi|azw3|cbr|cbz|djvu|fb2|m4b|mp3|flac|aac|ogg
    path: varchar("path", { length: 1000 }).notNull(), // absolute path inside the engine container
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    contentHash: varchar("content_hash", { length: 80 }),
    durationSeconds: integer("duration_seconds"), // audiobooks
    chapters: jsonb("chapters").$type<Chapter[]>().notNull().default([]),
    bitrate: integer("bitrate"),
    sampleRate: integer("sample_rate"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_book_files_path").on(t.path),
    index("idx_book_files_book").on(t.bookId),
    index("idx_book_files_kind").on(t.kind),
  ],
);

export type Chapter = {
  index: number;
  title: string;
  startSeconds: number;
  endSeconds: number;
};

/* ─────────── per-user state ─────────── */

export const userBookState = pgTable(
  "user_book_state",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull().default("none"), // none | want | currently | finished | dnf
    starRating: integer("star_rating"), // 1..5
    privateNotes: text("private_notes"),
    publicReview: text("public_review"), // bookplate signature
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_user_book").on(t.userId, t.bookId),
    index("idx_user_book_status").on(t.userId, t.status),
  ],
);

/** Real-time progress for a single (user, book_file) pair.
 *  For ebooks: cfi + percentage. For audiobooks: positionSeconds + percentage. */
export const readingProgress = pgTable(
  "reading_progress",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    fileId: varchar("file_id", { length: 40 })
      .notNull()
      .references(() => bookFiles.id, { onDelete: "cascade" }),
    cfi: varchar("cfi", { length: 600 }),
    positionSeconds: doublePrecision("position_seconds"),
    progress: doublePrecision("progress").notNull().default(0), // 0..1
    deviceId: varchar("device_id", { length: 80 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_progress_user_file").on(t.userId, t.fileId),
    index("idx_progress_user_book").on(t.userId, t.bookId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    fileId: varchar("file_id", { length: 40 })
      .notNull()
      .references(() => bookFiles.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 200 }),
    cfi: varchar("cfi", { length: 600 }),
    positionSeconds: doublePrecision("position_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_bookmarks_user_book").on(t.userId, t.bookId)],
);

export const highlights = pgTable(
  "highlights",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    fileId: varchar("file_id", { length: 40 })
      .notNull()
      .references(() => bookFiles.id, { onDelete: "cascade" }),
    cfiRange: varchar("cfi_range", { length: 1000 }).notNull(),
    text: text("text").notNull(),
    note: text("note"),
    color: varchar("color", { length: 16 }).notNull().default("yellow"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_highlights_user_book").on(t.userId, t.bookId)],
);

/* ─────────── shelves / smart shelves ─────────── */

export const shelves = pgTable(
  "shelves",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    smartQuery: jsonb("smart_query").$type<Record<string, unknown> | null>(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_shelves_user").on(t.userId)],
);

export const shelfBooks = pgTable(
  "shelf_books",
  {
    shelfId: varchar("shelf_id", { length: 40 })
      .notNull()
      .references(() => shelves.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 40 })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_shelf_book").on(t.shelfId, t.bookId)],
);

/* ─────────── requests (replacing Ombi for books) ─────────── */

export const libraryRequests = pgTable(
  "library_requests",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    author: varchar("author", { length: 300 }),
    isbn13: varchar("isbn13", { length: 20 }),
    asin: varchar("asin", { length: 20 }),
    coverUrl: varchar("cover_url", { length: 800 }),
    formatPreference: varchar("format_preference", { length: 16 }).notNull().default("either"), // ebook | audiobook | either
    note: text("note"),
    source: jsonb("source").$type<Record<string, unknown>>().notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | downloading | available | declined
    readarrId: integer("readarr_id"),
    fulfilledBookId: varchar("fulfilled_book_id", { length: 40 }).references(() => books.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_requests_user").on(t.userId), index("idx_requests_status").on(t.status)],
);

/* ─────────── follows (author / series) ─────────── */

export const follows = pgTable(
  "follows",
  {
    id: varchar("id", { length: 40 }).primaryKey().default(sql`gen_random_uuid()::text`),
    userId: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(), // author | series
    targetId: varchar("target_id", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_follow_user_target").on(t.userId, t.kind, t.targetId)],
);

/* ─────────── inferred TS types ─────────── */

export type Role = "owner" | "trusted" | "friend";
export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type BookFile = typeof bookFiles.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Series = typeof series.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
export type Shelf = typeof shelves.$inferSelect;
export type LibraryRequest = typeof libraryRequests.$inferSelect;
