import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/db";
import { libraryRequests, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { sql as dsql, and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = Promise<{ firstName: string }>;

/**
 * Personal "My Library Activity" page — a history view of the user's own
 * requests + recent reads. NOT an admin approval queue.
 */
export default async function ProfilePage({ params }: { params: Params }) {
  const viewer = await requireUser();
  const { firstName } = await params;
  const isSelf = viewer.firstName.toLowerCase() === firstName.toLowerCase();
  if (!isSelf && viewer.role !== "owner") notFound();

  const target = await db.query.users.findFirst({
    where: dsql`lower(${users.firstName}) = ${firstName.toLowerCase()}`,
  });
  if (!target) notFound();

  const reqs = await db
    .select()
    .from(libraryRequests)
    .where(eq(libraryRequests.userId, target.id))
    .orderBy(desc(libraryRequests.createdAt))
    .limit(50);

  return (
    <AppShell user={viewer}>
      <header>
        <h1 className="text-3xl font-bold">{target.firstName}'s activity</h1>
        <p className="mt-1 text-text-dim">
          Personal history of requested + downloaded books.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-text-faint">Requests</h2>
        {reqs.length === 0 ? (
          <p className="text-text-dim">no requests yet — try the request page.</p>
        ) : (
          <ul className="space-y-3">
            {reqs.map((r) => (
              <li key={r.id} className="glass flex items-center gap-4 p-3">
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverUrl} alt="" className="h-14 w-10 rounded object-cover" />
                ) : null}
                <div className="flex-1">
                  <div className="font-medium">{r.title}</div>
                  {r.author ? <div className="text-xs text-text-dim">{r.author}</div> : null}
                </div>
                <StatusBadge status={r.status} />
                <span className="text-[11px] text-text-faint">
                  {new Date(r.createdAt!).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = {
    pending: "border-warn/40 text-warn",
    downloading: "border-cyan/40 text-cyan",
    available: "border-up/40 text-up",
    declined: "border-down/40 text-down",
  }[status] ?? "border-white/10 text-text-dim";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${tone}`}>{status}</span>;
}
