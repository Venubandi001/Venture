import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { getVenture, parseVentureInput, saveVenture } from "@/server/ventures";

export async function PUT(req: Request, ctx: RouteContext<"/api/ventures/[slug]">) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const { slug } = await ctx.params;
  const before = await getVenture(slug);
  if (!before) return Response.json({ error: "Venture not found" }, { status: 404 });
  const v = parseVentureInput(await req.json().catch(() => null), slug); // slug (web address) never changes
  if ("error" in v) return Response.json(v, { status: 400 });
  await saveVenture(v, false);
  const changed = (Object.keys(v) as (keyof typeof v)[]).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(before[k]));
  await audit(u, "venture.update", "venture", slug, `Updated ${v.name}: ${changed.join(", ") || "no changes"}`,
    before.status !== v.status ? { status: [before.status, v.status] } : undefined);
  return Response.json({ ok: true });
}
