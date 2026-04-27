"use client";

import { Bookmark, List, Settings as SettingsIcon, X } from "lucide-react";
import Link from "next/link";

export function ReaderToolbar({
  title,
  author,
  percent,
  onTocToggle,
  onSettingsToggle,
  onBookmark,
}: {
  title: string;
  author: string | null;
  percent: number;
  onTocToggle: () => void;
  onSettingsToggle: () => void;
  onBookmark: () => void;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-white/5 bg-bg-2/70 px-3 py-2 backdrop-blur-xl">
      <Link
        href="/library"
        className="rounded-full p-2 text-text-dim hover:bg-white/5 hover:text-white"
        aria-label="back"
      >
        <X className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={onTocToggle}
        className="rounded-full p-2 text-text-dim hover:bg-white/5 hover:text-white"
        aria-label="contents"
      >
        <List className="h-4 w-4" />
      </button>
      <div className="ml-2 min-w-0 flex-1 truncate">
        <div className="truncate text-sm font-semibold">{title}</div>
        {author ? <div className="truncate text-[11px] text-text-faint">{author}</div> : null}
      </div>
      <div className="hidden text-xs text-text-faint sm:block">{Math.round(percent * 100)}%</div>
      <button
        type="button"
        onClick={onBookmark}
        className="rounded-full p-2 text-text-dim hover:bg-white/5 hover:text-pink"
        aria-label="bookmark this page"
      >
        <Bookmark className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSettingsToggle}
        className="rounded-full p-2 text-text-dim hover:bg-white/5 hover:text-white"
        aria-label="reader settings"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
    </header>
  );
}
