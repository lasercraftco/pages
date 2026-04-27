/**
 * Server-side data access for the library views. All queries return
 * lightweight DTOs, scoped where relevant to the current user.
 */

import "server-only";

import { and, desc, eq, ilike, inArray, or, sql as dsql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  authors,
  bookFiles,
  books,
  readingProgress,
  series,
  shelves,
  userBookState,
  type Book,
} from "@/lib/db/schema";

export type LibraryBook = Pick<
  Book,
  | "id"
  | "title"
  | "subtitle"
  | "sortTitle"
  | "seriesIndex"
  | "narrator"
  | "pageCount"
  | "durationSeconds"
  | "coverUrl"
  | "coverColor"
  | "summary"
  | "tags"
  | "genres"
  | "addedAt"
> & {
  authorName: string | null;
  seriesName: string | null;
  hasEbook: boolean;
  hasAudiobook: boolean;
  progress: number; // 0..1, max across the user's files
  status: "none" | "want" | "currently" | "finished" | "dnf";
};

export type LibraryFilter = {
  q?: string;
  kind?: "ebook" | "audiobook" | "any";
  status?: "currently" | "want" | "finished" | "dnf" | "all";
  authorId?: string;
  seriesId?: string;
  tag?: string;
  sort?: "added" | "title" | "author" | "recently_read";
  limit?: number;
  offset?: number;
};

const POSITIVE = Number.MAX_SAFE_INTEGER;

export async function listBooks(userId: string, filter: LibraryFilter = {}): Promise<LibraryBook[]> {
  const lim = Math.min(filter.limit ?? 120, 500);

  // Subquery to flag formats per book
  const filesAgg = db.$with("files_agg").as(
    db
      .select({
        bookId: bookFiles.bookId,
        hasEbook: dsql<boolean>`bool_or(${bookFiles.kind} = 'ebook')`.as("has_ebook"),
        hasAudiobook: dsql<boolean>`bool_or(${bookFiles.kind} = 'audiobook')`.as("has_audiobook"),
      })
      .from(bookFiles)
      .groupBy(bookFiles.bookId),
  );

  // Aggregate per-user progress
  const progressAgg = db.$with("progress_agg").as(
    db
      .select({
        bookId: readingProgress.bookId,
        progress: dsql<number>`max(${readingProgress.progress})`.as("progress"),
      })
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId))
      .groupBy(readingProgress.bookId),
  );

  const stateAgg = db.$with("state_agg").as(
    db
      .select({ bookId: userBookState.bookId, status: userBookState.status })
      .from(userBookState)
      .where(eq(userBookState.userId, userId)),
  );

  const where = and(
    filter.authorId ? eq(books.authorId, filter.authorId) : undefined,
    filter.seriesId ? eq(books.seriesId, filter.seriesId) : undefined,
    filter.q
      ? or(
          ilike(books.title, `%${filter.q}%`),
          ilike(authors.name, `%${filter.q}%`),
          ilike(series.name, `%${filter.q}%`),
        )
      : undefined,
    filter.tag ? dsql`${books.tags} ? ${filter.tag}` : undefined,
    filter.kind === "ebook" ? dsql`coalesce(files_agg.has_ebook, false)` : undefined,
    filter.kind === "audiobook" ? dsql`coalesce(files_agg.has_audiobook, false)` : undefined,
  );

  const orderBy =
    filter.sort === "title"
      ? books.sortTitle
      : filter.sort === "author"
      ? authors.sortName
      : filter.sort === "recently_read"
      ? desc(dsql`coalesce(progress_agg.progress, 0)`)
      : desc(books.addedAt);

  const rows = await db
    .with(filesAgg, progressAgg, stateAgg)
    .select({
      id: books.id,
      title: books.title,
      subtitle: books.subtitle,
      sortTitle: books.sortTitle,
      seriesIndex: books.seriesIndex,
      narrator: books.narrator,
      pageCount: books.pageCount,
      durationSeconds: books.durationSeconds,
      coverUrl: books.coverUrl,
      coverColor: books.coverColor,
      summary: books.summary,
      tags: books.tags,
      genres: books.genres,
      addedAt: books.addedAt,
      authorName: authors.name,
      seriesName: series.name,
      hasEbook: dsql<boolean>`coalesce(files_agg.has_ebook, false)`,
      hasAudiobook: dsql<boolean>`coalesce(files_agg.has_audiobook, false)`,
      progress: dsql<number>`coalesce(progress_agg.progress, 0)`,
      status: dsql<LibraryBook["status"]>`coalesce(state_agg.status, 'none')`,
    })
    .from(books)
    .leftJoin(authors, eq(books.authorId, authors.id))
    .leftJoin(series, eq(books.seriesId, series.id))
    .leftJoin(filesAgg, eq(filesAgg.bookId, books.id))
    .leftJoin(progressAgg, eq(progressAgg.bookId, books.id))
    .leftJoin(stateAgg, eq(stateAgg.bookId, books.id))
    .where(where)
    .orderBy(orderBy)
    .limit(lim)
    .offset(filter.offset ?? 0);

  return rows as unknown as LibraryBook[];
}

export async function getBookDetail(userId: string, bookId: string) {
  const [book] = await db
    .select()
    .from(books)
    .leftJoin(authors, eq(books.authorId, authors.id))
    .leftJoin(series, eq(books.seriesId, series.id))
    .where(eq(books.id, bookId))
    .limit(1);

  if (!book) return null;

  const files = await db.select().from(bookFiles).where(eq(bookFiles.bookId, bookId));
  const progress = await db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)));
  const [state] = await db
    .select()
    .from(userBookState)
    .where(and(eq(userBookState.userId, userId), eq(userBookState.bookId, bookId)));

  return { book: book.books, author: book.authors, series: book.series, files, progress, state };
}

export async function smartShelves(userId: string) {
  // Currently reading
  const currently = await listBooks(userId, { status: "currently", sort: "recently_read", limit: 12 });
  // Up next: books in series the user is currently reading, the next index
  const upNext = await listBooks(userId, { status: "want", sort: "added", limit: 12 });
  // Recently added (any)
  const recentlyAdded = await listBooks(userId, { sort: "added", limit: 18 });
  return { currently, upNext, recentlyAdded };
}
