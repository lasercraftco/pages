"use server";

import { eq } from "drizzle-orm";

import { auditLog, bookFiles, books, users } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { engine } from "@/lib/engine";
import { requireUser } from "@/lib/auth/session";

export async function sendToKindle(bookId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user.kindleEmail) {
    return { ok: false, error: "set your @kindle.com email in Settings first." };
  }

  const file = await db.query.bookFiles.findFirst({
    where: (f, { and, eq }) => and(eq(f.bookId, bookId), eq(f.kind, "ebook")),
  });
  if (!file) return { ok: false, error: "no ebook file for this book" };

  try {
    await fetch(
      `${process.env.PAGES_ENGINE_URL ?? "http://localhost:8003"}/export/kindle`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: file.id, email: user.kindleEmail }),
      },
    ).then((r) => {
      if (!r.ok) throw new Error(`engine ${r.status}`);
    });
    await db.insert(auditLog).values({
      userId: user.id,
      action: "export.kindle",
      target: bookId,
      metadata: { fileId: file.id, email: user.kindleEmail },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function makeShareLink(
  bookId: string,
  ttlHours = 24,
): Promise<{ ok: boolean; url?: string; expiresAt?: string; error?: string }> {
  const user = await requireUser();
  const file = await db.query.bookFiles.findFirst({
    where: (f, { and, eq }) => and(eq(f.bookId, bookId), eq(f.kind, "ebook")),
  });
  if (!file) return { ok: false, error: "no file" };
  try {
    const r = await engine.shareLink(file.id, ttlHours);
    await db.insert(auditLog).values({
      userId: user.id,
      action: "share.link",
      target: bookId,
      metadata: { fileId: file.id, ttl: ttlHours },
    });
    return { ok: true, url: r.url, expiresAt: r.expiresAt };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "share failed" };
  }
}

export async function setKindleEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const trimmed = email.trim().toLowerCase();
  if (trimmed && !trimmed.endsWith("@kindle.com")) {
    return { ok: false, error: "must be a @kindle.com address" };
  }
  await db.update(users).set({ kindleEmail: trimmed || null }).where(eq(users.id, user.id));
  return { ok: true };
}
