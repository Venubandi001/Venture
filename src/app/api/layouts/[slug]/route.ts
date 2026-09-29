import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { parseLayout } from "@/shared/layout";
import { getLayout, getVisibleLayout, saveLayout } from "@/server/layouts";

// Public: exactly what the customer viewer shows (draft/archived ventures only for signed-in staff).
export async function GET(_req: Request, ctx: RouteContext<"/api/layouts/[slug]">) {
  const layout = await getVisibleLayout((await ctx.params).slug);
  return layout ? Response.json(layout) : Response.json({ error: "Unknown venture" }, { status: 404 });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/layouts/[slug]">) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const { slug } = await ctx.params;
  const before = await getLayout(slug);
  if (!before) return Response.json({ error: "Unknown venture" }, { status: 404 });
  const layout = parseLayout(slug, await req.json().catch(() => null));
  if (!layout) return Response.json({ error: "Invalid layout data" }, { status: 400 });
  const updatedAt = await saveLayout(layout);
  await audit(u, "layout.publish", "layout", slug,
    `Published layout of ${slug}: ${layout.plots.length} plots, ${layout.features.length} map features${before.overlay?.url !== layout.overlay?.url ? ", new plan image" : ""}`);
  return Response.json({ ok: true, updatedAt });
}
