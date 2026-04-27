/**
 * Drizzle DB connection — singleton across hot reloads in dev.
 *
 * Lazy: we don't open the postgres client at module-load time. Next.js
 * collects page data during `next build` and would otherwise crash with
 * "DATABASE_URL is not set" even though every route that uses the DB is
 * marked dynamic. The Proxy below defers the connect until first method
 * call, so the build phase never touches Postgres.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Drizzled = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __pages_pg?: ReturnType<typeof postgres>;
  __pages_db?: Drizzled;
};

function realDb(): Drizzled {
  if (globalForDb.__pages_db) return globalForDb.__pages_db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = globalForDb.__pages_pg ?? postgres(url, { max: 10, prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.__pages_pg = client;
  const d = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") globalForDb.__pages_db = d;
  return d;
}

// Proxy that defers all access to the lazily-initialized real db. This means
// `import { db }` is safe at build time; nothing connects until you call a
// method like `db.select(...)`.
export const db = new Proxy({} as Drizzled, {
  get(_t, prop, receiver) {
    const real = realDb() as unknown as Record<string | symbol, unknown>;
    const val = real[prop as string];
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(real) : val;
  },
}) as Drizzled;

export { schema };
