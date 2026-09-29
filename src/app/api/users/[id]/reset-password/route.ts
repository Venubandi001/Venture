import { eq } from "drizzle-orm";
import { requireUser, setPassword } from "@/server/auth";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { tempPassword } from "@/server/password";

/** Admin resets a team member's password: one-time password shown once, must be changed at next sign-in. */
export async function POST(_req: Request, ctx: RouteContext<"/api/users/[id]/reset-password">) {
  const me = await requireUser(["admin"]);
  if (me instanceof Response) return me;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  if (id === me.id) return Response.json({ error: "Use “Change password” for your own account" }, { status: 400 });
  const [t] = await db().select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, id));
  if (!t) return Response.json({ error: "User not found" }, { status: 404 });
  const password = tempPassword();
  await setPassword(id, password, true); // also signs them out everywhere
  await audit(me, "user.reset", "user", String(id), `Reset password for ${t.name} (one-time password issued)`);
  return Response.json({ tempPassword: password });
}
