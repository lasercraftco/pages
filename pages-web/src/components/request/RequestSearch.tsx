"use client";

import { useState, useTransition } from "react";
import { Check, Download, Loader2, Search as SearchIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { requestBook, searchExternal } from "@/lib/server-actions/requests";
import { cn } from "@/lib/utils";

type SearchResult = {
  source: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  publishedDate?: string | number | null;
  description?: string | null;
};

export function RequestSearch({
  viewer,
}: {
  viewer: { firstName: string; isOwner: boolean; dailyQuota: number };
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function go() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await searchExternal(q);
      setResults(r.results as unknown as SearchResult[]);
    } finally {
      setSearching(false);
    }
  }

  async function ask(item: SearchResult) {
    const key = `${item.source}-${item.isbn13 ?? item.title}`;
    setRequesting(key);
    startTransition(async () => {
      const res = await requestBook({
        title: item.title,
        author: item.author ?? undefined,
        isbn13: item.isbn13 ?? undefined,
        coverUrl: item.coverUrl ?? undefined,
        source: item as unknown as Record<string, unknown>,
        // Foreign book id: prefer ISBN; Readarr's lookup endpoint can resolve
        foreignBookId: item.isbn13 ?? item.isbn10 ?? undefined,
      });
      setRequesting(null);
      if (res.ok) {
        toast.success(`requested! we'll grab "${item.title}" via Readarr`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="glass flex items-center gap-3 p-3">
        <SearchIcon className="h-5 w-5 text-text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="search by title, author, isbn…"
          className="w-full bg-transparent text-base outline-none"
        />
        <button
          type="button"
          onClick={go}
          disabled={searching}
          className="rounded-full bg-pink px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-strong disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "search"}
        </button>
      </div>

      <p className="mt-2 text-xs text-text-faint">
        {viewer.isOwner ? (
          <>You're the owner — no rate limit.</>
        ) : (
          <>
            {viewer.firstName}, you can request up to {viewer.dailyQuota} books per day. Your
            requests fulfill automatically via Readarr.
          </>
        )}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((item, i) => (
          <ResultCard
            key={`${item.source}-${item.isbn13 ?? item.title}-${i}`}
            item={item}
            requesting={requesting === `${item.source}-${item.isbn13 ?? item.title}`}
            onRequest={() => ask(item)}
          />
        ))}
      </div>

      {!results.length && !searching ? (
        <div className="glass mt-12 flex flex-col items-center justify-center p-12 text-center">
          <Sparkles className="mb-4 h-10 w-10 text-pink" />
          <p className="text-text-dim">
            Search any title and we'll pull it in. Tyler's family stack handles the rest.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ResultCard({
  item,
  onRequest,
  requesting,
}: {
  item: SearchResult;
  onRequest: () => void;
  requesting: boolean;
}) {
  return (
    <div className="glass flex gap-4 p-4">
      {item.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverUrl}
          alt={item.title}
          className="h-32 w-20 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-32 w-20 shrink-0 rounded bg-surface" />
      )}
      <div className="flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        {item.author ? <p className="mt-1 text-xs text-text-dim">{item.author}</p> : null}
        {item.publishedDate ? (
          <p className="text-[11px] text-text-faint">{item.publishedDate}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-[10px] uppercase tracking-wider text-text-faint">
            {item.source.replace("_", " ")}
          </span>
          <button
            type="button"
            onClick={onRequest}
            disabled={requesting}
            className={cn(
              "flex items-center gap-1 rounded-full bg-pink px-3 py-1 text-xs font-semibold text-white transition hover:bg-pink-strong",
              requesting ? "opacity-60" : "",
            )}
          >
            {requesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {requesting ? "requesting…" : "request"}
          </button>
        </div>
      </div>
    </div>
  );
}
