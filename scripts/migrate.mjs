// Applies ./drizzle SQL migrations to DATABASE_URL.
// Run: node --env-file=.env.local scripts/migrate.mjs
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} }); // pooler: no prepared statements; hide "already exists" notices
await migrate(drizzle(client), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") });
const tables = await client`select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1`;
console.log("migrated:", tables.map((t) => `${t.tablename}${t.rowsecurity ? " (RLS on)" : " (RLS OFF!)"}`).join(", "));
await client.end();
