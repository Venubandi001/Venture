// Account admin from the command line — only for whoever holds the server's .env keys.
//   node --env-file=.env.local --experimental-strip-types scripts/admin.mjs create <email> "<Full name>"   first/extra admin
//   node --env-file=.env.local --experimental-strip-types scripts/admin.mjs reset <email>                  locked-out user
//   node --env-file=.env.local --experimental-strip-types scripts/admin.mjs list
// A one-time password is printed once; the person must choose their own at first sign-in.
import postgres from "postgres";
import { hashPassword, tempPassword } from "../src/server/password.ts";

const [cmd, emailArg, ...nameParts] = process.argv.slice(2);
const email = (emailArg ?? "").trim().toLowerCase();
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const fail = async (msg) => { console.error(msg); await sql.end(); process.exit(1); };

if (cmd === "list") {
  const rows = await sql`select email, name, role, active, must_change_password from users order by id`;
  console.table(rows.map((r) => ({ email: r.email, name: r.name, role: r.role, active: r.active, "must change pw": r.must_change_password })));
} else if (cmd === "create") {
  const name = nameParts.join(" ").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || name.length < 2) await fail('usage: admin.mjs create <email> "<Full name>"');
  const pw = tempPassword();
  const [row] = await sql`insert into users (email, name, role, pass_hash, must_change_password)
                          values (${email}, ${name}, 'admin', ${hashPassword(pw)}, true)
                          on conflict (email) do nothing returning id`;
  if (!row) await fail(`${email} already exists — use "reset" instead`);
  console.log(`\nAdmin created: ${email}\nOne-time password: ${pw}\nSign in at /admin — you'll be asked to set your own password.\n`);
} else if (cmd === "reset") {
  if (!email) await fail("usage: admin.mjs reset <email>");
  const pw = tempPassword();
  const [row] = await sql`update users set pass_hash = ${hashPassword(pw)}, must_change_password = true, active = true, password_changed_at = now()
                          where email = ${email} returning id`;
  if (!row) await fail(`No account for ${email} (see "list")`);
  await sql`delete from sessions where user_id = ${row.id}`;
  await sql`delete from password_resets where user_id = ${row.id}`;
  console.log(`\nPassword reset for ${email} (signed out everywhere, account active).\nOne-time password: ${pw}\n`);
} else {
  await fail("commands: create <email> \"<name>\" | reset <email> | list");
}
await sql.end();
