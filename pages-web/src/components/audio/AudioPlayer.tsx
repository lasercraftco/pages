"use client";

import { motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Cast,
  Moon,
  Pause,
  Play,
  Rewind,
  FastForward,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { syncProgress } from "@/lib/server-actions/sync";
import { cn, formatDuration } from "@/lib/utils";
import { ChapterList } from "./ChapterList";
import { SleepTimer } from "./SleepTimer";

type Chapter = { index: number; title: string; startSeconds: number; endSeconds: number };

type Props = {
  book: {
    id: string;
    title: string;
    authorName: string | null;
    narrator: string | null;
    coverUrl: string | null;
  };
  file: {
    id: string;
    format: string;
    durationSeconds: number;
    chapters: Chapter[];
    streamUrl: string;
  };
  initialPositionSeconds: number;
};

export function AudioPlayer({ book, file, initialPositionSeconds }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(initialPositionSeconds);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [castOpen, setCastOpen] = useState(false);
  const [, startTransition] = useTransition();

  // ── set up media-session metadata for lockscreen / AirPlay route picker ──
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: book.title,
        artist: book.authorName ?? "",
        album: book.narrator ? `narrated by ${book.narrator}` : "",
        artwork: book.coverUrl
          ? [{ src: book.coverUrl, sizes: "512x512", type: "image/jpeg" }]
          : undefined,
      });
      const a = audioRef.current;
      navigator.mediaSession.setActionHandler("play", () => a?.play());
      navigator.mediaSession.setActionHandler("pause", () => a?.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => a && (a.currentTime = Math.max(0, a.currentTime - 30)));
      navigator.mediaSession.setActionHandler("seekforward", () => a && (a.currentTime = a.currentTime + 30));
      navigator.mediaSession.setActionHandler("previoustrack", () => skipChapter(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => skipChapter(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  // ── seek to initial position once metadata loads ──
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    function onLoaded() {
      if (initialPositionSeconds > 0 && a) a.currentTime = initialPositionSeconds;
    }
    a.addEventListener("loadedmetadata", onLoaded);
    return () => a.removeEventListener("loadedmetadata", onLoaded);
  }, [initialPositionSeconds]);

  // ── debounced progress sync ──
  const syncTimer = useRef<NodeJS.Timeout | null>(null);
  function schedule(pos: number) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const dur = file.durationSeconds || audioRef.current?.duration || 1;
      startTransition(async () => {
        await syncProgress({
          bookId: book.id,
          fileId: file.id,
          positionSeconds: pos,
          progress: pos / dur,
        });
      });
    }, 3000);
  }

  function skip(seconds: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(file.durationSeconds || a.duration, a.currentTime + seconds));
  }

  function skipChapter(direction: -1 | 1) {
    if (!file.chapters.length) {
      skip(direction * 30);
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    const i = file.chapters.findIndex((c) => a.currentTime < c.endSeconds);
    const target = file.chapters[Math.min(file.chapters.length - 1, Math.max(0, i + direction))];
    if (target) a.currentTime = target.startSeconds;
  }

  function jumpTo(seconds: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = seconds;
  }

  const currentChapter = useMemo(() => {
    return file.chapters.find((c) => position >= c.startSeconds && position < c.endSeconds);
  }, [file.chapters, position]);

  const remaining = file.durationSeconds - position;

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      {/* Now playing */}
      <section className="glass-strong p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img
              layoutId={`cover-${book.id}`}
              src={book.coverUrl}
              alt={book.title}
              className={cn(
                "aspect-[2/3] w-full rounded-xl object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]",
                playing ? "pulse" : "",
              )}
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-surface text-text-faint">
              no cover
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold leading-tight">{book.title}</h1>
            {book.authorName ? (
              <p className="mt-1 text-text-dim">by {book.authorName}</p>
            ) : null}
            {book.narrator ? (
              <p className="text-sm text-text-faint">narrated by {book.narrator}</p>
            ) : null}
            {currentChapter ? (
              <p className="mt-3 text-sm text-cyan">{currentChapter.title}</p>
            ) : null}

            {/* Scrubber */}
            <div className="mt-6">
              <input
                type="range"
                min={0}
                max={file.durationSeconds || 1}
                step={1}
                value={position}
                onChange={(e) => jumpTo(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[11px] text-text-faint">
                <span>{formatDuration(position)}</span>
                <span>−{formatDuration(remaining)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => skipChapter(-1)}
                className="rounded-full p-2 text-text-dim hover:text-white"
                aria-label="previous chapter"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => skip(-30)}
                className="rounded-full p-2 text-text-dim hover:text-white"
                aria-label="back 30 seconds"
              >
                <Rewind className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label={playing ? "pause" : "play"}
                onClick={() => {
                  const a = audioRef.current;
                  if (!a) return;
                  if (playing) a.pause();
                  else a.play();
                }}
                className="grid h-16 w-16 place-items-center rounded-full bg-pink text-white shadow-[0_0_40px_-8px_rgba(255,46,147,0.7)] transition hover:bg-pink-strong"
              >
                {playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
              </button>
              <button
                type="button"
                onClick={() => skip(30)}
                className="rounded-full p-2 text-text-dim hover:text-white"
                aria-label="forward 30 seconds"
              >
                <FastForward className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => skipChapter(1)}
                className="rounded-full p-2 text-text-dim hover:text-white"
                aria-label="next chapter"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Speed + volume + extras */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <SpeedControl speed={speed} setSpeed={setSpeed} audioRef={audioRef} />
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-text-faint" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="w-24"
                />
              </div>
              <SleepTimer audioRef={audioRef} chapter={currentChapter ?? null} />
              <button
                type="button"
                onClick={() => setCastOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-text-dim transition hover:border-cyan/50 hover:text-cyan"
              >
                <Cast className="h-4 w-4" />
                AirPlay
              </button>
            </div>
            {castOpen ? (
              <p className="mt-3 text-xs text-text-faint">
                Use the system AirPlay picker (Control Center on iOS / iPadOS, sound menu on macOS)
                to route this audio to your HomePod, Apple TV, or AirPlay-compatible speaker. Music
                Assistant integration arrives in Phase 8.
              </p>
            ) : null}
          </div>
        </div>

        <audio
          ref={audioRef}
          src={file.streamUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const t = (e.currentTarget as HTMLAudioElement).currentTime;
            setPosition(t);
            schedule(t);
          }}
          onRateChange={(e) => setSpeed((e.currentTarget as HTMLAudioElement).playbackRate)}
        />
      </section>

      {/* Sidebar — chapters + bookmarks */}
      <ChapterList chapters={file.chapters} position={position} onJump={jumpTo} />
    </div>
  );
}

function SpeedControl({
  speed,
  setSpeed,
  audioRef,
}: {
  speed: number;
  setSpeed: (s: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  const presets = [0.75, 1, 1.25, 1.5, 2];
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-faint">Speed</label>
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setSpeed(p);
              if (audioRef.current) audioRef.current.playbackRate = p;
            }}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              speed === p ? "bg-pink text-white" : "border border-white/10 text-text-dim hover:border-white/30",
            )}
          >
            {p}×
          </button>
        ))}
      </div>
    </div>
  );
}
