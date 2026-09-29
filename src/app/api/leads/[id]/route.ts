import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { LEAD_STATUSES, type LeadStatus } from "@/shared/leads";

const { leads, users } = schema;

export async function PATCH(req: Request, ctx: RouteContext<"/api/leads/[id]">) {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  const [before] = await db().select().from(leads).where(eq(leads.id, id));
  if (!before) return Response.json({ error: "Lead not found" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const set: Partial<typeof leads.$inferInsert> = {};
  const notes: string[] = [];
  if (b.status !== undefined) {
    if (!LEAD_STATUSES.includes(b.status as LeadStatus)) return Response.json({ error: "Bad status" }, { status: 400 });
    set.status = b.status as LeadStatus;
    if (set.status !== before.status) notes.push(`status ${before.status} → ${set.status}`);
  }
  if (b.assignedTo !== undefined) {
    const to = b.assignedTo === null ? null : Number(b.assignedTo);
    if (to !== null) {
      const [owner] = await db().select({ name: users.name, active: users.active }).from(users).where(eq(users.id, to));
      if (!owner?.active) return Response.json({ error: "Pick an active team member" }, { status: 400 });
      notes.push(`assigned to ${owner.name}`);
    } else notes.push("unassigned");
    set.assignedTo = to;
  }
  if (b.notes !== undefined) {
    set.notes = String(b.notes).slice(0, 2000);
    notes.push("notes updated");
  }
  if (!Object.keys(set).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  await db().update(leads).set({ ...set, updatedAt: new Date() }).where(eq(leads.id, id));
  await audit(u, "lead.update", "lead", String(id), `Lead ${before.name} (${before.phone}): ${notes.join(", ") || "saved"}`,
    set.status && set.status !== before.status ? { status: [before.status, set.status] } : undefined);
  return Response.json({ ok: true });
}
