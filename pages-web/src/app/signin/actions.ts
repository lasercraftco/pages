"use server";

import { redirect } from "next/navigation";

import {
  createSession,
  normalizeFirstName,
  setSessionCookie,
  upsertUserByFirstName,
} from "@/lib/auth/session";

export async function signInAction(
  rawFirstName: string,
  next: string,
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const fn = normalizeFirstName(rawFirstName);
  if (!fn) return { ok: false, error: "please enter your first name" };
  if (fn.length < 2) return { ok: false, error: "first name is too short" };

  try {
    const user = await upsertUserByFirstName(fn);
    const jwt = await createSession(user.id, fn, user.role as "owner" | "trusted" | "friend");
    await setSessionCookie(jwt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sign-in failed";
    if (msg === "banned") return { ok: false, error: "this account has been suspended" };
    return { ok: false, error: msg };
  }

  return { ok: true, next: next.startsWith("/") ? next : "/library" };
}

export async function signOutAction(): Promise<void> {
  const { clearSessionCookie } = await import("@/lib/auth/session");
  await clearSessionCookie();
  redirect("/signin");
}
