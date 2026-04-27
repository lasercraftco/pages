"use client";

import { useState } from "react";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

import { signOutAction } from "@/app/signin/actions";
import type { User } from "@/lib/db/schema";

export function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-bg-2/60 px-3 py-1.5 text-sm transition hover:border-pink/40"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-pink text-xs font-bold uppercase text-white">
          {user.firstName.charAt(0)}
        </span>
        <span className="hidden md:inline">{user.firstName}</span>
        {user.role === "owner" ? (
          <span className="hidden rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold md:inline">
            owner
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="glass-strong absolute right-0 top-full mt-2 w-56 overflow-hidden p-1 text-sm">
          <a
            href="/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-white/5"
          >
            <Settings className="h-4 w-4" /> Settings
          </a>
          <a
            href={`/u/${user.firstName}`}
            className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-white/5"
          >
            <UserIcon className="h-4 w-4" /> Profile
          </a>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition hover:bg-down/15 hover:text-down"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
