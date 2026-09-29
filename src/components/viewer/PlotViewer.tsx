"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./viewer.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { formatInr, plotPrice, VentureLayout } from "@/shared/layout";
import { PlotStatus, STATUS_COLOR, STATUS_LABEL, TAKEN } from "@/shared/types";
import { useToast } from "../ToastProvider";
import {
  addLayoutLayers, ColorMode, loadMaplibre, mapStyle, paintPlots, plotBounds, set3d, siteBounds, syncLayout,
} from "./mapLayers";
import type { VentureCard } from "@/shared/ventures";
import { Icon } from "./icons";
import { BrochureModal, GalleryModal, InfoModal, ShareModal } from "./ViewerModals";
import { CompareModal, EnquiryModal, FindPanel, useShortlist } from "./BuyerTools";
import { isFiltering, matchPlots, NO_FILTER, PlotFilter } from "@/shared/plotFilter";

const VIEWER = { editor: false };
const POLL_MS = 15000;

type Modal = "info" | "share" | "gallery" | "brochure" | "enquiry" | "compare" | null;

export default function PlotViewer({
  venture,
  layout: initialLayout,
  others,
  embedded = false,
  initialStatus = false,
  initialPlot = null,
  initialFilter = null,
  admin = false,
}: {
  venture: VentureCard & { center: [number, number] };
  layout: VentureLayout;
  others: VentureCard[];
  embedded?: boolean;
  initialStatus?: boolean;
  initialPlot?: string | null; // ?plot=106 deep link
  initialFilter?: PlotFilter | null; // from the home page "Find my plot"
  admin?: boolean; // admin portal: same map, plus changing the selected plot's status
}) {
  const showToast = useToast();
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const gpsRef = useRef<Marker | null>(null);
  const [layout, setLayout] = useState(initialLayout); // statuses refresh live
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ColorMode>(initialStatus || initialFilter ? "status" : "none");
  const [selected, setSelected] = useState<string | null>(null);
  const [is3d, setIs3d] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [search, setSearch] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [findOpen, setFindOpen] = useState(!!initialFilter);
  const [filter, setFilter] = useState<PlotFilter>(initialFilter ?? NO_FILTER);
  const shortlist = useShortlist(layout.slug);
  const o = layout.overlay;
  const plot = layout.plots.find((p) => p.id === selected);
  const price = plot ? plotPrice(layout, plot) : null;
  const highlight = findOpen && (isFiltering(filter) || filter.availableOnly) ? matchPlots(layout, filter).map((p) => p.id) : null;

  function fitPlot(map: MLMap, id: string) {
    const p = layout.plots.find((q) => q.id === id);
    if (!p || !o) return;
    const pad = Math.min(map.getContainer().clientWidth, map.getContainer().clientHeight) * 0.28;
    map.fitBounds(plotBounds(o, p.points), { padding: pad, maxZoom: 21.5, bearing: map.getBearing(), pitch: map.getPitch(), duration: 900 });
  }

  function goHome(animate = true) {
    const map = mapRef.current;
    if (!map || !o) return;
    map.fitBounds(siteBounds(layout), { padding: 40, bearing: 0, pitch: is3d ? 55 : 0, duration: animate ? 900 : 0 });
  }

  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then(({ Map }) => {
      if (cancelled || !divRef.current) return;
      const map = new Map({
        container: divRef.current,
        style: mapStyle(true),
        center: o?.center ?? [venture.center[1], venture.center[0]],
        zoom: 16,
        maxZoom: 22,
        maxPitch: 70,
        cooperativeGestures: embedded,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.on("load", () => {
        addLayoutLayers(map, layout, VIEWER);
        if (o) map.fitBounds(siteBounds(layout), { padding: 40, duration: 0 });
        const deep = initialPlot && layout.plots.find((p) => p.number === initialPlot);
        if (deep) {
          setSelected(deep.id);
          fitPlot(map, deep.id);
        }
        setReady(true);
      });
      map.on("click", "plots-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (!id) return;
        setSelected(id);
        fitPlot(map, id);
      });
      map.on("mouseenter", "plots-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "plots-fill", () => (map.getCanvas().style.cursor = ""));
      map.on("rotate", () => setBearing(map.getBearing()));
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // map is built once; layout is fixed for the page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
    if (ready && mapRef.current) syncLayout(mapRef.current, layout, VIEWER);
  }, [ready, layout]);

  const highlightKey = highlight?.join(",") ?? "";
  useEffect(() => {
    if (ready && mapRef.current) paintPlots(mapRef.current, layout, mode, selected, VIEWER, highlightKey ? highlightKey.split(",") : null);
  }, [ready, mode, selected, layout, highlightKey]);

  // Live availability: poll statuses; tell viewers when a plot they're looking at gets booked.
  useEffect(() => {
    if (!o) return;
    let last = initialLayout.updatedAt ?? null;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetch(`/api/layouts/${initialLayout.slug}/status`).then((x) => x.json()).catch(() => null);
      if (!r || r.updatedAt === last) return;
      last = r.updatedAt;
      const l = layoutRef.current;
      const booked = l.plots.filter((p) => p.status === "available" && TAKEN.includes(r.statuses[p.id]));
      if (booked.length) showToast(booked.length === 1 ? `Plot ${booked[0].number} was just booked` : `${booked.length} plots were just booked`);
      setLayout({ ...l, plots: l.plots.map((p) => (r.statuses[p.id] ? { ...p, status: r.statuses[p.id] as PlotStatus } : p)) });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [o, initialLayout.slug, initialLayout.updatedAt, showToast]);

  async function setPlotStatus(status: PlotStatus) {
    if (!plot) return;
    const res = await fetch(`/api/layouts/${layout.slug}/plots`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [plot.id], status }),
    });
    if (!res.ok) return showToast((await res.json().catch(() => ({}))).error ?? "Could not update");
    setLayout((l) => ({ ...l, plots: l.plots.map((p) => (p.id === plot.id ? { ...p, status } : p)) }));
    showToast(`Plot ${plot.number} marked ${STATUS_LABEL[status]} — live for buyers`);
  }

  function pick(id: string) {
    setSelected(id);
    if (mapRef.current) fitPlot(mapRef.current, id);
  }

  function toggle3d() {
    const next = !is3d;
    setIs3d(next);
    if (!mapRef.current) return;
    set3d(mapRef.current, next);
    mapRef.current.easeTo({ pitch: next ? 55 : 0, duration: 800 });
  }

  function runSearch() {
    const q = (search ?? "").trim().replace(/^p-?/i, "").toLowerCase();
    if (!q) return;
    const p = layout.plots.find((x) => x.number.toLowerCase() === q || x.number.replace(/^0+/, "").toLowerCase() === q.replace(/^0+/, ""));
    if (!p) return showToast(`Plot ${search} not found`);
    setSelected(p.id);
    setSearch(null);
    if (mapRef.current) fitPlot(mapRef.current, p.id);
  }

  function showGps() {
    if (!navigator.geolocation) return showToast("Location is not available on this device");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const map = mapRef.current;
        if (!map) return;
        const { Marker } = await loadMaplibre();
        const el = document.createElement("div");
        el.className = "pv-gps-dot";
        gpsRef.current?.remove();
        gpsRef.current = new Marker({ element: el }).setLngLat([coords.longitude, coords.latitude]).addTo(map);
        const pts: [number, number][] = [[coords.longitude, coords.latitude], ...(o ? siteBounds(layout) : [])];
        const lng = pts.map((p) => p[0]), lat = pts.map((p) => p[1]);
        map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: 80, maxZoom: 18, duration: 900 });
      },
      () => showToast("Allow location access to see where you are")
    );
  }

  function locate() {
    const [lng, lat] = o?.center ?? [venture.center[1], venture.center[0]];
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener");
  }

  const waText = plot
    ? `Hi, I'm interested in plot ${plot.number} at ${venture.name}.`
    : `Hi, I'd like to know more about ${venture.name}.`;
  const legend = mode === "status"
    ? (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => ({ name: STATUS_LABEL[s], color: STATUS_COLOR[s] }))
    : mode === "zones" ? layout.zones.map((z) => ({ name: z.name, color: z.color })) : [];

  return (
    <div className={`pv ${embedded ? "pv-embedded" : ""}`}>
      <div className="pv-map" ref={divRef} />

      {!o ? (
        <div className="pv-empty">
          <b>Layout coming soon</b>
          <span>The interactive plot layout for {venture.name} hasn&apos;t been published yet.</span>
        </div>
      ) : null}

      <div className="pv-brand">
        <span className="pv-logo">{venture.logo}</span>
        <span className="pv-name">{venture.name.toUpperCase()}</span>
      </div>
      <button className="pv-compass" onClick={() => mapRef.current?.easeTo({ bearing: 0 })} aria-label="Reset north">
        <span style={{ transform: `rotate(${-bearing}deg)` }}>
          <i className="n">N</i><i className="e">E</i><i className="s">S</i><i className="w">W</i><b />
        </span>
      </button>
      {embedded ? (
        <Link className="pv-badge" href={`/explore/${layout.slug}`}>Full screen ↗</Link>
      ) : (
        <Link className="pv-badge" href="/">VENTURE<span>.</span></Link>
      )}

      {legend.length ? (
        <div className="pv-legend">
          {legend.map((l) => (
            <span key={l.name}><i style={{ background: l.color }} />{l.name}</span>
          ))}
        </div>
      ) : null}

      <div className="pv-side">
        <button className="pv-round" onClick={toggle3d}>{is3d ? "2D" : "3D"}</button>
        <button className="pv-round" onClick={() => goHome()} aria-label="Show whole venture"><Icon name="home" /></button>
        <button className="pv-round" onClick={() => setModal("share")} aria-label="Share"><Icon name="share" /></button>
      </div>

      <div className="pv-dock">
        <div className="pv-dock-top">
          <div className="pv-toggles">
            {o ? (
              <button className={`pv-pill pv-find-btn ${findOpen ? "on" : ""}`} onClick={() => setFindOpen((v) => !v)} aria-expanded={findOpen}>
                <Icon name="search" /> Find plot
              </button>
            ) : null}
            {layout.zones.length ? (
              <label className="pv-pill pv-toggle">
                Zones
                <input type="checkbox" checked={mode === "zones"} onChange={(e) => setMode(e.target.checked ? "zones" : "none")} />
                <i />
              </label>
            ) : null}
            <label className="pv-pill pv-toggle">
              Status
              <input type="checkbox" checked={mode === "status"} onChange={(e) => setMode(e.target.checked ? "status" : "none")} />
              <i />
            </label>
          </div>
          <div className="pv-ctas">
            {admin && plot ? (
              <label className="pv-pill pv-wa pv-admin-status">
                <i className="pv-dot" style={{ background: STATUS_COLOR[plot.status] }} />
                <span>
                  <b>Plot {plot.number}</b>
                  <select value={plot.status} onChange={(e) => setPlotStatus(e.target.value as PlotStatus)} aria-label={`Status of plot ${plot.number}`}>
                    {(Object.keys(STATUS_LABEL) as PlotStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </span>
              </label>
            ) : null}
            {o && !admin ? (
              <button className="pv-pill pv-wa pv-enquire" onClick={() => setModal("enquiry")}>
                <span className="pv-enq-icon"><Icon name="calendar" size={20} /></span>
                <span>
                  <b>{plot ? `Plot ${plot.number}${price ? ` · ${formatInr(price)}` : ""}` : "Site visit"}</b>
                  <small>{plot ? "Book visit / enquire" : "Book a free site visit"}</small>
                </span>
              </button>
            ) : null}
            {layout.whatsapp && !admin ? (
              <a className="pv-pill pv-wa" target="_blank" rel="noopener" href={`https://wa.me/${layout.whatsapp}?text=${encodeURIComponent(waText)}`}>
                <span className="pv-wa-icon"><Icon name="whatsapp" size={22} /></span>
                <span>
                  <b>WhatsApp</b>
                  <small>{plot ? `Inquire plot ${plot.number}` : "Inquire project"}</small>
                </span>
              </a>
            ) : null}
          </div>
        </div>
        <div className="pv-grid">
          <button className="pv-pill" onClick={() => (layout.gallery.length ? setModal("gallery") : showToast("Gallery coming soon"))}><Icon name="gallery" /> Gallery</button>
          {search === null ? (
            <button className="pv-pill" onClick={() => setSearch("")}><Icon name="search" /> Search</button>
          ) : (
            <input
              className="pv-pill pv-search"
              autoFocus
              placeholder="Plot no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
                if (e.key === "Escape") setSearch(null);
              }}
              onBlur={() => !search && setSearch(null)}
            />
          )}
          <button className="pv-pill" onClick={showGps}><Icon name="gps" /> GPS</button>
          <button className="pv-pill" onClick={() => (layout.brochure ? setModal("brochure") : showToast("Brochure coming soon"))}><Icon name="brochure" /> Brochure</button>
          <button className="pv-pill" onClick={() => setModal("info")}><Icon name="info" /> Info</button>
          <button className="pv-pill" onClick={locate}><Icon name="locate" /> Locate</button>
        </div>
      </div>

      {findOpen && o ? (
        <FindPanel
          layout={layout}
          filter={filter}
          onChange={setFilter}
          onPick={pick}
          onClose={() => setFindOpen(false)}
          shortlist={shortlist.ids}
          onCompare={() => setModal("compare")}
        />
      ) : null}

      {modal === "enquiry" ? (
        <EnquiryModal
          layout={layout}
          venture={venture}
          plot={plot ?? null}
          shortlisted={!!plot && shortlist.ids.includes(plot.id)}
          onToggleShortlist={() => plot && shortlist.toggle(plot.id)}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "compare" ? (
        <CompareModal layout={layout} ids={shortlist.ids} onPick={(id) => { setModal(null); pick(id); }} onRemove={shortlist.toggle} onClose={() => setModal(null)} />
      ) : null}
      {modal === "info" ? <InfoModal venture={venture} layout={layout} others={others} onClose={() => setModal(null)} /> : null}
      {modal === "share" ? <ShareModal slug={layout.slug} name={venture.name} plotNumber={plot?.number ?? null} onClose={() => setModal(null)} /> : null}
      {modal === "gallery" ? <GalleryModal images={layout.gallery} onClose={() => setModal(null)} /> : null}
      {modal === "brochure" && layout.brochure ? <BrochureModal url={layout.brochure} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
