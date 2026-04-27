import Link from "next/link";
import { redirect } from "next/navigation";

import { BRAND } from "@/lib/brand";
import { getUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/library");

  return (
    <main className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-12 h-96 w-96 rounded-full bg-pink/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-12 h-96 w-96 rounded-full bg-cyan/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-8 text-center">
        <span className="text-text-faint text-sm uppercase tracking-[0.4em]">
          part of the {" "}
          <Link href={BRAND.family.portal} className="text-pink hover:underline">
            tyflix
          </Link>{" "}
          family
        </span>
        <h1 className="brand-wordmark mt-4 text-7xl md:text-8xl">{BRAND.name}</h1>
        <p className="mt-4 max-w-xl text-lg text-text-dim">{BRAND.tagline}.</p>
        <p className="mt-2 max-w-2xl text-sm text-text-faint">{BRAND.description}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signin"
            className="rounded-full bg-pink px-8 py-3 text-base font-semibold text-white shadow-[0_0_40px_-8px_rgba(255,46,147,0.7)] transition hover:bg-pink-strong"
          >
            Sign in with your first name
          </Link>
          <Link
            href="/about"
            className="glass rounded-full px-8 py-3 text-base font-medium text-text-dim transition hover:text-white"
          >
            What is this?
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard title="Read" tint="pink">
            EPUB · PDF · Comics. Themes, fonts, highlights, notes. Sync across devices.
          </FeatureCard>
          <FeatureCard title="Listen" tint="cyan">
            Chapters · Speed · Sleep timer. AirPlay to HomePod. Pick up exactly where you left off.
          </FeatureCard>
          <FeatureCard title="Request" tint="gold">
            Search any title. Owner gets it from Readarr. Friends get notified when it lands.
          </FeatureCard>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  children,
  tint,
}: {
  title: string;
  children: React.ReactNode;
  tint: "pink" | "cyan" | "gold";
}) {
  const tintClass =
    tint === "pink" ? "border-pink/30" : tint === "cyan" ? "border-cyan/30" : "border-gold/30";
  return (
    <div className={`glass border ${tintClass} p-6 text-left`}>
      <h3 className={`text-lg font-semibold text-${tint}`}>{title}</h3>
      <p className="mt-2 text-sm text-text-dim">{children}</p>
    </div>
  );
}
