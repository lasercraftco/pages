"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";

import { cn } from "@/lib/utils";

type Chapter = { index: number; title: string; startSeconds: number; endSeconds: number };

const PRESETS_MIN = [5, 10, 15, 30, 45, 60];

export function SleepTimer({
  audioRef,
  chapter,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  chapter: Chapter | null;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<{ kind: "duration" | "chapter"; ts: number } | null>(null);

  // Tick every second; pause when target reached.
  useEffect(() => {
    if (!armed) return;
    const id = setInterval(() => {
      if (armed.kind === "duration" && Date.now() >= armed.ts) {
        audioRef.current?.pause();
        setArmed(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [armed, audioRef]);

  // End-of-chapter sleep — stop when current chapter ends
  useEffect(() => {
    if (armed?.kind !== "chapter" || !chapter) return;
    const a = audioRef.current;
    if (!a) return;
    function tick() {
      if (a && chapter && a.currentTime >= chapter.endSeconds) {
        a.pause();
        setArmed(null);
      }
    }
    a.addEventListener("timeupdate", tick);
    return () => a.removeEventListener("timeupdate", tick);
  }, [armed, chapter, audioRef]);

  function arm(minutes: number) {
    setArmed({ kind: "duration", ts: Date.now() + minutes * 60_000 });
    setOpen(false);
  }
  function armChapter() {
    setArmed({ kind: "chapter", ts: 0 });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 transition",
          armed ? "border-pink/60 text-pink" : "text-text-dim hover:text-white",
        )}
      >
        <Moon className="h-4 w-4" />
        <span>{armed ? (armed.kind === "chapter" ? "End of chapter" : countdownLabel(armed.ts)) : "Sleep"}</span>
      </button>
      {open ? (
        <div className="glass-strong absolute right-0 top-full z-10 mt-2 w-44 p-2 text-sm">
          {PRESETS_MIN.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => arm(m)}
              className="w-full rounded-md px-3 py-1.5 text-left transition hover:bg-white/5"
            >
              {m} minutes
            </button>
          ))}
          <button
            type="button"
            onClick={armChapter}
            className="w-full rounded-md px-3 py-1.5 text-left transition hover:bg-white/5"
          >
            End of chapter
          </button>
          {armed ? (
            <button
              type="button"
              onClick={() => setArmed(null)}
              className="mt-1 w-full rounded-md px-3 py-1.5 text-left text-down transition hover:bg-down/10"
            >
              Cancel sleep
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function countdownLabel(ts: number): string {
  const remaining = Math.max(0, Math.round((ts - Date.now()) / 60_000));
  return `${remaining} min`;
}
