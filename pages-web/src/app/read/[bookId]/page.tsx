import { notFound } from "next/navigation";

import { Reader } from "@/components/reader/Reader";
import { requireUser } from "@/lib/auth/session";
import { getBookDetail } from "@/lib/library/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookId: string }>;

export default async function ReadPage({ params }: { params: Params }) {
  const user = await requireUser();
  const { bookId } = await params;
  const detail = await getBookDetail(user.id, bookId);
  if (!detail) notFound();

  // Pick the best ebook file: prefer EPUB, then PDF, then anything else convertible.
  const ebookFile =
    detail.files.find((f) => f.kind === "ebook" && f.format === "epub") ??
    detail.files.find((f) => f.kind === "ebook" && f.format === "pdf") ??
    detail.files.find((f) => f.kind === "ebook");

  if (!ebookFile) notFound();

  const initialProgress = detail.progress.find((p) => p.fileId === ebookFile.id) ?? null;

  return (
    <Reader
      user={{ id: user.id, firstName: user.firstName, readingSpeedWpm: user.readingSpeedWpm }}
      book={{
        id: detail.book.id,
        title: detail.book.title,
        authorName: detail.author?.name ?? null,
        coverUrl: detail.book.coverUrl,
      }}
      file={{
        id: ebookFile.id,
        format: ebookFile.format,
        url: `/api/engine/file/${ebookFile.id}`,
      }}
      initialCfi={initialProgress?.cfi ?? null}
      initialProgress={initialProgress?.progress ?? 0}
    />
  );
}
