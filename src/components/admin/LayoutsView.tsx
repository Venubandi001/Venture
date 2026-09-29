"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import {
  areaM2, emptyLayout, FeatureKind, LayoutPlot, lngLatToUv, SQYD_TO_M2, subdivideBlock, UV, uvToLngLat, uvToMeters, VentureLayout,
} from "@/shared/layout";
import { PlotStatus, STATUS_COLOR, STATUS_LABEL } from "@/shared/types";
import { useVentures, VentureSelect } from "./VenturesContext";
import { useToast } from "../ToastProvider";
import { addLayoutLayers, loadMaplibre, mapStyle, OVERLAY_BOUNDS, paintPlots, plotBounds, syncLayout } from "../viewer/mapLayers";
import { FACINGS } from "@/shared/types";

type Tool = "select" | "block" | "plot" | "measure" | FeatureKind;
const EDITOR = { editor: true };
const BASE_TOOLS: { kind: FeatureKind; label: string; hint: string }[] = [
  { kind: "boundary", label: "Site boundary", hint: "Click around the whole site outline (it is drawn as road surface)." },
  { kind: "green", label: "Park / green", hint: "Click around the park or green area." },
  { kind: "amenity", label: "Amenity", hint: "Click around the clubhouse, utility or other amenity." },
  { kind: "road", label: "Road name", hint: "Click 2+ points along the middle of the road." },
];
type Tab = "place" | "base" | "plots" | "details";
const STATUSES = Object.keys(STATUS_LABEL) as PlotStatus[];
const EMPTY = { type: "FeatureCollection" as const, features: [] };

import { shrink, upload } from "./uploads";
function distance(o: NonNullable<VentureLayout["overlay"]>, a: UV, b: UV) {
  const [x1, y1] = uvToMeters(o, a);
  const [x2, y2] = uvToMeters(o, b);
  return Math.hypot(x2 - x1, y2 - y1);
}

/** "01" → 01, 02…; "61" with step -1 → 61, 60… */
function numberer(start: string, step: number) {
  const n0 = parseInt(start, 10) || 1;
  const pad = /^0\d/.test(start) ? start.length : 0;
  return (i: number) => String(n0 + step * i).padStart(pad, "0");
}

