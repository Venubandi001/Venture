import "server-only";
import { eq } from "drizzle-orm";
import { LayoutPlot, parseLayout } from "@/shared/layout";
import { PlotStatus, STATUS_LABEL } from "@/shared/types";
import type { User } from "@/shared/users";
import { auditMany } from "./audit";
import { db, schema } from "./db/index";

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
const { layouts } = schema;

/**
 * Change plot statuses inside a transaction that locks the venture's layout row, so two people changing
 * (or booking) the same plot at the same moment can't both win. `guard` can veto with an error message.
 * Runs inside `tx` when given (so a booking insert and its plot change commit together).
 */
export async function changePlotStatuses(
  slug: string, match: (p: LayoutPlot) => boolean, to: PlotStatus, opts: { guard?: (p: LayoutPlot) => string | null; tx?: Tx } = {},
): Promise<{ error: string } | { changed: LayoutPlot[]; updatedAt: string }> {
  const run = async (tx: Tx) => {
    const [row] = await tx.select().from(layouts).where(eq(layouts.slug, slug)).for("update");
    const l = row ? parseLayout(slug, row.json) : null;
    if (!l) return { error: "This venture has no plot layout yet" };
    const targets = l.plots.filter(match);
    if (!targets.length) return { error: "Plot not found" };
    for (const p of targets) {
      const e = opts.guard?.(p);
      if (e) return { error: e };
    }
    const changed = targets.filter((p) => p.status !== to);
    const at = new Date();
    const plots = l.plots.map((p) => (match(p) ? { ...p, status: to } : p));
    await tx.update(layouts).set({ json: { ...l, plots, updatedAt: undefined }, updatedAt: at }).where(eq(layouts.slug, slug));
    return { changed, updatedAt: at.toISOString() };
  };
  return opts.tx ? run(opts.tx) : db().transaction(run);
}

/** Audit entries for a status change — call after the transaction commits. */
export function auditPlotChanges(user: Pick<User, "id" | "name"> | null, slug: string, changed: LayoutPlot[], to: PlotStatus, reason?: string) {
  return auditMany(user, changed.map((p) => ({
    action: "plot.status", entity: "plot", entityId: `${slug}:${p.number}`,
    summary: `Plot ${p.number} (${slug}): ${STATUS_LABEL[p.status]} → ${STATUS_LABEL[to]}${reason ? ` — ${reason}` : ""}`,
    details: { status: [p.status, to] },
  })));
}
