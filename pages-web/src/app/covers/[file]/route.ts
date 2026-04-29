/**
 * Public cover-image proxy. The engine writes book.cover_url as
 * `/covers/<sha>.jpg`; this route fetches that file from the engine over the
 * internal network and streams it back. Kept on the same `/covers/...` path
 * the engine emits so we don't have to backfill the DB.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const target = `${process.env.PAGES_ENGINE_URL ?? "http://localhost:8003"}/covers/${file}`;
  const r = await fetch(target);
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.body, {
    headers: {
      "content-type": r.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
