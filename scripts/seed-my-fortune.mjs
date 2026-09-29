// Installs the traced "My Fortune" layout (plan image + 111 plots) into Supabase.
// Run: node --env-file=.env.local --experimental-strip-types scripts/seed-my-fortune.mjs   (add --force to overwrite admin edits)
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { areaM2, parseLayout, SQYD_TO_M2 } from "../src/shared/layout.ts";
import { ensureBucket, putObject } from "../src/server/storage.ts";

const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "scripts/seed/my-fortune.json"), "utf8"));
const layout = parseLayout("my-fortune", seed);
if (!layout) throw new Error("seed layout failed validation");

// accuracy report: traced polygon area vs the area printed on the plan
const off = layout.plots.map((p) => ({ n: p.number, pct: (areaM2(layout.overlay, p.points) / SQYD_TO_M2 / p.areaSqYd - 1) * 100 }));
off.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
const mean = off.reduce((s, x) => s + Math.abs(x.pct), 0) / off.length;
console.log(`plots: ${off.length} · mean area error ${mean.toFixed(2)}% · worst: ${off.slice(0, 5).map((x) => `${x.n} ${x.pct.toFixed(1)}%`).join(", ")}`);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const [exists] = await sql`select 1 from layouts where slug = 'my-fortune'`;
if (exists && !process.argv.includes("--force")) {
  console.log("my-fortune is already in the database — keeping admin edits (use --force to overwrite)");
} else {
  await ensureBucket();
  await putObject(path.basename(layout.overlay.url), await readFile(path.join(root, "scripts/seed/my-fortune-plan.webp")), "image/webp");
  await sql`insert into layouts (slug, json, updated_at) values ('my-fortune', ${sql.json(layout)}, now())
            on conflict (slug) do update set json = excluded.json, updated_at = excluded.updated_at`;
  console.log("installed my-fortune into Supabase");
}
await sql.end();
