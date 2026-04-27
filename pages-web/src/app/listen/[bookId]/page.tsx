import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth/session";
import { getBookDetail } from "@/lib/library/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookId: string }>;

export default async function ListenPage({ params }: { params: Params }) {
  const user = await requireUser();
  const { bookId } = await params;
  const detail = await getBookDetail(user.id, bookId);
  if (!detail) notFound();

  // Pick the first audiobook file (m4b preferred for chapters).
  const audioFile =
    detail.files.find((f) => f.kind === "audiobook" && f.format === "m4b") ??
    detail.files.find((f) => f.kind === "audiobook");
  if (!audioFile) notFound();

  const initialProgress = detail.progress.find((p) => p.fileId === audioFile.id) ?? null;
  const chapters = (audioFile.chapters as { index: number; title: string; startSeconds: number; endSeconds: number }[]) ?? [];

  return (
    <AppShell user={user}>
      <AudioPlayer
        book={{
          id: detail.book.id,
          title: detail.book.title,
          authorName: detail.author?.name ?? null,
          narrator: detail.book.narrator,
          coverUrl: detail.book.coverUrl,
        }}
        file={{
          id: audioFile.id,
          format: audioFile.format,
          durationSeconds: audioFile.durationSeconds ?? 0,
          chapters,
          streamUrl: `/api/engine/stream/${audioFile.id}`,
        }}
        initialPositionSeconds={initialProgress?.positionSeconds ?? 0}
      />
    </AppShell>
  );
}
