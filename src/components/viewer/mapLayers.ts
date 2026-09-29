// MapLibre layers shared by the customer viewer and the admin layout editor.
// Viewer with showPlan=false draws the layout like a CAD render (Spacer-style): dark road surface,
// green parks, beige plots with numbers; everything is vector so it stays sharp at any zoom.
import type { GeoJSONSource, ImageSource, Map as MLMap } from "maplibre-gl";
import { STATUS_COLOR, STATUS_LABEL } from "@/shared/types";
import {
  areaM2, edgeLengths, LayoutPlot, Overlay, overlayCorners, plotAreaSqYd, SQYD_TO_M2, UV, uvToLngLat, uvToMeters, VentureLayout,
} from "@/shared/layout";

export type ColorMode = "none" | "status" | "zones";

const C = { dim: "#6f6c63", plot: "#d8ceb2", road: "#3a3b3a", roadEdge: "#6a6a68", green: "#4f7b2c", amenity: "#8d897b", selected: "#2f86de" };

export async function loadMaplibre() {
  const ml = await import("maplibre-gl");
  ml.setWorkerUrl("/api/maplibre/maplibre-gl-worker.mjs");
  return ml;
}

export function mapStyle(dark: boolean) {
  return {
    version: 8 as const,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      sat: {
        type: "raster" as const,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 18, // Esri serves "Map data not yet available" tiles at z19+ in many areas; overzoom z18 instead
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [
      {
        id: "sat",
        type: "raster" as const,
        source: "sat",
        paint: dark ? { "raster-saturation": -0.85, "raster-brightness-max": 0.5 } : {},
      },
    ],
  };
}

const EMPTY = { type: "FeatureCollection" as const, features: [] };
const fc = <T>(features: T[]) => ({ type: "FeatureCollection" as const, features });
const ring = (o: Overlay, pts: UV[]) => [[...pts, pts[0]].map((p) => uvToLngLat(o, p))];
const centroid = (pts: UV[]): UV => [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
const point = (at: [number, number], props: Record<string, unknown>) => ({
  type: "Feature" as const,
  properties: props,
  geometry: { type: "Point" as const, coordinates: at },
});

/** Text size that stays a fixed number of metres tall as you zoom (MapLibre world = 512·2^z px). */
function metresTextSize(lat: number, m: unknown = ["get", "m"]) {
  const k = (z: number) => (512 * 2 ** z) / (40075016 * Math.cos((lat * Math.PI) / 180));
  // Stop at the map's maxZoom (22): data-driven sizes are packed into 16 bits (max ≈512 px), so a higher stop
  // would be clamped and shrink every label in between. Style-spec types don't model zoom+data text-size.
  return ["interpolate", ["exponential", 2], ["zoom"], 14, ["*", m, k(14)], 22, ["*", m, k(22)]] as never;
}

/** Map rotation (degrees) that makes text run along the segment a→b and never upside down. */
function textAngle(o: Overlay, a: UV, b: UV) {
  const [x1, y1] = uvToMeters(o, a);
  const [x2, y2] = uvToMeters(o, b);
  let r = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + o.rotation;
  while (r > 90) r -= 180;
  while (r < -90) r += 180;
  return r;
}

/** Plot number orientation/size: along the longest edge, sized to the short side. */
function plotLabelGeom(o: Overlay, p: LayoutPlot) {
  return shapeLabelGeom(o, p.points);
}

/** Label along the most horizontal of the long edges (keeps odd corner plots upright, like the printed plan). */
function shapeLabelGeom(o: Overlay, pts: UV[]) {
  const lens = edgeLengths(o, pts);
  const longest = Math.max(...lens);
  let best = -1, bestTilt = Infinity;
  lens.forEach((len, i) => {
    if (len < longest * 0.75) return;
    const tilt = Math.abs(textAngle(o, pts[i], pts[(i + 1) % pts.length]) - o.rotation);
    if (tilt < bestTilt) { bestTilt = tilt; best = i; }
  });
  // width across the shape = area / length (robust to tiny corner edges on traced polygons)
  return { rot: textAngle(o, pts[best], pts[(best + 1) % pts.length]), short: areaM2(o, pts) / lens[best] };
}

function plotFeatures(l: VentureLayout) {
  const o = l.overlay;
  if (!o) return EMPTY;
  const zoneColor = Object.fromEntries(l.zones.map((z) => [z.id, z.color]));
  return fc(l.plots.map((p) => ({
    type: "Feature" as const,
    properties: { id: p.id, statusColor: STATUS_COLOR[p.status], zoneColor: zoneColor[p.zone ?? ""] ?? C.plot },
    geometry: { type: "Polygon" as const, coordinates: ring(o, p.points) },
  })));
}

function plotNumberFeatures(l: VentureLayout) {
  const o = l.overlay;
  if (!o) return EMPTY;
  return fc(l.plots.map((p) => {
    const { rot, short } = plotLabelGeom(o, p);
    return point(uvToLngLat(o, centroid(p.points)), { id: p.id, t: p.number, rot, m: Math.min(short * 0.26, 4) });
  }));
}

function baseFeatures(l: VentureLayout) {
  const o = l.overlay;
  if (!o) return EMPTY;
  return fc(l.features.filter((f) => f.kind !== "road" && f.points.length >= 3).map((f) => ({
    type: "Feature" as const,
    properties: { kind: f.kind },
    geometry: { type: "Polygon" as const, coordinates: ring(o, f.points) },
  })));
}

function baseLabelFeatures(l: VentureLayout) {
  const o = l.overlay;
  if (!o) return EMPTY;
  const out = [];
  for (const f of l.features) {
    if (!f.label) continue;
    if (f.kind === "road") {
      // a single point at the middle of the drawn line (line placement repeats labels per tile)
      const a = f.points[0], b = f.points[f.points.length - 1];
      out.push(point(uvToLngLat(o, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), { t: f.label, kind: "road", m: 3, rot: textAngle(o, a, b) }));
    } else if (f.kind !== "boundary") {
      const { rot, short } = shapeLabelGeom(o, f.points);
      out.push(point(uvToLngLat(o, centroid(f.points)), { t: f.label, kind: f.kind, m: Math.min(Math.max(short * 0.12, 2), 5), rot }));
    }
  }
  return fc(out);
}

/** Edge lengths around the plot + number/area/facing in the middle, like a surveyed plot card. */
function selectionLabels(o: Overlay, p: LayoutPlot) {
  const lens = edgeLengths(o, p.points);
  const { rot, short } = plotLabelGeom(o, p);
  const n = p.points.length;
  const c = centroid(p.points);
  const hMeters = (o.widthMeters * o.pxHeight) / o.pxWidth;
  const yd = plotAreaSqYd(o, p);

  const edge = p.points.flatMap((a, i) => {
    if (lens[i] < 1) return []; // corner slivers from tracing

    const b = p.points[(i + 1) % n];
    const mid: UV = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // push the label a little outside the edge
    const off = Math.min(Math.max(short * 0.07, 0.3), 1.5);
    const dx = (mid[0] - c[0]) * o.widthMeters, dy = (mid[1] - c[1]) * hMeters;
    const d = Math.hypot(dx, dy) || 1;
    const at: UV = [mid[0] + ((dx / d) * off) / o.widthMeters, mid[1] + ((dy / d) * off) / hMeters];
    return [point(uvToLngLat(o, at), { t1: `${lens[i].toFixed(2)} m`, t2: "", rot: textAngle(o, a, b), m: Math.min(Math.max(short * 0.07, 0.3), 1.6) })];
  });
  const status = p.status === "available" ? "" : `\n${STATUS_LABEL[p.status].toUpperCase()}`; // selection colour hides the status fill
  const sub = `\n${yd.toFixed(2)} yd²\n${(yd * SQYD_TO_M2).toFixed(2)} m²${p.facing ? `\n${p.facing}` : ""}`;
  return fc([...edge, point(uvToLngLat(o, c), { t1: p.number, t2: sub, t3: status, c3: p.status === "sold" ? "#ff2d2d" : "#fff", rot, m: Math.min(short * 0.16, 2.5) })]);
}

function addOverlay(map: MLMap, o: Overlay) {
  map.addSource("overlay", { type: "image", url: o.url, coordinates: overlayCorners(o) });
  map.addLayer(
    { id: "overlay", type: "raster", source: "overlay", paint: { "raster-opacity": o.opacity, "raster-fade-duration": 0 } },
    "base-boundary"
  );
}

export function addLayoutLayers(map: MLMap, l: VentureLayout, opts: { editor: boolean }) {
  const lat = l.overlay?.center[1] ?? 17.4;
  const textLayout = (m?: number) => ({
    "text-font": ["Noto Sans Bold"],
    "text-size": metresTextSize(lat, m),
    "text-rotation-alignment": "map" as const,
    "text-pitch-alignment": "map" as const,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  });

  map.addSource("base", { type: "geojson", data: EMPTY });
  map.addSource("base-labels", { type: "geojson", data: EMPTY });
  map.addSource("plots", { type: "geojson", data: EMPTY });
  map.addSource("plot-numbers", { type: "geojson", data: EMPTY });
  map.addSource("labels", { type: "geojson", data: EMPTY });

  const baseOpacity = opts.editor ? 0.45 : 1;
  map.addLayer({ id: "base-boundary", type: "fill", source: "base", filter: ["==", ["get", "kind"], "boundary"], paint: { "fill-color": C.road, "fill-opacity": baseOpacity } });
  map.addLayer({ id: "base-boundary-line", type: "line", source: "base", filter: ["==", ["get", "kind"], "boundary"], paint: { "line-color": C.roadEdge, "line-width": 2 } });
  map.addLayer({ id: "base-green", type: "fill", source: "base", filter: ["==", ["get", "kind"], "green"], paint: { "fill-color": C.green, "fill-opacity": baseOpacity } });
  map.addLayer({ id: "base-amenity", type: "fill", source: "base", filter: ["==", ["get", "kind"], "amenity"], paint: { "fill-color": C.amenity, "fill-opacity": baseOpacity } });

  map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": C.plot, "fill-opacity": 0 } });
  map.addLayer({
    id: "plots-3d", type: "fill-extrusion", source: "plots", layout: { visibility: "none" },
    paint: { "fill-extrusion-color": C.plot, "fill-extrusion-height": 0.7, "fill-extrusion-base": 0, "fill-extrusion-vertical-gradient": true },
  });
  map.addLayer({
    id: "plots-line", type: "line", source: "plots",
    paint: {
      "line-color": opts.editor ? "#ffcc00" : "#262626",
      "line-width": opts.editor ? 1.2 : ["interpolate", ["exponential", 2], ["zoom"], 15, 0.3, 21, 2.2],
    },
  });
  map.addLayer({ id: "plot-selected", type: "fill", source: "plots", filter: ["==", ["get", "id"], ""], paint: { "fill-color": C.selected, "fill-opacity": 0.95 } });
  map.addLayer({ id: "plot-selected-line", type: "line", source: "plots", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#fff", "line-width": 1.3, "line-dasharray": [3, 2] } });

  map.addLayer({
    id: "base-text", type: "symbol", source: "base-labels", filter: ["!=", ["get", "kind"], "road"],
    layout: { ...textLayout(), "text-field": ["get", "t"], "text-rotate": ["get", "rot"] },
    paint: { "text-color": "#f2f2f2", "text-opacity": 0.85 },
  });
  map.addLayer({
    id: "road-text", type: "symbol", source: "base-labels", filter: ["==", ["get", "kind"], "road"],
    layout: { ...textLayout(), "text-field": ["get", "t"], "text-rotate": ["get", "rot"] },
    paint: { "text-color": "#a9a9a6" },
  });
  map.addLayer({
    id: "plot-numbers", type: "symbol", source: "plot-numbers",
    layout: { ...textLayout(), "text-field": ["get", "t"], "text-rotate": ["get", "rot"] },
    paint: { "text-color": "#1d1d1b" },
  });
  map.addLayer({
    id: "labels", type: "symbol", source: "labels",
    layout: { ...textLayout(), "text-field": ["format", ["get", "t1"], {}, ["get", "t2"], { "font-scale": 0.45 },
      ["coalesce", ["get", "t3"], ""], { "font-scale": 0.45, "text-color": ["coalesce", ["get", "c3"], "#fff"] }], "text-rotate": ["get", "rot"] },
    paint: { "text-color": "#fff" },
  });
  syncLayout(map, l, opts);
}

/** Push layout edits (overlay position, base, plots, zones) into an already-built map. */
export function syncLayout(map: MLMap, l: VentureLayout, opts: { editor: boolean }) {
  const src = map.getSource("overlay") as ImageSource | undefined;
  if (src && (!l.overlay || src.url !== l.overlay.url)) {
    map.removeLayer("overlay");
    map.removeSource("overlay");
  }
  if (l.overlay) {
    if (map.getSource("overlay")) (map.getSource("overlay") as ImageSource).setCoordinates(overlayCorners(l.overlay));
    else addOverlay(map, l.overlay);
    map.setPaintProperty("overlay", "raster-opacity", l.overlay.opacity);
    map.setLayoutProperty("overlay", "visibility", opts.editor || l.showPlan ? "visible" : "none");
  }
  const drawn = opts.editor || !l.showPlan;
  for (const id of ["base-boundary", "base-boundary-line", "base-green", "base-amenity", "base-text", "road-text", "plot-numbers"])
    map.setLayoutProperty(id, "visibility", drawn ? "visible" : "none");
  (map.getSource("base") as GeoJSONSource).setData(baseFeatures(l));
  (map.getSource("base-labels") as GeoJSONSource).setData(baseLabelFeatures(l));
  (map.getSource("plots") as GeoJSONSource).setData(plotFeatures(l));
  (map.getSource("plot-numbers") as GeoJSONSource).setData(plotNumberFeatures(l));
}

/** Plot colours (plain / status / zones), selection highlight + dimension labels. */
export function paintPlots(
  map: MLMap, l: VentureLayout, mode: ColorMode, selectedId: string | null, opts: { editor: boolean },
  highlight: string[] | null = null // "Find plot" matches; everything else is dimmed
) {
  const vector = !opts.editor && !l.showPlan;
  const base = mode === "status" ? ["get", "statusColor"] : mode === "zones" ? ["get", "zoneColor"] : C.plot;
  const hit = ["in", ["get", "id"], ["literal", highlight ?? []]];
  const color = (highlight ? ["case", hit, base, C.dim] : base) as never;
  map.setPaintProperty("plots-fill", "fill-color", color);
  map.setPaintProperty("plots-fill", "fill-opacity", vector ? 1 : mode === "none" && !highlight ? 0 : 0.62);
  map.setPaintProperty("plot-numbers", "text-opacity", (highlight ? ["case", hit, 1, 0.3] : 1) as never);
  map.setPaintProperty("plots-3d", "fill-extrusion-color", ["case", ["==", ["get", "id"], selectedId ?? ""], C.selected, color]);
  map.setPaintProperty("plots-line", "line-opacity", opts.editor || vector ? 1 : 0);

  const sel = ["==", ["get", "id"], selectedId ?? ""] as ["==", ["get", string], string];
  map.setFilter("plot-selected", sel);
  map.setFilter("plot-selected-line", sel);
  map.setFilter("plot-numbers", ["!=", ["get", "id"], selectedId ?? ""]);
  const p = l.plots.find((q) => q.id === selectedId);
  (map.getSource("labels") as GeoJSONSource).setData(p && l.overlay ? selectionLabels(l.overlay, p) : EMPTY);
}

export function set3d(map: MLMap, on: boolean) {
  map.setLayoutProperty("plots-3d", "visibility", on ? "visible" : "none");
}

export function plotBounds(o: Overlay, pts: UV[]): [[number, number], [number, number]] {
  const ll = pts.map((p) => uvToLngLat(o, p));
  const lng = ll.map((p) => p[0]), lat = ll.map((p) => p[1]);
  return [[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]];
}

/** Bounds of what customers should see first: the drawn boundary if there is one, else the whole plan image. */
export function siteBounds(l: VentureLayout) {
  const o = l.overlay!;
  const b = l.features.find((f) => f.kind === "boundary");
  return plotBounds(o, b && !l.showPlan ? b.points : OVERLAY_BOUNDS);
}

export const OVERLAY_BOUNDS: UV[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
