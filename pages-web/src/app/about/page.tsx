import Link from "next/link";

import { BRAND } from "@/lib/brand";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="brand-wordmark text-5xl">
        {BRAND.name}
      </Link>
      <p className="mt-2 text-text-dim">{BRAND.tagline}.</p>

      <article className="mt-10 space-y-5 text-text-dim">
        <p>
          Pages is the unified ebook + audiobook library for the {" "}
          <Link href={BRAND.family.portal} className="text-pink hover:underline">
            tyflix
          </Link>{" "}
          family. It replaces Kavita and Audiobookshelf with a single home for everything you read
          or listen to.
        </p>
        <p>
          Sign in with your first name. Owner is whoever the family configured at deploy time;
          everyone else lands as a friend with the same library, plus the right to request books
          that get fulfilled automatically through Readarr.
        </p>
        <p>
          Browser reader for EPUB / PDF / comics. Browser audio player with chapters, variable
          speed, sleep timer, AirPlay-friendly media-session metadata. Read or listen — Pages tracks
          progress per device and switches fluidly. Send to Kindle, Kobo, Apple Books, or download
          a converted file.
        </p>
        <p>
          Same stack as {" "}
          <Link href={BRAND.family.genome} className="text-pink hover:underline">Genome</Link>{" "},
          {" "}
          <Link href={BRAND.family.reel} className="text-pink hover:underline">Reel</Link>{" "}
          and{" "}
          <Link href={BRAND.family.karaoke} className="text-pink hover:underline">Karaoke</Link>.
          Same SSO. Different shelf.
        </p>
      </article>
    </main>
  );
}
