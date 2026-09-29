"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInr, plotAreaSqYd, plotPrice, VentureLayout } from "@/shared/layout";
import { PlotStatus, STATUS_LABEL } from "@/shared/types";
import { useVentures, VentureSelect } from "./VenturesContext";
import { useToast } from "../ToastProvider";
import AdminLayoutMap from "./AdminLayoutMap";

const STATUSES = Object.keys(STATUS_LABEL) as PlotStatus[];

// Live plot inventory from the published layout; sales + admin can change statuses (one or many).
export default function InventoryView({ slug, onSelectVenture }: { slug: string; onSelectVenture: (slug: string) => void }) {
  const showToast = useToast();
  const ventureName = useVentures().bySlug(slug)?.name ?? slug;
  const [layout, setLayout] = useState<VentureLayout | null>(null);
  const [tab, setTab] = useState<PlotStatus | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [asMap, setAsMap] = useState(false);

  // refetch when coming back from the map view, where statuses may have been changed
  useEffect(() => {
    let stale = false;
    fetch(`/api/layouts/${slug}`).then((r) => r.json()).then((l) => !stale && setLayout(l));
    return () => { stale = true; };
  }, [slug, asMap]);

  const rows = useMemo(() => {
    if (!layout?.overlay) return [];
    const q = query.trim().toLowerCase();
    return layout.plots
      .filter((p) => (tab === "all" || p.status === tab) && (!q || p.number.toLowerCase().includes(q)))
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [layout, tab, query]);

  async function setStatus(ids: string[], status: PlotStatus) {
    const res = await fetch(`/api/layouts/${slug}/plots`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, status }),
    });
    if (!res.ok) return showToast((await res.json().catch(() => ({}))).error ?? "Could not update");
    const set = new Set(ids);
    setLayout((l) => l && { ...l, plots: l.plots.map((p) => (set.has(p.id) ? { ...p, status } : p)) });
    setPicked(new Set());
    showToast(`${ids.length} plot${ids.length > 1 ? "s" : ""} marked ${STATUS_LABEL[status]} — live on the customer map`);
  }

  const count = (s: PlotStatus | "all") => (s === "all" ? layout?.plots.length ?? 0 : layout?.plots.filter((p) => p.status === s).length ?? 0);
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));

  return (
    <section>
      <div className="eyebrow">Sales / Plot inventory</div>
      <div className="page-title-row">
        <div>
          <h1>Plot inventory</h1>
          <p style={{ color: "#7b867f" }}>Live from the published layout — status changes appear on the customer map within seconds.</p>
        </div>
        <div className="le-actions">
          <div className="tabs view-switch">
            <button className={`tab ${!asMap ? "active" : ""}`} onClick={() => setAsMap(false)}>Table</button>
            <button className={`tab ${asMap ? "active" : ""}`} onClick={() => setAsMap(true)}>Map</button>
          </div>
          <VentureSelect value={slug} onChange={onSelectVenture} />
        </div>
      </div>
      {asMap ? <AdminLayoutMap slug={slug} /> : (
      <div className="card">
        <div className="tabs">
          {(["all", ...STATUSES] as const).map((s) => (
            <button key={s} className={`tab ${tab === s ? "active" : ""}`} onClick={() => setTab(s)}>
              {s === "all" ? "All" : STATUS_LABEL[s]} {count(s)}
            </button>
          ))}
          <input className="inv-search" placeholder="Search plot no." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {picked.size ? (
          <div className="inv-bulk">
            <b>{picked.size} selected</b>
            {STATUSES.map((s) => <button key={s} className="tab" onClick={() => setStatus([...picked], s)}>Mark {STATUS_LABEL[s]}</button>)}
            <button className="tab" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
        ) : null}
        {!layout ? <p className="le-muted">Loading…</p> : !layout.overlay ? (
          <p className="le-muted">No layout published for {ventureName} yet — upload it in Layouts &amp; GIS.</p>
        ) : (
          <table className="inventory">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                <th>Plot</th><th>Area</th><th>Facing</th><th>Price</th><th>Status</th><th>Change status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const price = plotPrice(layout, p);
                return (
                  <tr key={p.id}>
                    <td><input type="checkbox" aria-label={`Select plot ${p.number}`} checked={picked.has(p.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} /></td>
                    <td><b>P-{p.number}</b></td>
                    <td>{plotAreaSqYd(layout.overlay!, p).toFixed(0)} Sq.Yds</td>
                    <td>{p.facing ?? "—"}</td>
                    <td>{price ? formatInr(price) : "—"}</td>
                    <td><span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                    <td>
                      <select className="inv-select" value={p.status} onChange={(e) => setStatus([p.id], e.target.value as PlotStatus)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      )}
    </section>
  );
}
