"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setKindleEmail } from "@/lib/server-actions/export";

export function SettingsForm({
  firstName,
  kindleEmail,
  readingSpeedWpm,
}: {
  firstName: string;
  kindleEmail: string | null;
  readingSpeedWpm: number;
}) {
  const [email, setEmail] = useState(kindleEmail ?? "");
  const [, startTransition] = useTransition();

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <section className="glass p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="First name">{firstName}</Row>
          <Row k="Reading speed">{readingSpeedWpm} wpm</Row>
        </dl>
      </section>

      <section className="glass p-6">
        <h2 className="text-lg font-semibold">Send to Kindle</h2>
        <p className="mt-1 text-sm text-text-dim">
          Enter your <span className="text-pink">@kindle.com</span> email. We'll email books to
          Amazon's free conversion service.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await setKindleEmail(email);
              if (r.ok) toast.success("Kindle email saved");
              else toast.error(r.error ?? "save failed");
            });
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you_xxxxxx@kindle.com"
            className="flex-1 rounded-xl border border-white/10 bg-bg-2/60 px-3 py-2 text-sm outline-none focus:border-pink"
          />
          <button
            type="submit"
            className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-white hover:bg-pink-strong"
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-text-faint">{k}</dt>
      <dd className="text-text-dim">{children}</dd>
    </div>
  );
}
