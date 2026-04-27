// Pure-JS migration runner — no tsx/esbuild needed at runtime.
// Used as the web container's entrypoint before `node server.js`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[pages] DATABASE_URL is not set; skipping migration");
  process.exit(0);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const candidates = ["./migrations", "./src/lib/db/migrations"];
let lastErr;
for (const folder of candidates) {
  try {
    await migrate(db, { migrationsFolder: folder });
    console.log(`[pages] migrations applied from ${folder}`);
    await sql.end();
    process.exit(0);
  } catch (err) {
    lastErr = err;
  }
}
console.error("[pages] migration failed:", lastErr);
await sql.end();
process.exit(1);
