/**
 * Thin client for the FastAPI pages-engine.
 *
 * In the browser, requests go through /api/engine/* (rewritten by Next.js).
 * In SSR, we hit PAGES_ENGINE_URL directly (Docker network DNS).
 */

const SSR_BASE = process.env.PAGES_ENGINE_URL ?? "http://localhost:8003";
const BROWSER_BASE = "/api/engine";

function base() {
  return typeof window === "undefined" ? SSR_BASE : BROWSER_BASE;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${base()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`engine ${res.status} ${path}: ${body}`);
  }
  return (await res.json()) as T;
}

export const engine = {
  health: () => request<{ ok: boolean; version: string }>("/healthz"),
  scanFull: () => request<{ jobId: string }>("/scan/full", { method: "POST" }),
  scanPath: (path: string) =>
    request<{ jobId: string }>("/scan/path", { method: "POST", body: JSON.stringify({ path }) }),
  searchExternal: (q: string) =>
    request<{
      results: Array<{
        source: string;
        title: string;
        author?: string;
        coverUrl?: string;
        isbn13?: string;
        asin?: string;
        kind?: "ebook" | "audiobook";
      }>;
    }>(`/search/external?q=${encodeURIComponent(q)}`),
  convert: (fileId: string, target: "epub" | "mobi" | "pdf" | "azw3") =>
    request<{ url: string; expiresAt: string }>(`/convert/${fileId}/${target}`, { method: "POST" }),
  sendToKindle: (fileId: string, email: string) =>
    request<{ ok: boolean }>("/export/kindle", {
      method: "POST",
      body: JSON.stringify({ fileId, email }),
    }),
  shareLink: (fileId: string, ttlHours = 24) =>
    request<{ url: string; expiresAt: string }>(
      `/share/${fileId}?ttl=${ttlHours}`,
      { method: "POST" },
    ),
  audioStreamUrl: (fileId: string) => `${BROWSER_BASE}/stream/${fileId}`,
  fileDownloadUrl: (fileId: string, format?: string) =>
    format
      ? `${BROWSER_BASE}/file/${fileId}?format=${format}`
      : `${BROWSER_BASE}/file/${fileId}`,
};
