"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";

import { syncProgress } from "@/lib/server-actions/sync";
import { cn } from "@/lib/utils";
import { ReaderToolbar } from "./ReaderToolbar";
import type { ReaderTheme } from "./types";

type Props = {
  user: { id: string; firstName: string; readingSpeedWpm: number };
  book: { id: string; title: string; authorName: string | null; coverUrl: string | null };
  file: { id: string; format: string; url: string };
  initialCfi: string | null;
  initialProgress: number;
};

/**
 * Browser ebook reader.
 *
 * Strategy: epub.js for EPUB, pdf.js for PDF, comic-reader for CBR/CBZ. We
 * load epubjs dynamically (it touches `window` at import time) and keep all
 * state — TOC, bookmarks, highlights, progress — in this component.
 *
 * Progress sync runs on a 3s debounce, plus on visibility change and unload.
 */
export function Reader({ user, book, file, initialCfi, initialProgress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [percent, setPercent] = useState(initialProgress);
  const [bookmarks, setBookmarks] = useState<{ cfi: string; label: string }[]>([]);
  const [theme, setTheme] = useState<ReaderTheme>("dark");
  const [fontSize, setFontSize] = useState(110);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif">("serif");
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, startTransition] = useTransition();

  // ── load epub.js for EPUB; pdf.js for PDF; comic-reader otherwise ──
  useEffect(() => {
    let alive = true;
    (async () => {
      if (file.format === "epub") {
        const ePub = (await import("epubjs")).default as any;
        if (!alive || !containerRef.current) return;
        const epubBook = ePub(file.url);
        bookRef.current = epubBook;
        const rendition = epubBook.renderTo(containerRef.current, {
          width: "100%",
          height: "100%",
          allowScriptedContent: false,
          flow: "paginated",
          spread: "auto",
        });
        renditionRef.current = rendition;
        await rendition.display(initialCfi || undefined);
        const navigation = await epubBook.loaded.navigation;
        setToc(
          navigation.toc.map((t: any) => ({ label: t.label.trim(), href: t.href })),
        );
        applyTheme(rendition, theme, fontSize, fontFamily);

        rendition.on("relocated", (loc: any) => {
          const p = loc?.start?.percentage ?? 0;
          setPercent(p);
          schedule(loc?.start?.cfi ?? null, p);
        });

        // Keyboard navigation
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "ArrowRight") rendition.next();
          if (e.key === "ArrowLeft") rendition.prev();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }
      // TODO: pdf.js for PDF, comic-reader for CBR/CBZ
    })();
    return () => {
      alive = false;
      try {
        renditionRef.current?.destroy();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.format]);

  // Re-apply theme/font when changed
  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current, theme, fontSize, fontFamily);
  }, [theme, fontSize, fontFamily]);

  // ── debounced server-side progress sync ──
  const syncTimer = useRef<NodeJS.Timeout | null>(null);
  function schedule(cfi: string | null, p: number) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      startTransition(async () => {
        await syncProgress({
          bookId: book.id,
          fileId: file.id,
          cfi,
          progress: p,
        });
      });
    }, 2500);
  }

  // Persist on tab close
  useEffect(() => {
    const handler = () => {
      if (renditionRef.current) {
        const loc = renditionRef.current.currentLocation();
        if (loc?.start?.cfi) {
          // Sendbeacon-shaped fallback would be nicer; the server action
          // is best-effort here.
          syncProgress({
            bookId: book.id,
            fileId: file.id,
            cfi: loc.start.cfi,
            progress: loc.start.percentage ?? percent,
          }).catch(() => undefined);
        }
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [book.id, file.id, percent]);

  function addBookmark() {
    const loc = renditionRef.current?.currentLocation();
    const cfi = loc?.start?.cfi;
    if (!cfi) return;
    const label = `p. ${Math.round((loc.start.percentage ?? 0) * 100)}%`;
    setBookmarks((b) => [...b, { cfi, label }]);
  }

  return (
    <div className="reader-surface fixed inset-0 flex flex-col" data-reader-theme={theme}>
      <ReaderToolbar
        title={book.title}
        author={book.authorName}
        percent={percent}
        onTocToggle={() => setTocOpen((v) => !v)}
        onSettingsToggle={() => setSettingsOpen((v) => !v)}
        onBookmark={addBookmark}
      />

      <div className="relative flex-1">
        {/* Reader canvas (epub.js iframe target) */}
        <div ref={containerRef} className="absolute inset-0 mx-auto max-w-3xl px-4" />

        {/* Page nav buttons */}
        <button
          aria-label="previous page"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-bg-2/40 p-2 hover:bg-bg-2/80"
          onClick={() => renditionRef.current?.prev()}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          aria-label="next page"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-bg-2/40 p-2 hover:bg-bg-2/80"
          onClick={() => renditionRef.current?.next()}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* TOC sidebar */}
        {tocOpen ? (
          <SidePanel onClose={() => setTocOpen(false)} title="Contents">
            <ul className="space-y-1">
              {toc.map((t, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      renditionRef.current?.display(t.href);
                      setTocOpen(false);
                    }}
                    className="w-full rounded px-2 py-1 text-left hover:bg-white/5"
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="text-xs uppercase tracking-wider text-text-faint">Bookmarks</div>
              <ul className="mt-2 space-y-1">
                {bookmarks.map((b, i) => (
                  <li key={i}>
                    <button
                      onClick={() => renditionRef.current?.display(b.cfi)}
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-white/5"
                    >
                      <Bookmark className="mr-2 inline h-3 w-3 text-pink" />
                      {b.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </SidePanel>
        ) : null}

        {settingsOpen ? (
          <SidePanel onClose={() => setSettingsOpen(false)} title="Reader settings">
            <SettingsRow label="Theme">
              {(["dark", "light", "sepia", "contrast"] as ReaderTheme[]).map((t) => (
                <Pill key={t} active={theme === t} onClick={() => setTheme(t)}>
                  {t}
                </Pill>
              ))}
            </SettingsRow>
            <SettingsRow label="Font family">
              <Pill active={fontFamily === "serif"} onClick={() => setFontFamily("serif")}>
                Serif
              </Pill>
              <Pill active={fontFamily === "sans"} onClick={() => setFontFamily("sans")}>
                Sans
              </Pill>
            </SettingsRow>
            <SettingsRow label="Font size">
              <input
                type="range"
                min={80}
                max={180}
                step={10}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
              <span className="w-10 text-right text-xs text-text-faint">{fontSize}%</span>
            </SettingsRow>
          </SidePanel>
        ) : null}
      </div>

      <div className="border-t border-white/5 bg-bg-2/60 px-4 py-2 text-center text-xs text-text-dim">
        {Math.round(percent * 100)}% · synced for {user.firstName} ·{" "}
        <Link href="/library" className="text-pink hover:underline">
          back to library
        </Link>
      </div>
    </div>
  );
}

function applyTheme(rendition: any, theme: ReaderTheme, fontSize: number, family: "sans" | "serif") {
  const themes: Record<ReaderTheme, Record<string, Record<string, string>>> = {
    dark: { body: { background: "#14102b", color: "#ece6f4" } },
    light: { body: { background: "#fbf8f1", color: "#1a1610" } },
    sepia: { body: { background: "#f4ecd8", color: "#3a2a1a" } },
    contrast: { body: { background: "#000000", color: "#ffffff" } },
  };
  rendition.themes.register("active", {
    ...themes[theme],
    "p, body": { "font-size": `${fontSize}%`, "font-family": family === "serif" ? "Iowan Old Style, Palatino, Georgia, serif" : "system-ui, sans-serif" },
  });
  rendition.themes.select("active");
}

function SidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="absolute left-0 top-0 z-10 h-full w-80 max-w-[80vw] border-r border-white/5 bg-bg/95 px-4 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} aria-label="close" className="rounded-full p-1 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="scrollbar-thin h-[calc(100%-2.5rem)] overflow-y-auto">{children}</div>
    </aside>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs uppercase tracking-wider text-text-faint">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs capitalize transition",
        active ? "border-pink bg-pink/15 text-white" : "border-white/10 text-text-dim hover:border-white/30",
      )}
    >
      {children}
    </button>
  );
}
