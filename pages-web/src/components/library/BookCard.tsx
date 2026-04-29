"use client";

import { motion } from "framer-motion";
import { BookOpen, Headphones, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn, formatDuration, formatPages } from "@/lib/utils";
import type { LibraryBook } from "@/lib/library/queries";

export function BookCard({ book, onOpen }: { book: LibraryBook; onOpen?: (b: LibraryBook) => void }) {
  const ratio = Math.min(1, Math.max(0, book.progress));
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = !!book.coverUrl && !coverFailed;
  return (
    <motion.button
      layout
      type="button"
      onClick={() => onOpen?.(book)}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="group flex w-full flex-col text-left"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl ?? undefined}
            alt={book.title}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="cover h-full w-full object-cover"
            style={book.coverColor ? { backgroundColor: book.coverColor } : undefined}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center bg-surface px-3 text-center"
            style={book.coverColor ? { backgroundColor: book.coverColor } : undefined}
          >
            <span className="brand-wordmark text-2xl">{book.title.slice(0, 2).toUpperCase()}</span>
            <span className="mt-2 line-clamp-3 text-xs text-text-dim">{book.title}</span>
          </div>
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
          {book.hasEbook ? <Pill tone="pink" icon={<BookOpen className="h-3 w-3" />}>read</Pill> : null}
          {book.hasAudiobook ? <Pill tone="cyan" icon={<Headphones className="h-3 w-3" />}>listen</Pill> : null}
        </div>
        {ratio > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className={cn(
                "h-full",
                book.status === "finished" ? "bg-up" : "bg-pink shadow-[0_0_16px_rgba(255,46,147,0.7)]",
              )}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-white">{book.title}</div>
      {book.authorName ? (
        <div className="mt-1 line-clamp-1 text-xs text-text-dim">{book.authorName}</div>
      ) : null}
      <div className="mt-1 text-[10px] uppercase tracking-wider text-text-faint">
        {book.hasAudiobook ? formatDuration(book.durationSeconds) : formatPages(book.pageCount)}
      </div>
    </motion.button>
  );
}

function Pill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "pink" | "cyan" | "gold";
  icon?: React.ReactNode;
}) {
  const tones = {
    pink: "bg-pink/85 text-white border-pink",
    cyan: "bg-cyan/85 text-bg border-cyan",
    gold: "bg-gold/85 text-bg border-gold",
  };
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-md",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
