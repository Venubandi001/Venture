import { getVisibleLayout } from "@/server/layouts";

// Public + tiny: the viewer polls this to show live availability without reloading the whole layout.
export async function GET(_req: Request, ctx: RouteContext<"/api/layouts/[slug]/status">) {
  const layout = await getVisibleLayout((await ctx.params).slug);
  if (!layout) return Response.json({ error: "Unknown venture" }, { status: 404 });
  return Response.json(
    { updatedAt: layout.updatedAt ?? null, statuses: Object.fromEntries(layout.plots.map((p) => [p.id, p.status])) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
