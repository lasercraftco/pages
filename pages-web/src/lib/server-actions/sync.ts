"use server";

/**
 * Reading + listening progress sync. Called by the in-browser reader and
 * audio player roughly every 2-5 seconds (debounced) and on important
 * milestones (chapter end, book end, app close).
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { readingProgress, userBookState, type Book } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";

export type SyncInput = {
  bookId: string;
  fileId: string;
  cfi?: string | null;
  positionSeconds?: number | null;
  progress: number; // 0..1
  deviceId?: string;
};

export async function syncProgress(input: SyncInput): Promise<void> {
  const u = await requireUser();
  const now = new Date();

  const existing = await db.query.readingProgress.findFirst({
    where: and(eq(readingProgress.userId, u.id), eq(readingProgress.fileId, input.fileId)),
  });

  if (existing) {
    await db
      .update(readingProgress)
      .set({
        cfi: input.cfi ?? existing.cfi,
        positionSeconds: input.positionSeconds ?? existing.positionSeconds,
        progress: Math.max(existing.progress, input.progress),
        deviceId: input.deviceId ?? existing.deviceId,
        updatedAt: now,
      })
      .where(eq(readingProgress.id, existing.id));
  } else {
    await db.insert(readingProgress).values({
      userId: u.id,
      bookId: input.bookId,
      fileId: input.fileId,
      cfi: input.cfi ?? null,
      positionSeconds: input.positionSeconds ?? null,
      progress: input.progress,
      deviceId: input.deviceId ?? null,
      updatedAt: now,
    });
  }

  // Auto-flip book state to "currently reading" the first time we see progress;
  // flip to "finished" if progress hits 0.97+.
  const state = await db.query.userBookState.findFirst({
    where: and(eq(userBookState.userId, u.id), eq(userBookState.bookId, input.bookId)),
  });
  const target = input.progress >= 0.97 ? "finished" : "currently";
  if (!state) {
    await db.insert(userBookState).values({
      userId: u.id,
      bookId: input.bookId,
      status: target,
      startedAt: now,
      finishedAt: target === "finished" ? now : null,
    });
  } else if (state.status !== target) {
    await db
      .update(userBookState)
      .set({
        status: target,
        finishedAt: target === "finished" ? now : state.finishedAt,
        updatedAt: now,
      })
      .where(eq(userBookState.id, state.id));
  }
}
