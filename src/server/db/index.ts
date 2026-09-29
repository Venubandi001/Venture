import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Supabase Postgres via the Supavisor transaction pooler (port 6543).
// node-postgres sends one query at a time per connection — postgres.js pipelines concurrent queries, which
// Supavisor's transaction mode can leave hanging (seen as the whole pool freezing under parallel requests).
// query_timeout makes any stuck query fail fast instead of holding a connection forever.
const g = globalThis as unknown as { __venturePool?: ReturnType<typeof make> };

function make() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — add it to .env.local (see README)");
  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
    ssl: { rejectUnauthorized: false }, // Supabase pooler TLS (cert chain not in Node's store)
  });
  pool.on("error", (e) => console.error("db pool error:", e.message)); // a dropped idle connection must not crash the server
  return drizzle(pool, { schema });
}

/** Shared Drizzle client (survives dev hot-reloads). */
export function db() {
  return (g.__venturePool ??= make());
}

export { schema };
