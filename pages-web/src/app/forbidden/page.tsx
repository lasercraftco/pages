import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="grid min-h-dvh place-items-center px-8 text-center">
      <div>
        <h1 className="brand-wordmark text-5xl">Hold up</h1>
        <p className="mt-3 text-text-dim">That part of Pages is for the owner only.</p>
        <Link href="/library" className="mt-6 inline-block text-pink hover:underline">
          ← back to your library
        </Link>
      </div>
    </main>
  );
}
