// "Find my plot" filters — shared by the viewer (client) and the explore page (server, from URL params).
import { LayoutPlot, plotAreaSqYd, plotPrice, VentureLayout } from "./layout";

export interface PlotFilter {
  facing: string; // "" = any
  min: number | null; // sq yds
  max: number | null;
  budget: number | null; // ₹ lakh
  availableOnly: boolean;
}

export const NO_FILTER: PlotFilter = { facing: "", min: null, max: null, budget: null, availableOnly: true };
export const isFiltering = (f: PlotFilter) => !!(f.facing || f.min || f.max || f.budget);

export function filterFromParams(sp: Record<string, string | string[] | undefined>): PlotFilter | null {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const n = (k: string) => (Number(one(k)) > 0 ? Number(one(k)) : null);
  const f: PlotFilter = { facing: one("facing").slice(0, 20), min: n("min"), max: n("max"), budget: n("budget"), availableOnly: one("avail") !== "0" };
  return isFiltering(f) || one("find") === "1" ? f : null;
}

export function matchPlots(l: VentureLayout, f: PlotFilter): LayoutPlot[] {
  if (!l.overlay) return [];
  return l.plots.filter((p) => {
    const a = plotAreaSqYd(l.overlay!, p), price = plotPrice(l, p);
    return (!f.facing || p.facing === f.facing) && (!f.min || a >= f.min) && (!f.max || a <= f.max) &&
      (!f.budget || (price !== null && price <= f.budget * 1e5)) && (!f.availableOnly || p.status === "available");
  }).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}
