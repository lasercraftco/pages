/**
 * Apply Drizzle migrations. Runs as the entrypoint of the web container
 * before `next start`, and via `pnpm drizzle:migrate` in dev.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; skipping migration");
  process.exit(0);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./src/lib/db/migrations" }).catch((err) => {
  // In Docker the migrations folder is copied to ./migrations next to migrate.ts
  return migrate(db, { migrationsFolder: "./migrations" }).catch((err2) => {
    console.error("migration failed:", err, err2);
    process.exit(1);
  });
});

await sql.end();
console.log("[pages] migrations applied");