export default function LayoutsView({
  slug,
  onSelectVenture,
}: {
  slug: string;
  onSelectVenture: (slug: string) => void;
}) {
  const showToast = useToast();
  const venture = useVentures().bySlug(slug)!;
  const home: [number, number] = [venture.lng, venture.lat]; // map centre when no plan is placed yet

  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const fitPending = useRef(true);
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<VentureLayout | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState<Tab>("place");
  const [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<UV[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coords, setCoords] = useState("");
  const [realMeters, setRealMeters] = useState("");
  const [clearWhite, setClearWhite] = useState(true);
  const [featureLabel, setFeatureLabel] = useState("");
  const [form, setForm] = useState({
    rows: 8, cols: 1, start: "1", step: 1, order: "down" as "down" | "across",
    area: "", facing: "", status: "available" as PlotStatus, zone: "",
  });
  const live = useRef({ tool, layout, selectedId });
  useEffect(() => {
    live.current = { tool, layout, selectedId };
  }, [tool, layout, selectedId]);

  const o = layout?.overlay ?? null;
  const selected = layout?.plots.find((p) => p.id === selectedId);

  function edit(fn: (l: VentureLayout) => VentureLayout) {
    setLayout((l) => (l ? fn(l) : l));
    setDirty(true);
  }
  const editOverlay = (patch: Partial<NonNullable<VentureLayout["overlay"]>>) =>
    edit((l) => (l.overlay ? { ...l, overlay: { ...l.overlay, ...patch } } : l));

  // Load the venture's layout (AdminApp remounts this view per venture via `key`).
  useEffect(() => {
    let stale = false;
    fetch(`/api/layouts/${slug}`)
      .then((r) => r.json())
      .then((l: VentureLayout) => !stale && setLayout(l.plots ? l : emptyLayout(slug)))
      .catch(() => !stale && setLayout(emptyLayout(slug)));
    return () => {
      stale = true;
    };
  }, [slug]);

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then(({ Map }) => {
      if (cancelled || !divRef.current) return;
      const map = new Map({
        container: divRef.current,
        style: mapStyle(false),
        center: home,
        zoom: 16,
        maxZoom: 22,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.on("load", () => {
        addLayoutLayers(map, emptyLayout(""), EDITOR);
        map.addSource("draft", { type: "geojson", data: EMPTY });
        map.addLayer({ id: "draft-line", type: "line", source: "draft", paint: { "line-color": "#ff3b30", "line-width": 2, "line-dasharray": [2, 1] } });
        map.addLayer({ id: "draft-pts", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ff3b30", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });

        // draggable corner handles for the selected plot
        map.addSource("vertices", { type: "geojson", data: EMPTY });
        map.addLayer({ id: "vertices", type: "circle", source: "vertices", paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-color": "#2f86de", "circle-stroke-width": 2.5 } });
        let dragging: number | null = null;
        map.on("mouseenter", "vertices", () => (map.getCanvas().style.cursor = "move"));
        map.on("mouseleave", "vertices", () => dragging === null && (map.getCanvas().style.cursor = ""));
        map.on("mousedown", "vertices", (e) => {
          if (live.current.tool !== "select") return;
          e.preventDefault(); // stop the map panning while dragging a corner
          dragging = e.features?.[0]?.properties?.idx as number;
        });
        map.on("mousemove", (e) => {
          const { layout, selectedId } = live.current;
          if (dragging === null || !layout?.overlay || !selectedId) return;
          const uv = lngLatToUv(layout.overlay, [e.lngLat.lng, e.lngLat.lat]);
          const idx = dragging;
          setLayout((l) => l && { ...l, plots: l.plots.map((p) => (p.id === selectedId ? { ...p, points: p.points.map((q, i) => (i === idx ? uv : q)) } : p)) });
          setDirty(true);
        });
        map.on("mouseup", () => { dragging = null; });
        setReady(true);
      });
      map.on("click", (e) => {
        const { tool, layout } = live.current;
        if (tool === "select") {
          if (map.queryRenderedFeatures(e.point, { layers: ["vertices"] }).length) return; // end of a corner drag
          const f = map.queryRenderedFeatures(e.point, { layers: ["plots-fill"] })[0];
          setSelectedId((f?.properties?.id as string | undefined) ?? null);
          return;
        }
        const ov = layout?.overlay;
        if (!ov) return showToast("Upload the layout image first");
        const uv = lngLatToUv(ov, [e.lngLat.lng, e.lngLat.lat]);
        setDraft((d) => ((tool === "block" && d.length >= 4) || (tool === "measure" && d.length >= 2) ? d : [...d, uv]));
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push layout edits + selection into the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !layout) return;
    syncLayout(map, layout, EDITOR);
    paintPlots(map, layout, "none", selectedId, EDITOR);
    const sel = tool === "select" && layout.overlay && map.getSource("vertices") ? layout.plots.find((p) => p.id === selectedId) : undefined;
    (map.getSource("vertices") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: sel ? sel.points.map((uv, idx) => ({ type: "Feature" as const, properties: { idx }, geometry: { type: "Point" as const, coordinates: uvToLngLat(layout.overlay!, uv) } })) : [],
    });
    if (fitPending.current) {
      fitPending.current = false;
      if (layout.overlay) map.fitBounds(plotBounds(layout.overlay, OVERLAY_BOUNDS), { padding: 30, duration: 0 });
      else map.jumpTo({ center: home, zoom: 16 });
    }
  }, [ready, layout, selectedId, venture.lat, venture.lng, tool]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const pts = o ? draft.map((uv) => uvToLngLat(o, uv)) : [];
    const closed = tool !== "measure" && tool !== "road" && pts.length >= 3;
    (map.getSource("draft") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [
        ...(pts.length >= 2 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: closed ? [...pts, pts[0]] : pts } }] : []),
        ...pts.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: c } })),
      ],
    });
  }, [ready, draft, o, tool]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getCanvas().style.cursor = tool === "select" ? "" : "crosshair";
    if (tool === "select") map.doubleClickZoom.enable();
    else map.doubleClickZoom.disable();
  }, [ready, tool]);

  function chooseTool(t: Tool) {
    setTool(t);
    setDraft([]);
  }

  async function onLayoutImage(file: File | undefined) {
    if (!file) return;
    try {
      setBusy("Uploading layout…");
      const { file: small, w, h } = await shrink(file, 4096, clearWhite);
      const url = await upload(small);
      fitPending.current = !o;
      edit((l) => ({
        ...l,
        overlay: l.overlay
          ? { ...l.overlay, url, pxWidth: w, pxHeight: h }
          : { url, pxWidth: w, pxHeight: h, center: home, rotation: 0, widthMeters: 300, opacity: 0.95 },
      }));
      showToast("Layout uploaded — now position it on the satellite map");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function onGallery(files: FileList | null) {
    if (!files?.length) return;
    try {
      setBusy("Uploading photos…");
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await upload((await shrink(f, 2400)).file));
      edit((l) => ({ ...l, gallery: [...l.gallery, ...urls] }));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function onBrochure(file: File | undefined) {
    if (!file) return;
    try {
      setBusy("Uploading brochure…");
      const url = await upload(file);
      edit((l) => ({ ...l, brochure: url }));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (!layout) return;
    setBusy("Saving…");
    const res = await fetch(`/api/layouts/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(layout) });
    setBusy("");
    if (!res.ok) return showToast((await res.json().catch(() => ({}))).error ?? "Save failed");
    setDirty(false);
    showToast("Layout published to the customer viewer");
  }

  function goToCoords() {
    const m = coords.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return showToast("Paste as: latitude, longitude");
    const center: [number, number] = [Number(m[2]), Number(m[1])];
    mapRef.current?.flyTo({ center, zoom: 17 });
    if (o) editOverlay({ center });
  }

  function newPlot(points: UV[], number: string): LayoutPlot {
    return {
      id: crypto.randomUUID(),
      number,
      points,
      status: form.status,
      ...(form.area ? { areaSqYd: Number(form.area) } : {}),
      ...(form.facing ? { facing: form.facing } : {}),
      ...(form.zone ? { zone: form.zone } : {}),
    };
  }

  function createBlock() {
    const cells = subdivideBlock(draft as [UV, UV, UV, UV], form.rows, form.cols);
    const order: number[] = [];
    if (form.order === "down") for (let k = 0; k < form.cols; k++) for (let r = 0; r < form.rows; r++) order.push(r * form.cols + k);
    else cells.forEach((_, i) => order.push(i));
    const name = numberer(form.start, form.step);
    edit((l) => ({ ...l, plots: [...l.plots, ...order.map((ci, i) => newPlot(cells[ci], name(i)))] }));
    setForm((f) => ({ ...f, start: name(order.length) }));
    setDraft([]);
  }

  function finishPlot() {
    const name = numberer(form.start, form.step);
    edit((l) => ({ ...l, plots: [...l.plots, newPlot(draft, name(0))] }));
    setForm((f) => ({ ...f, start: name(1) }));
    setDraft([]);
  }

  function finishFeature(kind: FeatureKind) {
    const label = featureLabel.trim() || (kind === "green" ? "Park" : "");
    edit((l) => ({ ...l, features: [...l.features, { id: crypto.randomUUID(), kind, points: draft, ...(label ? { label } : {}) }] }));
    setDraft([]);
  }

  function applyScale() {
    if (!o || draft.length < 2) return;
    const measured = distance(o, draft[0], draft[1]);
    const real = Number(realMeters);
    if (!real || !measured) return showToast("Enter the real length in metres");
    editOverlay({ widthMeters: +(o.widthMeters * (real / measured)).toFixed(3) });
    setDraft([]);
    showToast("Scale calibrated");
  }

  const updatePlot = (patch: Partial<LayoutPlot>) =>
    edit((l) => ({ ...l, plots: l.plots.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)) }));

  const counts = STATUSES.map((s) => ({ s, n: layout?.plots.filter((p) => p.status === s).length ?? 0 }));
  const measured = o && draft.length === 2 ? distance(o, draft[0], draft[1]) : 0;

  return (
    <section>
      <div className="eyebrow">GIS / Layouts</div>
      <div className="page-title-row">
        <div>
          <h1>Layout & plot mapping</h1>
          <p style={{ color: "#7b867f" }}>
            Upload the approved layout plan, pin it onto the satellite map, then mark each plot. Customers see it at{" "}
            <a href={`/explore/${slug}`} target="_blank" rel="noopener"><b>/explore/{slug}</b></a>.
          </p>
        </div>
        <div className="le-actions">
          <VentureSelect value={slug} onChange={onSelectVenture} />
          <a className="btn ghost" href={`/explore/${slug}`} target="_blank" rel="noopener">Open customer view ↗</a>
          <button className="btn" onClick={save} disabled={!layout || !!busy}>
            {busy || (dirty ? "Save & publish •" : "Saved")}
          </button>
        </div>
      </div>

      <div className="le">
        <div className="le-map card">
          <div ref={divRef} className="le-canvas" />
          {tool !== "select" ? (
            <div className="le-hint">
              {tool === "block" && `Click the block's 4 corners: 1→2 runs along a row, then 3, 4. (${draft.length}/4)`}
              {tool === "plot" && `Click each corner of the plot (${draft.length} points), then “Finish plot”.`}
              {tool === "measure" && `Click both ends of a known dimension on the plan (${draft.length}/2).`}
              {BASE_TOOLS.find((b) => b.kind === tool)?.hint}{BASE_TOOLS.some((b) => b.kind === tool) ? ` (${draft.length} points)` : ""}
            </div>
          ) : null}
        </div>

        <div className="le-panel card">
          <div className="tabs">
            {(["place", "base", "plots", "details"] as Tab[]).map((t) => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => { setTab(t); chooseTool("select"); }}>
                {t === "place" ? "1 · Layout image" : t === "base" ? "2 · Roads & parks" : t === "plots" ? `3 · Plots (${layout?.plots.length ?? 0})` : "4 · Viewer details"}
              </button>
            ))}
          </div>

          {layout && tab === "base" ? (
            <div className="le-stack">
              <p className="le-muted">
                Draw the site like a CAD render: the boundary becomes road surface, then add parks, amenities and road names.
                Customers see this drawn layout instead of the plan image.
              </p>
              <label className="le-check">
                <input type="checkbox" checked={!layout.showPlan} onChange={(e) => edit((l) => ({ ...l, showPlan: !e.target.checked }))} />
                Show customers the drawn layout (hide the plan image)
              </label>
              <div className="le-tools">
                {BASE_TOOLS.map((b) => (
                  <button key={b.kind} className={`tab ${tool === b.kind ? "active" : ""}`} onClick={() => { chooseTool(b.kind); setFeatureLabel(""); }}>
                    {b.label}
                  </button>
                ))}
              </div>
              {BASE_TOOLS.some((b) => b.kind === tool) ? (
                <div className="le-box">
                  {tool !== "boundary" ? (
                    <div className="field">
                      <label>{tool === "road" ? "Road name" : "Label"}</label>
                      <input value={featureLabel} onChange={(e) => setFeatureLabel(e.target.value)} placeholder={tool === "road" ? "30 FT Road" : tool === "green" ? "Park" : "Clubhouse"} />
                    </div>
                  ) : null}
                  <div className="le-row">
                    <button className="btn ghost" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>Undo point</button>
                    <button className="btn" onClick={() => finishFeature(tool as FeatureKind)} disabled={draft.length < (tool === "road" ? 2 : 3)}>Finish</button>
                  </div>
                </div>
              ) : null}
              {layout.features.map((f) => (
                <div className="le-row le-feature" key={f.id}>
                  <span>{BASE_TOOLS.find((b) => b.kind === f.kind)?.label}{f.label ? ` · ${f.label}` : ""}</span>
                  <button className="btn ghost danger" onClick={() => edit((l) => ({ ...l, features: l.features.filter((x) => x.id !== f.id) }))}>×</button>
                </div>
              ))}
            </div>
          ) : null}

          {!layout ? <p className="le-muted">Loading…</p> : null}

          {layout && tab === "place" ? (
            <div className="le-stack">
              <label className="upload le-upload">
                {o ? "Replace layout image" : "Upload layout plan"} <b>PNG / JPG / WebP</b>
                <br />
                <small>Export PDFs/CAD as a high-resolution image first. Large images are resized to 4096 px.</small>
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onLayoutImage(e.target.files?.[0])} />
              </label>
              <label className="le-check">
                <input type="checkbox" checked={clearWhite} onChange={(e) => setClearWhite(e.target.checked)} />
                Remove white background (shows satellite around the plots). Crop logos / legends off the plan for the cleanest look.
              </label>
              {o ? (
                <>
                  <div className="field">
                    <label>Site coordinates (from Google Maps)</label>
                    <div className="le-row">
                      <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="17.4622, 78.1544" />
                      <button className="btn ghost" onClick={goToCoords}>Go</button>
                    </div>
                  </div>
                  <button className="btn ghost" onClick={() => { const c = mapRef.current?.getCenter(); if (c) editOverlay({ center: [c.lng, c.lat] }); }}>
                    Move layout to map centre
                  </button>
                  <div className="field">
                    <label>Rotation · {o.rotation.toFixed(1)}°</label>
                    <input type="range" min={-180} max={180} step={0.1} value={o.rotation} onChange={(e) => editOverlay({ rotation: Number(e.target.value) })} />
                  </div>
                  <div className="field">
                    <label>Layout width on ground (metres)</label>
                    <div className="le-row">
                      <input type="range" min={30} max={3000} step={1} value={o.widthMeters} onChange={(e) => editOverlay({ widthMeters: Number(e.target.value) })} />
                      <input type="number" value={o.widthMeters} onChange={(e) => editOverlay({ widthMeters: Math.max(1, Number(e.target.value)) })} style={{ width: 90 }} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Opacity · {Math.round(o.opacity * 100)}%</label>
                    <input type="range" min={0.2} max={1} step={0.01} value={o.opacity} onChange={(e) => editOverlay({ opacity: Number(e.target.value) })} />
                  </div>
                  <div className="le-box">
                    <b>Calibrate scale</b>
                    <p className="le-muted">Measure one printed dimension (e.g. a plot side marked 16.77) for exact plot sizes.</p>
                    {tool === "measure" ? (
                      <>
                        <div className="le-row">
                          <input value={realMeters} onChange={(e) => setRealMeters(e.target.value)} placeholder="Real length (m)" />
                          <button className="btn" onClick={applyScale} disabled={draft.length < 2}>Apply</button>
                        </div>
                        {measured ? <small className="le-muted">Currently measures {measured.toFixed(2)} m</small> : null}
                        <button className="btn ghost" onClick={() => chooseTool("select")}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn ghost" onClick={() => chooseTool("measure")}>Measure a known length</button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {layout && tab === "plots" ? (
            <div className="le-stack">
              {!o ? <p className="le-muted">Upload the layout image first.</p> : null}
              <div className="le-tools">
                {(["select", "block", "plot"] as Tool[]).map((t) => (
                  <button key={t} className={`tab ${tool === t ? "active" : ""}`} onClick={() => chooseTool(t)}>
                    {t === "select" ? "Select / edit" : t === "block" ? "Draw block" : "Draw single plot"}
                  </button>
                ))}
              </div>

              {tool === "block" || tool === "plot" ? (
                <div className="le-box">
                  <div className="le-grid">
                    {tool === "block" ? (
                      <>
                        <div className="field"><label>Rows</label><input type="number" min={1} value={form.rows} onChange={(e) => setForm({ ...form, rows: Math.max(1, +e.target.value) })} /></div>
                        <div className="field"><label>Columns</label><input type="number" min={1} value={form.cols} onChange={(e) => setForm({ ...form, cols: Math.max(1, +e.target.value) })} /></div>
                        <div className="field"><label>Numbering</label>
                          <select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value as "down" | "across" })}>
                            <option value="down">Down columns</option><option value="across">Across rows</option>
                          </select>
                        </div>
                      </>
                    ) : null}
                    <div className="field"><label>{tool === "block" ? "First plot no." : "Plot no."}</label><input value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
                    <div className="field"><label>Step</label>
                      <select value={form.step} onChange={(e) => setForm({ ...form, step: +e.target.value })}><option value={1}>+1</option><option value={-1}>−1</option></select>
                    </div>
                    <div className="field"><label>Area (Sq.Yds)</label><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value.replace(/[^\d.]/g, "") })} placeholder="measured" /></div>
                    <div className="field"><label>Facing</label>
                      <select value={form.facing} onChange={(e) => setForm({ ...form, facing: e.target.value })}><option value="">—</option>{FACINGS.map((f) => <option key={f}>{f}</option>)}</select>
                    </div>
                    <div className="field"><label>Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlotStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                    </div>
                    <div className="field"><label>Zone</label>
                      <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}><option value="">—</option>{layout.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
                    </div>
                  </div>
                  <div className="le-row">
                    <button className="btn ghost" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>Undo point</button>
                    {tool === "block" ? (
                      <button className="btn" onClick={createBlock} disabled={draft.length < 4}>Create {form.rows * form.cols} plots</button>
                    ) : (
                      <button className="btn" onClick={finishPlot} disabled={draft.length < 3}>Finish plot</button>
                    )}
                  </div>
                </div>
              ) : null}

              {tool === "select" && selected && o ? (
                <div className="le-box">
                  <b>Plot {selected.number}</b>
                  <small className="le-muted">
                    Measured {(areaM2(o, selected.points) / SQYD_TO_M2).toFixed(1)} Sq.Yds · {areaM2(o, selected.points).toFixed(1)} m²
                  </small>
                  <div className="le-grid">
                    <div className="field"><label>Plot no.</label><input value={selected.number} onChange={(e) => updatePlot({ number: e.target.value })} /></div>
                    <div className="field"><label>Area (Sq.Yds)</label>
                      <input value={selected.areaSqYd ?? ""} placeholder="measured" onChange={(e) => updatePlot({ areaSqYd: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : undefined })} />
                    </div>
                    <div className="field"><label>Facing</label>
                      <select value={selected.facing ?? ""} onChange={(e) => updatePlot({ facing: e.target.value || undefined })}><option value="">—</option>{FACINGS.map((f) => <option key={f}>{f}</option>)}</select>
                    </div>
                    <div className="field"><label>Status</label>
                      <select value={selected.status} onChange={(e) => updatePlot({ status: e.target.value as PlotStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                    </div>
                    <div className="field"><label>Zone</label>
                      <select value={selected.zone ?? ""} onChange={(e) => updatePlot({ zone: e.target.value || undefined })}><option value="">—</option>{layout.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
                    </div>
                    <div className="field"><label>Price override (₹)</label>
                      <input value={selected.price ?? ""} placeholder={layout.ratePerSqYd ? "rate × area" : "not set"} inputMode="numeric"
                        onChange={(e) => updatePlot({ price: Number(e.target.value.replace(/\D/g, "")) || undefined })} />
                    </div>
                  </div>
                  <small className="le-muted">Drag the white corner handles on the map to fine-tune this plot&apos;s shape.</small>
                  <button className="btn ghost danger" onClick={() => { edit((l) => ({ ...l, plots: l.plots.filter((p) => p.id !== selectedId) })); setSelectedId(null); }}>
                    Delete plot
                  </button>
                </div>
              ) : tool === "select" ? (
                <p className="le-muted">Click a plot on the map to edit its number, area, facing, status or zone.</p>
              ) : null}

              <div className="le-counts">
                {counts.map(({ s, n }) => (
                  <span key={s}><i style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]} <b>{n}</b></span>
                ))}
              </div>
              {layout.plots.length ? (
                <button className="btn ghost danger" onClick={() => confirm(`Delete all ${layout.plots.length} plots?`) && edit((l) => ({ ...l, plots: [] }))}>
                  Delete all plots
                </button>
              ) : null}
            </div>
          ) : null}

          {layout && tab === "details" ? (
            <div className="le-stack">
              <div className="field">
                <label>Project description (Info panel)</label>
                <textarea value={layout.description} onChange={(e) => edit((l) => ({ ...l, description: e.target.value }))} />
              </div>
              <div className="field">
                <label>WhatsApp number (with country code)</label>
                <input value={layout.whatsapp} placeholder="919876543210" onChange={(e) => edit((l) => ({ ...l, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 15) }))} />
              </div>
              <div className="field">
                <label>Price per Sq.Yd (₹) — shows prices, EMI and budget filter to buyers</label>
                <input value={layout.ratePerSqYd ?? ""} placeholder="e.g. 32000" inputMode="numeric"
                  onChange={(e) => edit((l) => ({ ...l, ratePerSqYd: Number(e.target.value.replace(/\D/g, "")) || null }))} />
              </div>
              <div className="field">
                <label>Approvals (one per line — shown as trust badges)</label>
                <textarea value={layout.approvals.join("\n")} placeholder={"HMDA LP No. …\nTS RERA No. …"}
                  onChange={(e) => edit((l) => ({ ...l, approvals: e.target.value.split("\n").map((s) => s.slice(0, 120)).slice(0, 10) }))}
                  onBlur={() => edit((l) => ({ ...l, approvals: l.approvals.map((s) => s.trim()).filter(Boolean) }))} />
              </div>
              <div className="field">
                <label>Location advantages</label>
                {layout.nearby.map((n, i) => (
                  <div className="le-row" key={i}>
                    <input value={n.name} placeholder="Outer Ring Road" onChange={(e) => edit((l) => ({ ...l, nearby: l.nearby.map((q, j) => (j === i ? { ...q, name: e.target.value.slice(0, 80) } : q)) }))} />
                    <input value={n.distance} placeholder="3 min" style={{ maxWidth: 110 }} onChange={(e) => edit((l) => ({ ...l, nearby: l.nearby.map((q, j) => (j === i ? { ...q, distance: e.target.value.slice(0, 40) } : q)) }))} />
                    <button className="btn ghost danger" onClick={() => edit((l) => ({ ...l, nearby: l.nearby.filter((_, j) => j !== i) }))}>×</button>
                  </div>
                ))}
                <button className="btn ghost" onClick={() => edit((l) => ({ ...l, nearby: [...l.nearby, { name: "", distance: "" }] }))}>+ Add place</button>
              </div>

              <div className="field">
                <label>Zones (e.g. plot size, phase, BHK)</label>
                {layout.zones.map((z) => (
                  <div className="le-row" key={z.id}>
                    <input type="color" value={z.color} onChange={(e) => edit((l) => ({ ...l, zones: l.zones.map((q) => (q.id === z.id ? { ...q, color: e.target.value } : q)) }))} />
                    <input value={z.name} onChange={(e) => edit((l) => ({ ...l, zones: l.zones.map((q) => (q.id === z.id ? { ...q, name: e.target.value } : q)) }))} />
                    <button className="btn ghost danger" onClick={() => edit((l) => ({ ...l, zones: l.zones.filter((q) => q.id !== z.id), plots: l.plots.map((p) => (p.zone === z.id ? { ...p, zone: undefined } : p)) }))}>×</button>
                  </div>
                ))}
                <button className="btn ghost" onClick={() => edit((l) => ({ ...l, zones: [...l.zones, { id: crypto.randomUUID(), name: `Zone ${l.zones.length + 1}`, color: ["#f5adff", "#fdcd49", "#68b0fd", "#8dfe76", "#ff8f6b"][l.zones.length % 5] }] }))}>
                  + Add zone
                </button>
              </div>

              <div className="field">
                <label>Gallery ({layout.gallery.length})</label>
                <div className="le-thumbs">
                  {layout.gallery.map((g) => (
                    <button key={g} title="Remove" onClick={() => edit((l) => ({ ...l, gallery: l.gallery.filter((x) => x !== g) }))}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g} alt="" />
                    </button>
                  ))}
                </div>
                <label className="upload compact">
                  Add renders / site photos <b>Choose images</b>
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => onGallery(e.target.files)} />
                </label>
              </div>

              <div className="field">
                <label>Brochure (PDF)</label>
                {layout.brochure ? (
                  <div className="le-row">
                    <a href={layout.brochure} target="_blank" rel="noopener" className="btn ghost">View brochure</a>
                    <button className="btn ghost danger" onClick={() => edit((l) => ({ ...l, brochure: null }))}>Remove</button>
                  </div>
                ) : null}
                <label className="upload compact">
                  {layout.brochure ? "Replace" : "Upload"} brochure <b>Choose PDF</b>
                  <input type="file" accept="application/pdf" hidden onChange={(e) => onBrochure(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
