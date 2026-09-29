// One-time move: local data/venture.db (SQLite) + data/uploads → Supabase Postgres + Storage.
// Safe to re-run (skips rows/files that already exist). The SQLite file is left untouched as a backup.
// Run: node --env-file=.env.local --experimental-strip-types scripts/move-to-supabase.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import { ensureBucket, putObject, UPLOAD_TYPES } from "../src/server/storage.ts";

const root = path.resolve(import.meta.dirname, "..");
const sqlitePath = path.join(root, "data/venture.db");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const MIME = Object.fromEntries(Object.entries(UPLOAD_TYPES).map(([m, e]) => [e, m]));

// 1 · files
await ensureBucket();
const dir = path.join(root, "data/uploads");
const files = existsSync(dir) ? readdirSync(dir) : [];
for (const f of files) await putObject(f, readFileSync(path.join(dir, f)), MIME[f.split(".").pop()]);
console.log(`files: ${files.length} uploaded to Storage`);

// 2 · rows
if (!existsSync(sqlitePath)) {
  console.log("no local database — nothing else to move");
} else {
  const lite = new DatabaseSync(sqlitePath, { readOnly: true });
  const users = lite.prepare("select * from users").all();
  for (const u of users)
    await sql`insert into users (id, email, name, role, pass_hash, created_at)
              values (${u.id}, ${u.email}, ${u.name}, ${u.role}, ${u.pass_hash}, ${u.created_at + "Z"})
              on conflict do nothing`;
  await sql`select setval(pg_get_serial_sequence('users','id'), greatest((select max(id) from users), 1))`;

  const layouts = lite.prepare("select * from layouts").all();
  for (const l of layouts)
    await sql`insert into layouts (slug, json, updated_at) values (${l.slug}, ${JSON.parse(l.json)}, ${l.updated_at})
              on conflict (slug) do nothing`;

  const leads = lite.prepare("select * from leads").all();
  for (const x of leads)
    await sql`insert into leads (id, slug, plot_number, kind, name, phone, email, visit_date, visit_slot, message, status, assigned_to, notes, created_at, updated_at)
              values (${x.id}, ${x.slug}, ${x.plot_number}, ${x.kind}, ${x.name}, ${x.phone}, ${x.email}, ${x.visit_date}, ${x.visit_slot},
                      ${x.message}, ${x.status}, ${x.assigned_to}, ${x.notes}, ${x.created_at + "Z"}, ${x.updated_at + "Z"})
              on conflict do nothing`;
  await sql`select setval(pg_get_serial_sequence('leads','id'), greatest((select max(id) from leads), 1))`;
  console.log(`rows: ${users.length} users, ${layouts.length} layouts, ${leads.length} leads (sessions not moved — sign in again)`);
}

const [c] = await sql`select (select count(*) from users)::int users, (select count(*) from layouts)::int layouts, (select count(*) from leads)::int leads`;
console.log("now in Supabase:", c);
await sql.end();
