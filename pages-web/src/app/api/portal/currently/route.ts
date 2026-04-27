/**
 * Public-ish endpoint the tyflix portal can consume to render the
 * "Currently reading / listening" widget. Returns just the latest
 * in-progress book per family member, sorted by last activity.
 *
 * Auth: requires a valid family JWT cookie. Output strips PII (no IPs, no
 * file paths) — just enough for the portal card.
 */

import { desc, eq, sql as dsql } from "drizzle-orm";

import { db } from "@/lib/db";
import { books, readingProgress, users } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/session";

export async function GET() {
  const viewer = await getUser();
  if (!viewer) return new Response("unauthorized", { status: 401 });

  const rows = await db
    .select({
      firstName: users.firstName,
      bookId: books.id,
      title: books.title,
      coverUrl: books.coverUrl,
      progress: readingProgress.progress,
      updatedAt: readingProgress.updatedAt,
    })
    .from(readingProgress)
    .innerJoin(users, eq(readingProgress.userId, users.id))
    .innerJoin(books, eq(readingProgress.bookId, books.id))
    .where(dsql`${readingProgress.progress} > 0 and ${readingProgress.progress} < 0.97`)
    .orderBy(desc(readingProgress.updatedAt))
    .limit(20);

  // Dedupe by user — keep the most recent per person
  const seen = new Set<string>();
  const out = rows.filter((r) => {
    if (seen.has(r.firstName)) return false;
    seen.add(r.firstName);
    return true;
  });

  return Response.json({ currently: out });
}
