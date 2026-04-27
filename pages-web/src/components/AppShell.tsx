import Link from "next/link";

import { BRAND } from "@/lib/brand";
import type { User } from "@/lib/db/schema";
import { UserMenu } from "./UserMenu";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 md:px-8">
          <Link href="/library" className="brand-wordmark text-2xl">
            {BRAND.name}
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-text-dim md:flex">
            <NavLink href="/library">Library</NavLink>
            <NavLink href="/shelves">Shelves</NavLink>
            <NavLink href="/request">Request</NavLink>
            {user.role === "owner" ? <NavLink href="/admin">Admin</NavLink> : null}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-text-faint md:px-8">
        <span className="brand-wordmark">{BRAND.name}</span>
        {" · "}
        <Link href={BRAND.family.portal} className="hover:text-pink">
          tyflix
        </Link>{" · "}
        <Link href={BRAND.family.reel} className="hover:text-pink">
          reel
        </Link>{" · "}
        <Link href={BRAND.family.genome} className="hover:text-pink">
          genome
        </Link>{" · "}
        <Link href={BRAND.family.karaoke} className="hover:text-pink">
          karaoke
        </Link>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="transition hover:text-white">
      {children}
    </Link>
  );
}
