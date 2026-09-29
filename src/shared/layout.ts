// Venture layout model + geometry. Pure (type-only imports) so scripts/check-layout.mjs can run it directly.
import type { PlotStatus } from "./types";
// value import kept local (no extensionless imports: scripts run this file directly with strip-types)
const PLOT_STATUSES: readonly PlotStatus[] = ["available", "confirmed", "received", "hold", "sold", "mortgage"];

export type UV = [number, number]; // position on the layout image, 0..1 from top-left
export type LngLat = [number, number];

export interface Overlay {
  url: string; // "" = no plan image: a frame for plots imported with real coordinates (Shapefile)
  pxWidth: number;
  pxHeight: number;
  center: LngLat;
  rotation: number; // degrees clockwise from north
  widthMeters: number; // real-world width of the whole image
  opacity: number;
}

export interface LayoutPlot {
  id: string;
  number: string;
  points: UV[];
  areaSqYd?: number; // as printed on the plan; falls back to measured area
  facing?: string;
  status: PlotStatus;
  zone?: string;
  price?: number; // total ₹, overrides rate × area
}

export interface NearbyPlace {
  name: string;
  distance: string; // "3 min · 1.2 km"
}

export interface Zone {
  id: string;
  name: string;
  color: string;
}

/** Drawn base map: site boundary (drawn as road surface), parks, amenities, and road-name lines. */
export type FeatureKind = "boundary" | "green" | "amenity" | "road";
export const FEATURE_KINDS: FeatureKind[] = ["boundary", "green", "amenity", "road"];

export interface LayoutFeature {
  id: string;
  kind: FeatureKind;
  points: UV[]; // polygon ring, or the line a road name runs along
  label?: string;
}

export interface VentureLayout {
  slug: string;
  overlay: Overlay | null;
  showPlan: boolean; // false → customers see only the drawn layout, like a CAD render
  features: LayoutFeature[];
  plots: LayoutPlot[];
  zones: Zone[];
  description: string;
  whatsapp: string;
  gallery: string[];
  brochure: string | null;
  ratePerSqYd: number | null; // ₹ per sq yd
  nearby: NearbyPlace[];
  approvals: string[]; // "HMDA LP 000071/LO/Plg/HMDA/2021", "TS RERA …"
  updatedAt?: string;
}

/** ₹ price of a plot, or null when no price has been set. */
export function plotPrice(l: VentureLayout, p: LayoutPlot): number | null {
  if (p.price) return p.price;
  return l.ratePerSqYd && l.overlay ? Math.round(l.ratePerSqYd * plotAreaSqYd(l.overlay, p)) : null;
}

/** ₹42.5 L / ₹1.25 Cr */
export function formatInr(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

/** Monthly EMI for a loan (standard reducing-balance formula). */
export function emi(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 12 / 100, n = years * 12;
  if (!r) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

export const SQYD_TO_M2 = 0.836127;
const M_PER_DEG = 111320;
const STATUSES: readonly string[] = PLOT_STATUSES;
const LEGACY_STATUS: Record<string, PlotStatus> = { reserved: "confirmed" }; // older saves

export function emptyLayout(slug: string): VentureLayout {
  return {
    slug, overlay: null, showPlan: true, features: [], plots: [], zones: [], description: "", whatsapp: "", gallery: [], brochure: null,
    ratePerSqYd: null, nearby: [], approvals: [],
  };
}

const rad = (d: number) => (d * Math.PI) / 180;
const heightMeters = (o: Overlay) => (o.widthMeters * o.pxHeight) / o.pxWidth;

/** Image position → metres on the ground, before rotation (x right, y down). */
export function uvToMeters(o: Overlay, [u, v]: UV): [number, number] {
  return [u * o.widthMeters, v * heightMeters(o)];
}

export function uvToLngLat(o: Overlay, [u, v]: UV): LngLat {
  const x = (u - 0.5) * o.widthMeters;
  const y = (0.5 - v) * heightMeters(o); // north-up
  const t = rad(o.rotation);
  const east = x * Math.cos(t) + y * Math.sin(t);
  const north = -x * Math.sin(t) + y * Math.cos(t);
  const [lng0, lat0] = o.center;
  return [lng0 + east / (M_PER_DEG * Math.cos(rad(lat0))), lat0 + north / M_PER_DEG];
}

export function lngLatToUv(o: Overlay, [lng, lat]: LngLat): UV {
  const [lng0, lat0] = o.center;
  const east = (lng - lng0) * M_PER_DEG * Math.cos(rad(lat0));
  const north = (lat - lat0) * M_PER_DEG;
  const t = rad(o.rotation);
  const x = east * Math.cos(t) - north * Math.sin(t);
  const y = east * Math.sin(t) + north * Math.cos(t);
  return [x / o.widthMeters + 0.5, 0.5 - y / heightMeters(o)];
}

/** Corner order MapLibre image sources expect: TL, TR, BR, BL. */
export function overlayCorners(o: Overlay): [LngLat, LngLat, LngLat, LngLat] {
  return [uvToLngLat(o, [0, 0]), uvToLngLat(o, [1, 0]), uvToLngLat(o, [1, 1]), uvToLngLat(o, [0, 1])];
}

export function edgeLengths(o: Overlay, pts: UV[]): number[] {
  return pts.map((p, i) => {
    const [x1, y1] = uvToMeters(o, p);
    const [x2, y2] = uvToMeters(o, pts[(i + 1) % pts.length]);
    return Math.hypot(x2 - x1, y2 - y1);
  });
}

export function areaM2(o: Overlay, pts: UV[]): number {
  let s = 0;
  pts.forEach((p, i) => {
    const [x1, y1] = uvToMeters(o, p);
    const [x2, y2] = uvToMeters(o, pts[(i + 1) % pts.length]);
    s += x1 * y2 - x2 * y1;
  });
  return Math.abs(s) / 2;
}

export function plotAreaSqYd(o: Overlay, p: LayoutPlot): number {
  return p.areaSqYd ?? areaM2(o, p.points) / SQYD_TO_M2;
}

/** Split a 4-corner block (TL, TR, BR, BL) into rows × cols cells, row-major. */
export function subdivideBlock(c: [UV, UV, UV, UV], rows: number, cols: number): UV[][] {
  const at = (s: number, t: number): UV => {
    const top: UV = [c[0][0] + (c[1][0] - c[0][0]) * s, c[0][1] + (c[1][1] - c[0][1]) * s];
    const bot: UV = [c[3][0] + (c[2][0] - c[3][0]) * s, c[3][1] + (c[2][1] - c[3][1]) * s];
    return [top[0] + (bot[0] - top[0]) * t, top[1] + (bot[1] - top[1]) * t];
  };
  const cells: UV[][] = [];
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++)
      cells.push([at(k / cols, r / rows), at((k + 1) / cols, r / rows), at((k + 1) / cols, (r + 1) / rows), at(k / cols, (r + 1) / rows)]);
  return cells;
}

// ---- Validation at the API boundary ----
const num = (v: unknown, min = -Infinity, max = Infinity) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 2000) => typeof v === "string" && v.length <= max;
export const UPLOAD_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/;
// Only our own uploads may be referenced — these URLs end up in <img>/<iframe>.
const upload = (v: unknown) => typeof v === "string" && v.startsWith("/api/uploads/") && UPLOAD_NAME.test(v.slice(13));

