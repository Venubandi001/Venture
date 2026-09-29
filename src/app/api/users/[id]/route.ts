import { eq } from "drizzle-orm";
import { countActiveAdmins, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";

const { users, sessions } = schema;

async function target(ctx: RouteContext<"/api/users/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return null;
  const [row] = await db().select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active }).from(users).where(eq(users.id, id));
  return row ?? null;
}

/** Admin: change role or activate/deactivate. The last active admin can't be demoted or deactivated. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const me = await requireUser(["admin"]);
  if (me instanceof Response) return me;
  const t = await target(ctx);
  if (!t) return Response.json({ error: "User not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { role?: unknown; active?: unknown };
  const set: { role?: "admin" | "sales"; active?: boolean } = {};
  if (b.role === "admin" || b.role === "sales") set.role = b.role;
  if (typeof b.active === "boolean") set.active = b.active;
  if (!Object.keys(set).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  if (t.id === me.id && (set.active === false || set.role === "sales")) return Response.json({ error: "You can't deactivate or demote yourself" }, { status: 400 });
  const losingAdmin = t.role === "admin" && t.active && (set.role === "sales" || set.active === false);
  if (losingAdmin && (await countActiveAdmins()) <= 1) return Response.json({ error: "Keep at least one active admin" }, { status: 400 });

  await db().update(users).set(set).where(eq(users.id, t.id));
  if (set.active === false) await db().delete(sessions).where(eq(sessions.userId, t.id)); // signed out immediately
  await audit(me, "user.update", "user", String(t.id), `${t.name}: ${[set.role && set.role !== t.role ? `role → ${set.role}` : "", set.active === false ? "deactivated" : set.active === true && !t.active ? "reactivated" : ""].filter(Boolean).join(", ") || "no change"}`);
  return Response.json({ ok: true });
}

/** Admin: remove an account entirely (its leads become unassigned). Prefer deactivating to keep history. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const me = await requireUser(["admin"]);
  if (me instanceof Response) return me;
  const t = await target(ctx);
  if (!t) return Response.json({ error: "User not found" }, { status: 404 });
  if (t.id === me.id) return Response.json({ error: "You can't remove your own account" }, { status: 400 });
  if (t.role === "admin" && t.active && (await countActiveAdmins()) <= 1) return Response.json({ error: "Keep at least one active admin" }, { status: 400 });
  await db().delete(users).where(eq(users.id, t.id));
  await audit(me, "user.delete", "user", String(t.id), `Removed account ${t.name} (${t.email})`);
  return Response.json({ ok: true });
}
