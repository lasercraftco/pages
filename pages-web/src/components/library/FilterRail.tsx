"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BookOpen, Headphones, Library as LibraryIcon, Search as SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function FilterRail() {
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`/library?${next.toString()}`));
  }

  const kind = sp.get("kind") ?? "any";
  const status = sp.get("status") ?? "all";
  const sort = sp.get("sort") ?? "added";
  const q = sp.get("q") ?? "";

  return (
    <aside className="glass sticky top-24 h-fit w-full p-5 lg:w-72">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          type="search"
          placeholder="search title, author, series…"
          defaultValue={q}
          onChange={(e) => set("q", e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-bg-2/60 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-pink"
        />
      </div>

      <Section title="Format" rightHint={pending ? "…" : null}>
        <Chips
          value={kind}
          onChange={(v) => set("kind", v === "any" ? null : v)}
          options={[
            { value: "any", label: "All", icon: <LibraryIcon className="h-3.5 w-3.5" /> },
            { value: "ebook", label: "Read", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { value: "audiobook", label: "Listen", icon: <Headphones className="h-3.5 w-3.5" /> },
          ]}
        />
      </Section>

      <Section title="Status">
        <Chips
          value={status}
          onChange={(v) => set("status", v === "all" ? null : v)}
          options={[
            { value: "all", label: "All" },
            { value: "currently", label: "Currently" },
            { value: "want", label: "Want" },
            { value: "finished", label: "Finished" },
            { value: "dnf", label: "DNF" },
          ]}
        />
      </Section>

      <Section title="Sort">
        <Chips
          value={sort}
          onChange={(v) => set("sort", v === "added" ? null : v)}
          options={[
            { value: "added", label: "Recently added" },
            { value: "recently_read", label: "Recently read" },
            { value: "title", label: "Title" },
            { value: "author", label: "Author" },
          ]}
        />
      </Section>
    </aside>
  );
}

function Section({
  title,
  rightHint,
  children,
}: {
  title: string;
  rightHint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-text-faint">
        <span>{title}</span>
        {rightHint ? <span className="text-text-faint/70">{rightHint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition",
            value === opt.value
              ? "border-pink bg-pink/15 text-white"
              : "border-white/10 bg-bg-2/60 text-text-dim hover:border-white/30 hover:text-white",
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
