import { requireUser } from "@/server/auth";
import { auditPlotChanges, changePlotStatuses } from "@/server/plots";
import { PLOT_STATUSES, PlotStatus } from "@/shared/types";

const STATUSES: readonly PlotStatus[] = PLOT_STATUSES;

// Sales + admin: change plot statuses only (geometry stays admin-only via PUT /api/layouts/[slug]).
// Every changed plot gets its own audit entry: that is the plot's status history.
export async function PATCH(req: Request, ctx: RouteContext<"/api/layouts/[slug]/plots">) {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const { slug } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as { ids?: unknown; status?: unknown; reason?: unknown };
  if (!Array.isArray(b.ids) || !b.ids.length || b.ids.length > 5000 || !STATUSES.includes(b.status as PlotStatus))
    return Response.json({ error: "Send { ids: [...], status }" }, { status: 400 });
  const to = b.status as PlotStatus;
  const ids = new Set(b.ids.map(String));
  const r = await changePlotStatuses(slug, (p) => ids.has(p.id), to);
  if ("error" in r) return Response.json(r, { status: 404 });
  await auditPlotChanges(u, slug, r.changed, to, typeof b.reason === "string" ? b.reason.slice(0, 200) : undefined);
  return Response.json({ ok: true, updatedAt: r.updatedAt, changed: r.changed.length });
}
