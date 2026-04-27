"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { signInAction } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await signInAction(firstName.trim(), next);
          if (res.ok) router.push(res.next);
          else setError(res.error ?? "could not sign in");
        });
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-text-dim">first name</span>
        <input
          name="firstName"
          autoFocus
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="tyler"
          className="w-full rounded-xl border border-white/10 bg-bg-2/60 px-4 py-3 text-lg outline-none transition focus:border-pink focus:shadow-[0_0_24px_-6px_rgba(255,46,147,0.5)]"
        />
      </label>

      {error ? <p className="text-sm text-down">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || firstName.trim().length === 0}
        className="rounded-xl bg-pink px-4 py-3 text-base font-semibold text-white transition hover:bg-pink-strong disabled:opacity-50"
      >
        {pending ? "..." : "sign in"}
      </button>
    </form>
  );
}
