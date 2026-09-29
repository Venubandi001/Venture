// Shapefile (.zip of .shp/.shx/.dbf/.prj from the surveyor) → venture layout. Runs in the browser;
// shpjs reads the .prj and reprojects (e.g. UTM 44N) to longitude/latitude, so plots land exactly.
import { FeatureKind, LayoutFeature, LayoutPlot, LngLat, lngLatToUv, Overlay, UV, VentureLayout } from "@/shared/layout";
import { FACINGS, PlotStatus, STATUS_LABEL } from "@/shared/types";

type Props = Record<string, unknown>;
interface Shape { kind: "polygon" | "line"; pts: LngLat[]; props: Props; layer: string }
export interface ShapefileData { name: string; shapes: Shape[]; fields: string[]; numberField: string }
export interface ImportResult { layout: VentureLayout; plots: number; features: number; kept: number; duplicates: string[]; skipped: number }

const M_PER_DEG = 111320;
const MAX_PLOT_PTS = 64, MAX_FEATURE_PTS = 200; // parseLayout limits

export async function readShapefile(file: File): Promise<ShapefileData> {
  const shp = (await import("shpjs")).default;
  let out;
  try {
    out = await shp(await file.arrayBuffer());
  } catch {
    throw new Error("Couldn't read this file — upload the .zip containing the .shp, .shx, .dbf and .prj files");
  }
  const shapes: Shape[] = [];
  for (const c of Array.isArray(out) ? out : [out]) {
    const layer = String((c as { fileName?: string }).fileName ?? "");
    for (const f of c.features) {
      const g = f.geometry, props = (f.properties ?? {}) as Props;
      if (g?.type === "Polygon") shapes.push({ kind: "polygon", pts: g.coordinates[0] as LngLat[], props, layer });
      else if (g?.type === "MultiPolygon") shapes.push({ kind: "polygon", pts: longest(g.coordinates.map((p) => p[0] as LngLat[])), props, layer });
      else if (g?.type === "LineString") shapes.push({ kind: "line", pts: g.coordinates as LngLat[], props, layer });
      else if (g?.type === "MultiLineString") shapes.push({ kind: "line", pts: longest(g.coordinates as LngLat[][]), props, layer });
    }
  }
  if (!shapes.length) throw new Error("No plot shapes found in this file");
  if (shapes.some((s) => s.pts.some(([x, y]) => Math.abs(x) > 180 || Math.abs(y) > 85)))
    throw new Error("The .prj file is missing from the zip, so the plots can't be placed on the map — ask for all four files");
  const fields = [...new Set(shapes.filter((s) => s.kind === "polygon").flatMap((s) => Object.keys(s.props)))];
  const numberField = fields.find((f) => /^plot.?(no|num|number|id)?$/i.test(f)) ?? fields.find((f) => /^(p.?no|no|num|number|name|label|text)$/i.test(f)) ?? fields[0] ?? "";
  return { name: file.name, shapes, fields, numberField };
}

const longest = (rings: LngLat[][]) => rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0] ?? []);
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const fieldLike = (fields: string[], re: RegExp) => fields.find((f) => re.test(f));

const labelOf = (p: Props) => text(p[Object.keys(p).find((k) => /^(name|label|text|type|layer|category|use|landuse|remarks?)$/i.test(k)) ?? ""]).slice(0, 60);

/** Plot, or which drawn feature — from the plot number, layer name and attribute values. */
function kindOf(s: Shape, number: string): FeatureKind | "plot" | null {
  if (s.kind === "polygon" && (/^[a-z]{0,2}[-\s]?\d{1,4}[a-z]?$/i.test(number) || (number && /plot/i.test(s.layer)))) return "plot"; // "12", "A-12", "12B"
  const t = `${s.layer} ${Object.values(s.props).map(text).join(" ")}`.toLowerCase();
  if (/road|street|lane/.test(t)) return "road";
  if (/park|green|garden|open\s*space|landscape/.test(t)) return "green";
  if (/boundary|outline|site|layout\s*limit/.test(t)) return "boundary";
  if (/amenit|social|infra|club|utility|civic|temple|school|stp|sump|water|tank|commercial|community|garbage|compost/.test(t)) return "amenity";
  return number && s.kind === "polygon" ? "plot" : null;
}

function facingOf(v: string): string | undefined {
  const k = v.toLowerCase().replace(/facing|[\s_-]/g, "");
  const short: Record<string, string> = { e: "East", w: "West", n: "North", s: "South", ne: "North-East", nw: "North-West", se: "South-East", sw: "South-West" };
  return short[k] ?? FACINGS.find((f) => f.toLowerCase().replace(/-/g, "") === k);
}

function statusOf(v: string): PlotStatus | undefined {
  const k = v.toLowerCase();
  if (!k) return undefined;
  if (/sold|regist/.test(k)) return "sold";
  if (/mortg/.test(k)) return "mortgage";
  if (/hold|block/.test(k)) return "hold";
  if (/receiv/.test(k)) return "received";
  if (/book|confirm|reserv/.test(k)) return "confirmed";
  return (Object.keys(STATUS_LABEL) as PlotStatus[]).find((s) => s === k || STATUS_LABEL[s].toLowerCase() === k);
}

