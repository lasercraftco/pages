"use client";

import Link from "next/link";
import { useState } from "react";

import { BookCard } from "./BookCard";
import { BookDrawer } from "./BookDrawer";
import type { LibraryBook } from "@/lib/library/queries";

export function LibraryGrid({ books }: { books: LibraryBook[] }) {
  const [open, setOpen] = useState<LibraryBook | null>(null);

  if (books.length === 0) {
    return (
      <div className="glass mt-6 p-10 text-center text-text-dim">
        Nothing matches that filter yet. Try{" "}
        <Link href="/request" className="text-pink hover:underline">
          requesting a book
        </Link>
        .
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {books.map((b) => (
          <BookCard key={b.id} book={b} onOpen={setOpen} />
        ))}
      </div>
      <BookDrawer book={open} onClose={() => setOpen(null)} />
    </>
  );
}