export function parseLayout(slug: string, raw: unknown): VentureLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const o = r.overlay as Record<string, unknown> | null;
  if (o !== null) {
    if (!o || !(o.url === "" || upload(o.url)) || !num(o.pxWidth, 1) || !num(o.pxHeight, 1) || !num(o.rotation, -360, 360) ||
        !num(o.widthMeters, 1, 20000) || !num(o.opacity, 0, 1) || !Array.isArray(o.center) ||
        !num(o.center[0], -180, 180) || !num(o.center[1], -85, 85)) return null;
  }
  if (!Array.isArray(r.plots) || r.plots.length > 5000 || !Array.isArray(r.zones) || r.zones.length > 50) return null;
  const plots = (r.plots as Record<string, unknown>[]).map((p) => (p && LEGACY_STATUS[p.status as string] ? { ...p, status: LEGACY_STATUS[p.status as string] } : p));
  const plotsOk = plots.every((p) =>
    p && str(p.id, 64) && str(p.number, 20) && STATUSES.includes(p.status as string) &&
    (p.areaSqYd === undefined || num(p.areaSqYd, 0)) && (p.facing === undefined || str(p.facing, 40)) &&
    (p.zone === undefined || str(p.zone, 64)) && (p.price === undefined || num(p.price, 0, 1e11)) && Array.isArray(p.points) && p.points.length >= 3 && p.points.length <= 64 &&
    p.points.every((pt: unknown) => Array.isArray(pt) && num(pt[0], -1, 2) && num(pt[1], -1, 2)));
  const zonesOk = r.zones.every((z: Record<string, unknown>) => z && str(z.id, 64) && str(z.name, 60) && str(z.color, 20));
  const features = r.features ?? []; // older saves have no drawn base
  const featuresOk = Array.isArray(features) && features.length <= 500 && features.every((f: Record<string, unknown>) =>
    f && str(f.id, 64) && FEATURE_KINDS.includes(f.kind as FeatureKind) && (f.label === undefined || str(f.label, 60)) &&
    Array.isArray(f.points) && f.points.length >= 2 && f.points.length <= 200 &&
    f.points.every((pt: unknown) => Array.isArray(pt) && num(pt[0], -1, 2) && num(pt[1], -1, 2)));
  if (!featuresOk || !(r.showPlan === undefined || typeof r.showPlan === "boolean")) return null;
  const nearby = r.nearby ?? [], approvals = r.approvals ?? [], rate = r.ratePerSqYd ?? null;
  if (!Array.isArray(nearby) || nearby.length > 30 || !nearby.every((n: Record<string, unknown>) => n && str(n.name, 80) && str(n.distance, 40))) return null;
  if (!Array.isArray(approvals) || approvals.length > 10 || !approvals.every((a) => str(a, 120))) return null;
  if (!(rate === null || num(rate, 0, 1e8))) return null;
  if (!plotsOk || !zonesOk || !str(r.description, 5000) || !str(r.whatsapp, 20) ||
      !/^\d{0,15}$/.test(r.whatsapp as string) ||
      !Array.isArray(r.gallery) || r.gallery.length > 60 || !r.gallery.every(upload) ||
      !(r.brochure === null || upload(r.brochure))) return null;
  return {
    slug,
    overlay: o as unknown as Overlay | null,
    showPlan: (r.showPlan as boolean | undefined) ?? true,
    features: features as LayoutFeature[],
    plots: plots as unknown as LayoutPlot[],
    zones: r.zones as Zone[],
    description: r.description as string,
    whatsapp: r.whatsapp as string,
    gallery: r.gallery as string[],
    brochure: r.brochure as string | null,
    ratePerSqYd: rate as number | null,
    nearby: nearby as NearbyPlace[],
    approvals: approvals as string[],
  };
}