/** Drop the closing duplicate + points closer than 5 cm, then thin evenly to `max`. */
function clean(pts: LngLat[], lat: number, max: number, closed: boolean): LngLat[] {
  const kx = M_PER_DEG * Math.cos((lat * Math.PI) / 180);
  const near = (a: LngLat, b: LngLat) => Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * M_PER_DEG) < 0.05;
  let out = pts.filter((p, i) => i === 0 || !near(p, pts[i - 1]));
  if (closed && out.length > 1 && near(out[0], out[out.length - 1])) out = out.slice(0, -1);
  if (out.length <= max) return out;
  const step = out.length / max; // ponytail: even thinning; switch to Douglas-Peucker if curved plots look off
  return Array.from({ length: max }, (_, i) => out[Math.floor(i * step)]);
}

/** Convex hull (monotone chain) — the site outline when the file has no boundary shape. */
function hull(pts: LngLat[]): LngLat[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: LngLat, a: LngLat, b: LngLat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: LngLat[]) => list.reduce<LngLat[]>((h, q) => {
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
    return [...h, q];
  }, []);
  const lower = half(p), upper = half(p.reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Build the layout. Plots whose number already exists keep their status, price, zone and id — sales data never resets. */
export function shapefileToLayout(d: ShapefileData, numberField: string, prev: VentureLayout): ImportResult {
  const all = d.shapes.flatMap((s) => s.pts);
  const lngs = all.map((p) => p[0]), lats = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const lat = (y0 + y1) / 2;
  const w = Math.max((x1 - x0) * M_PER_DEG * Math.cos((lat * Math.PI) / 180), 1) * 1.1;
  const h = Math.max((y1 - y0) * M_PER_DEG, 1) * 1.1;
  const overlay: Overlay = { url: "", pxWidth: 1000, pxHeight: Math.max(1, Math.round((1000 * h) / w)), center: [(x0 + x1) / 2, lat], rotation: 0, widthMeters: +w.toFixed(3), opacity: 1 };
  const uv = (pts: LngLat[], max: number, closed = true): UV[] => clean(pts, lat, max, closed).map((p) => lngLatToUv(overlay, p));

  const polyFields = d.fields;
  const facingField = fieldLike(polyFields, /fac/i);
  const statusField = fieldLike(polyFields, /status|avail/i);
  const areaField = fieldLike(polyFields, /sq.?y|yd|yard|gaj/i); // only sq-yard columns; otherwise the exact measured area is used
  const before = new Map(prev.plots.map((p) => [p.number, p]));

  const plots: LayoutPlot[] = [], features: LayoutFeature[] = [], seen = new Set<string>(), duplicates: string[] = [];
  let kept = 0, skipped = 0;
  for (const s of d.shapes) {
    const number = text(s.props[numberField]).slice(0, 20);
    const kind = kindOf(s, number);
    if (kind === "plot") {
      if (seen.has(number)) duplicates.push(number);
      seen.add(number);
      const old = before.get(number);
      if (old) kept++;
      const area = areaField ? Number(text(s.props[areaField]).replace(/[^\d.]/g, "")) : 0;
      const facing = facingField ? facingOf(text(s.props[facingField])) : undefined;
      plots.push({
        id: old?.id ?? crypto.randomUUID(),
        number,
        points: uv(s.pts, MAX_PLOT_PTS),
        status: old?.status ?? (statusField ? statusOf(text(s.props[statusField])) : undefined) ?? "available",
        ...(area > 0 ? { areaSqYd: area } : {}),
        ...(facing ?? old?.facing ? { facing: facing ?? old?.facing } : {}),
        ...(old?.zone ? { zone: old.zone } : {}),
        ...(old?.price ? { price: old.price } : {}),
      });
    } else if (s.kind === "line" && kind === "road" && labelOf(s.props)) {
      features.push({ id: crypto.randomUUID(), kind: "road", points: uv(s.pts, MAX_FEATURE_PTS, false), label: labelOf(s.props) });
    } else if (s.kind === "polygon" && kind && kind !== "road") {
      const label = kind === "boundary" ? "" : labelOf(s.props) || (kind === "green" ? "Park" : "");
      features.push({ id: crypto.randomUUID(), kind, points: uv(s.pts, MAX_FEATURE_PTS), ...(label ? { label } : {}) });
    } else skipped++; // road surfaces (drawn by the boundary), unlabelled lines, unnumbered shapes
  }
  if (!features.some((f) => f.kind === "boundary"))
    features.unshift({ id: crypto.randomUUID(), kind: "boundary", points: uv(hull(all), MAX_FEATURE_PTS) });

  return {
    layout: { ...prev, overlay, showPlan: false, plots, features: features.sort((a, b) => (a.kind === "boundary" ? -1 : b.kind === "boundary" ? 1 : 0)) },
    plots: plots.length, features: features.length, kept, duplicates, skipped,
  };
}
