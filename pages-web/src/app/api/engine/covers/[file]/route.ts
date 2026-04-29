/**
 * Pass-through proxy for cover images served by the engine. Covers are
 * cached on the engine side; this route just gives the browser a same-origin
 * URL.
 */
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
