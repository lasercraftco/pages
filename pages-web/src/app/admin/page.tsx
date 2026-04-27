import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/db";
import { auditLog, libraryRequests, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/session";
import { desc, eq, sql as dsql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Admin overview — owner-only. Audit log, all users, recent activity.
 * NOT a request-approval queue (auto-approve is the family default).
 */
export default async function AdminPage() {
  const owner = await requireRole("owner");

  const [allUsers, recentRequests, recentAudit] = await Promise.all([
    db.select().from(users).orderBy(desc(users.lastSeenAt)).limit(20),
    db
      .select({
        id: libraryRequests.id,
        title: libraryRequests.title,
        author: libraryRequests.author,
        status: libraryRequests.status,
        createdAt: libraryRequests.createdAt,
        userId: libraryRequests.userId,
        userFirstName: users.firstName,
      })
      .from(libraryRequests)
      .leftJoin(users, eq(libraryRequests.userId, users.id))
      .orderBy(desc(libraryRequests.createdAt))
      .limit(40),
    db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(40),
  ]);

  return (
    <AppShell user={owner}>
      <header>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-1 text-text-dim">
          The whole family is on auto-fulfill. No queue — just visibility.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-text-faint">Family</h2>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allUsers.map((u) => (
            <li key={u.id} className="glass flex items-center gap-3 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-pink text-sm font-bold uppercase text-white">
                {u.firstName.charAt(0)}
              </span>
              <div className="flex-1">
                <div className="font-medium capitalize">{u.firstName}</div>
                <div className="text-xs text-text-faint">
                  {u.role}
                  {u.banned ? " · banned" : ""} · quota {u.dailyRequestQuota}/day
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-text-faint">Recent requests</h2>
        <div className="glass divide-y divide-white/5">
          {recentRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.title}</div>
                <div className="truncate text-xs text-text-dim">
                  {r.author ?? "?"} · by {r.userFirstName ?? "?"}
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-text-faint">
                {r.status}
              </span>
              <span className="hidden text-[11px] text-text-faint md:block">
                {new Date(r.createdAt!).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-text-faint">Audit log</h2>
        <div className="glass scrollbar-thin max-h-96 overflow-y-auto p-3 font-mono text-xs">
          {recentAudit.map((a) => (
            <div key={a.id} className="flex gap-3 py-1">
              <span className="text-text-faint">{a.timestamp?.toISOString().slice(0, 19)}</span>
              <span className="text-cyan">{a.action}</span>
              <span className="text-text-dim">{a.target}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
