"use client";

import { cn, formatDuration } from "@/lib/utils";

type Chapter = { index: number; title: string; startSeconds: number; endSeconds: number };

export function ChapterList({
  chapters,
  position,
  onJump,
}: {
  chapters: Chapter[];
  position: number;
  onJump: (s: number) => void;
}) {
  if (chapters.length === 0) {
    return (
      <aside className="glass p-6 text-sm text-text-dim">
        This file has no embedded chapter markers. Skip 30s with the transport buttons or click
        anywhere on the scrubber.
      </aside>
    );
  }
  return (
    <aside className="glass p-2">
      <div className="px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-text-faint">
        Chapters · {chapters.length}
      </div>
      <ul className="scrollbar-thin max-h-[70vh] space-y-0.5 overflow-y-auto">
        {chapters.map((c) => {
          const active = position >= c.startSeconds && position < c.endSeconds;
          return (
            <li key={c.index}>
              <button
                type="button"
                onClick={() => onJump(c.startSeconds)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition",
                  active
                    ? "bg-pink/15 text-white"
                    : "text-text-dim hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="line-clamp-1 text-sm">{c.title}</span>
                <span className="ml-3 shrink-0 text-[11px] text-text-faint">
                  {formatDuration(c.endSeconds - c.startSeconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
