import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main className="relative min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-8">
        <Link href="/" className="brand-wordmark text-4xl">
          {BRAND.name}
        </Link>
        <p className="mt-2 text-sm text-text-faint">enter your first name to continue</p>

        <div className="glass-strong mt-8 w-full p-6">
          <SignInFormWrapper searchParams={searchParams} />
        </div>

        <p className="mt-8 text-xs text-text-faint">
          Owner is whoever signs in with the configured first name. Everyone else lands as a friend
          and can read, listen, and request books.
        </p>
      </div>
    </main>
  );
}

async function SignInFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return <SignInForm next={sp.next ?? "/library"} />;
}
