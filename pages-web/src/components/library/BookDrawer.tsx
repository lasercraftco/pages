"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  CheckCheck,
  Download,
  Headphones,
  Mail,
  Send,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";

import { formatDuration, formatPages, timeToFinish } from "@/lib/utils";
import type { LibraryBook } from "@/lib/library/queries";

export function BookDrawer({
  book,
  onClose,
}: {
  book: LibraryBook | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {book ? (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-bg-2/95 px-6 py-8 md:px-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold leading-tight">{book.title}</h1>
              <button
                type="button"
                aria-label="close"
                className="rounded-full p-2 transition hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {book.authorName ? (
              <p className="mt-1 text-text-dim">
                by{" "}
                <Link
                  href={`/library?author=${encodeURIComponent(book.authorName)}`}
                  className="text-pink hover:underline"
                >
                  {book.authorName}
                </Link>
                {book.narrator ? (
                  <>
                    {" · "}narrated by <span className="text-text-dim">{book.narrator}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            {book.seriesName ? (
              <p className="mt-1 text-sm text-gold">
                {book.seriesName}
                {book.seriesIndex != null ? ` #${book.seriesIndex}` : ""}
              </p>
            ) : null}

            <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-auto w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-surface text-text-faint">
                  no cover
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  {book.hasEbook ? (
                    <PrimaryAction href={`/read/${book.id}`} icon={<BookOpen />}>
                      Read
                    </PrimaryAction>
                  ) : null}
                  {book.hasAudiobook ? (
                    <PrimaryAction href={`/listen/${book.id}`} tone="cyan" icon={<Headphones />}>
                      Listen
                    </PrimaryAction>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Length">
                    {book.hasAudiobook
                      ? formatDuration(book.durationSeconds)
                      : formatPages(book.pageCount)}
                  </Stat>
                  <Stat label="Progress">{Math.round((book.progress ?? 0) * 100)}%</Stat>
                  {book.hasEbook && book.pageCount ? (
                    <Stat label="Time to finish">
                      {timeToFinish(
                        Math.round((book.pageCount * 250) * (1 - (book.progress ?? 0))),
                      )}
                    </Stat>
                  ) : null}
                  <Stat label="Status">{book.status}</Stat>
                </div>

                {book.summary ? (
                  <p className="text-sm leading-relaxed text-text-dim">{book.summary}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  <SecondaryAction icon={<Mail className="h-4 w-4" />} href={`/api/send-to-kindle/${book.id}`}>
                    Send to Kindle
                  </SecondaryAction>
                  <SecondaryAction
                    icon={<Send className="h-4 w-4" />}
                    href={`/api/share/${book.id}`}
                  >
                    Share link
                  </SecondaryAction>
                  <SecondaryAction
                    icon={<Download className="h-4 w-4" />}
                    href={`/api/engine/file/${book.id}?format=epub`}
                  >
                    Download EPUB
                  </SecondaryAction>
                  <SecondaryAction icon={<Bookmark className="h-4 w-4" />} href="#">
                    Want to read
                  </SecondaryAction>
                  <SecondaryAction icon={<CheckCheck className="h-4 w-4" />} href="#">
                    Mark finished
                  </SecondaryAction>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PrimaryAction({
  href,
  icon,
  children,
  tone = "pink",
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "pink" | "cyan";
}) {
  const cls =
    tone === "cyan"
      ? "bg-cyan text-bg shadow-[0_0_30px_-8px_rgba(0,230,255,0.6)] hover:bg-cyan/90"
      : "bg-pink text-white shadow-[0_0_30px_-8px_rgba(255,46,147,0.7)] hover:bg-pink-strong";
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${cls}`}
    >
      <span className="h-4 w-4 [&>*]:h-4 [&>*]:w-4">{icon}</span>
      {children}
    </Link>
  );
}

function SecondaryAction({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-text-dim transition hover:border-white/30 hover:text-white"
    >
      {icon}
      {children}
    </Link>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-faint">{label}</div>
      <div className="mt-1 text-sm text-white">{children}</div>
    </div>
  );
}
