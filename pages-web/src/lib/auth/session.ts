/**
 * First-name auth — shared family JWT cookie at .tyflix.net so a sign-in on
 * pages/genome/reel/karaoke propagates across the family. Owner is whoever's
 * first name matches PAGES_OWNER_FIRST_NAME (default "tyler"); everyone else
 * is "friend".
 *
 * The cookie is stored at the apex *.tyflix.net so the upcoming family-SSO
 * refactor will pick this up unchanged.
 *
 * Token claims:
 *   { sub: <user_id>, fn: <first_name_lower>, role: <owner|trusted|friend>,
 *     iss: 'tyflix', aud: 'family', iat, exp }
 */

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql as dsql } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";

import { db } from "@/lib/db";
import { auditLog, sessions, users, type Role, type User } from "@/lib/db/schema";

const JWT_SECRET_RAW = process.env.TYFLIX_AUTH_JWT_SECRET ?? "dev-only-not-secret-change-me";
const JWT_KEY = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME = process.env.TYFLIX_AUTH_COOKIE_NAME ?? "tyflix_session";
const COOKIE_DOMAIN = process.env.TYFLIX_AUTH_COOKIE_DOMAIN ?? undefined;
const SESSION_TTL_S = 90 * 24 * 60 * 60;
const OWNER_FIRST_NAME = (process.env.PAGES_OWNER_FIRST_NAME ?? "tyler").toLowerCase();

export const COOKIE_NAME_EXPORTED = COOKIE_NAME;

/* ───────── token plumbing ───────── */

type SessionToken = {
  sub: string;
  fn: string;
  role: Role;
  iss: "tyflix";
  aud: "family";
  iat: number;
  exp: number;
};

async function signToken(payload: Omit<SessionToken, "iss" | "aud" | "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("tyflix")
    .setAudience("family")
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_S)
    .sign(JWT_KEY);
}

async function verifyToken(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY, { issuer: "tyflix", audience: "family" });
    return payload as unknown as SessionToken;
  } catch {
    return null;
  }
}

/* ───────── public API ───────── */

export function normalizeFirstName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

export function isOwnerName(fn: string): boolean {
  return normalizeFirstName(fn) === OWNER_FIRST_NAME;
}

/**
 * Find or create a user by first name. The first user whose name matches
 * OWNER_FIRST_NAME becomes owner; everyone else becomes friend.
 */
export async function upsertUserByFirstName(rawFirstName: string): Promise<User> {
  const fn = normalizeFirstName(rawFirstName);
  if (!fn) throw new Error("first name required");

  const existing = await db.query.users.findFirst({
    where: dsql`lower(${users.firstName}) = ${fn}`,
  });
  if (existing) {
    if (existing.banned) throw new Error("banned");
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, existing.id));
    return existing;
  }

  const role: Role = fn === OWNER_FIRST_NAME ? "owner" : "friend";
  const [created] = await db
    .insert(users)
    .values({ firstName: fn, role, lastSeenAt: new Date() })
    .returning();
  await db.insert(auditLog).values({ userId: created.id, action: "user.signup", target: fn });
  return created;
}

export async function createSession(userId: string, fn: string, role: Role): Promise<string> {
  const id = randomBytes(36).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_S * 1000);
  const ua = (await headers()).get("user-agent")?.slice(0, 500) ?? null;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.insert(sessions).values({ id, userId, expiresAt, userAgent: ua, ip });
  return await signToken({ sub: userId, fn, role });
}

export async function setSessionCookie(jwt: string): Promise<void> {
  const c = await cookies();
  c.set({
    name: COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: COOKIE_DOMAIN, // .tyflix.net in prod, undefined in dev
    maxAge: SESSION_TTL_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete({ name: COOKIE_NAME, path: "/", domain: COOKIE_DOMAIN });
}

export async function getUser(): Promise<User | null> {
  const c = await cookies();
  const jwt = c.get(COOKIE_NAME)?.value;
  if (!jwt) return null;
  const claims = await verifyToken(jwt);
  if (!claims) return null;
  const u = await db.query.users.findFirst({ where: eq(users.id, claims.sub) });
  if (!u || u.banned) return null;
  // Touch last_seen_at occasionally
  if (!u.lastSeenAt || Date.now() - u.lastSeenAt.getTime() > 60_000) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, u.id));
  }
  return u;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/signin");
  return u;
}

export async function requireRole(role: Role | Role[]): Promise<User> {
  const u = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(u.role as Role)) redirect("/forbidden");
  return u;
}

export function isOwner(u: { role: string }): boolean {
  return u.role === "owner";
}

export function canDirectAdd(u: { role: string; autoApprove: boolean }): boolean {
  return u.role === "owner" || u.role === "trusted" || u.autoApprove;
}
