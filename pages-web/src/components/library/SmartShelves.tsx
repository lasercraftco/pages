"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { BookCard } from "./BookCard";
import { BookDrawer } from "./BookDrawer";
import type { LibraryBook } from "@/lib/library/queries";

type Props = {
  shelves: {
    currently: LibraryBook[];
    upNext: LibraryBook[];
    recentlyAdded: LibraryBook[];
  };
};

export function SmartShelves({ shelves }: Props) {
  const [open, setOpen] = useState<LibraryBook | null>(null);

  const sections: { title: string; books: LibraryBook[]; tint: "pink" | "cyan" | "gold" }[] = [
    { title: "Currently reading & listening", books: shelves.currently, tint: "pink" },
    { title: "Up next", books: shelves.upNext, tint: "cyan" },
    { title: "Recently added", books: shelves.recentlyAdded, tint: "gold" },
  ];

  return (
    <section className="space-y-10">
      {sections.map((s) =>
        s.books.length === 0 ? null : (
          <div key={s.title}>
            <h2 className={`mb-4 flex items-center gap-2 text-xl font-bold text-${s.tint}`}>
              {s.title}
              <ChevronRight className="h-4 w-4 opacity-50" />
            </h2>
            <div className="scrollbar-thin -mx-1 flex gap-5 overflow-x-auto px-1 pb-2">
              {s.books.map((b) => (
                <div key={b.id} className="w-40 flex-shrink-0 sm:w-44 md:w-48">
                  <BookCard book={b} onOpen={setOpen} />
                </div>
              ))}
            </div>
          </div>
        ),
      )}
      <BookDrawer book={open} onClose={() => setOpen(null)} />
    </section>
  );
}
