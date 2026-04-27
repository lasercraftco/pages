"use server";

/**
 * Request a book or audiobook.
 *
 * Family policy (Apr 2026): friends auto-fulfill via Readarr immediately —
 * no owner-approval gate. Rate-limited to N/day per friend (default 10);
 * owner has no cap. Audit log records who requested what.
 */

import { and, eq, gte, sql as dsql } from "drizzle-orm";

import { auditLog, libraryRequests, users } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { engine } from "@/lib/engine";
import { isOwner, requireUser } from "@/lib/auth/session";

export type RequestInput = {
  title: string;
  author?: string;
  isbn13?: string;
  asin?: string;
  coverUrl?: string;
  formatPreference?: "ebook" | "audiobook" | "either";
  source?: Record<string, unknown>; // raw search-result blob, helpful in audit log
  foreignBookId?: string; // GR / OL id passed through to Readarr's lookup
  note?: string;
};

export type RequestResult =
  | { ok: true; status: "downloading" | "queued" | "fulfilled"; requestId: string }
  | { ok: false; error: string };

export async function requestBook(input: RequestInput): Promise<RequestResult> {
  const u = await requireUser();

  // ── rate limit (friend only) ──
  if (!isOwner(u)) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ n }] = await db
      .select({ n: dsql<number>`count(*)::int` })
      .from(libraryRequests)
      .where(and(eq(libraryRequests.userId, u.id), gte(libraryRequests.createdAt, since)));
    if (n >= u.dailyRequestQuota) {
      return {
        ok: false,
        error: `daily request limit reached (${u.dailyRequestQuota}/24h). try again tomorrow!`,
      };
    }
  }

  // ── insert request row (always — gives us the audit trail) ──
  const [row] = await db
    .insert(libraryRequests)
    .values({
      userId: u.id,
      title: input.title,
      author: input.author ?? null,
      isbn13: input.isbn13 ?? null,
      asin: input.asin ?? null,
      coverUrl: input.coverUrl ?? null,
      formatPreference: input.formatPreference ?? "either",
      note: input.note ?? null,
      source: input.source ?? {},
      status: "pending",
    })
    .returning();

  // ── always-on auto-fulfill: hand to Readarr right away ──
  try {
    if (!input.foreignBookId) {
      // Quietly accept the request even without a foreign id — owner can still
      // see it in audit log and add manually if needed.
      await db.insert(auditLog).values({
        userId: u.id,
        action: "request.created",
        target: input.title,
        metadata: { requestId: row.id, missingForeignId: true },
      });
      return { ok: true, status: "queued", requestId: row.id };
    }

    // The engine route is the single source of truth for Readarr add.
    const r = await fetch(
      `${process.env.PAGES_ENGINE_URL ?? "http://localhost:8003"}/requests/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: row.id, foreignBookId: input.foreignBookId }),
      },
    );
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`engine ${r.status}: ${body.slice(0, 200)}`);
    }

    await db.insert(auditLog).values({
      userId: u.id,
      action: "request.fulfilled",
      target: input.title,
      metadata: { requestId: row.id, foreignBookId: input.foreignBookId },
    });
    return { ok: true, status: "downloading", requestId: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "request failed";
    await db.insert(auditLog).values({
      userId: u.id,
      action: "request.error",
      target: input.title,
      metadata: { requestId: row.id, error: msg },
    });
    // Leave the request as pending — useful artifact for owner to see.
    return { ok: false, error: msg };
  }
}

export async function searchExternal(q: string) {
  if (!q.trim()) return { results: [] as Awaited<ReturnType<typeof engine.searchExternal>>["results"] };
  return engine.searchExternal(q);
}
