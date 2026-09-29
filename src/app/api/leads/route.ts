import { desc, eq, getTableColumns } from "drizzle-orm";
import { clientIp, rateLimited, requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { getVisibleLayout } from "@/server/layouts";
import { validLead } from "@/server/validate";

const { leads, users } = schema;

// Public: a buyer enquiry / site-visit booking from the plot viewer.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.website) return Response.json({ ok: true }); // honeypot field — bots fill it, people never see it
  if (await rateLimited(`lead:ip:${clientIp(req)}`, 6, 10 * 60e3))
    return Response.json({ error: "Too many requests — please try again in a few minutes" }, { status: 429 });
  const v = validLead(body);
  if ("error" in v) return Response.json(v, { status: 400 });
  const layout = await getVisibleLayout(v.slug); // no leads for hidden (draft/archived) ventures
  if (!layout) return Response.json({ error: "Unknown venture" }, { status: 404 });
  if (v.plotNumber && !layout.plots.some((p) => p.number === v.plotNumber)) v.plotNumber = null;

  const [row] = await db().insert(leads).values(v).returning({ id: leads.id });
  await audit(null, "lead.create", "lead", String(row.id),
    `New ${v.kind === "visit" ? `site-visit request for ${v.visitDate} ${v.visitSlot}` : "enquiry"} from ${v.name} — ${v.slug}${v.plotNumber ? ` plot ${v.plotNumber}` : ""}`);
  return Response.json({ ok: true });
}

// Staff: the Leads screen (snake_case keys, as the screen expects).
export async function GET() {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const c = getTableColumns(leads);
  const rows = await db().select({
    id: c.id, slug: c.slug, plot_number: c.plotNumber, kind: c.kind, name: c.name, phone: c.phone, email: c.email,
    visit_date: c.visitDate, visit_slot: c.visitSlot, message: c.message, status: c.status,
    assigned_to: c.assignedTo, notes: c.notes, created_at: c.createdAt, assigned_name: users.name,
  }).from(leads).leftJoin(users, eq(users.id, leads.assignedTo)).orderBy(desc(leads.createdAt)).limit(500);
  return Response.json(rows);
}
