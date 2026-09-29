"use client";

import { useState } from "react";
import { PLOT_STATUSES, STATUS_COLOR, STATUS_LABEL } from "@/shared/types";
import { plotPrice } from "@/shared/layout";
import { AMENITY_OPTIONS, emptyVenture, initials, isPublicVenture, Venture, VENTURE_STATUS_LABEL, VENTURE_STATUSES, VentureStatus } from "@/shared/ventures";
import { useToast } from "../ToastProvider";
import { countPlots, useLayouts } from "./adminData";
import { shrink, upload } from "./uploads";
import { useVentures, VentureSelect } from "./VenturesContext";

// AdminApp remounts this view per venture (key), which resets the form.
export default function VentureManagerView({ slug, onSelectVenture, isAdmin, onOpenLayouts }: {
  slug: string;
  onSelectVenture: (slug: string) => void;
  isAdmin: boolean;
  onOpenLayouts: () => void;
}) {
  const showToast = useToast();
  const { ventures, bySlug, reload } = useVentures();
  const layouts = useLayouts(ventures);
  const existing = bySlug(slug);
  const [creating, setCreating] = useState(!existing);
  const [v, setV] = useState<Venture>(existing ?? emptyVenture());
  const [coords, setCoords] = useState(existing ? `${existing.lat}, ${existing.lng}` : "");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const layout = creating ? null : layouts?.[slug] ?? null;
  const counts = countPlots(layout);
  const edit = (patch: Partial<Venture>) => { setV({ ...v, ...patch }); setDirty(true); };
  const ro = !isAdmin;

  function startNew() {
    setCreating(true);
    setV(emptyVenture());
    setCoords("");
    setDirty(false);
  }

  function applyCoords(text: string) {
    setCoords(text);
    const m = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); // "17.59, 78.44" or a Google Maps URL "@17.59,78.44,…"
    if (m) edit({ lat: Number(m[1]), lng: Number(m[2]) });
  }

  async function uploadImage(file: File | undefined, field: "logoUrl" | "coverUrl") {
    if (!file) return;
    try {
      setBusy(field === "logoUrl" ? "Uploading logo…" : "Uploading cover…");
      const url = await upload((await shrink(file, field === "logoUrl" ? 600 : 2000)).file);
      edit({ [field]: url });
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("Saving…");
    const res = await fetch(creating ? "/api/ventures" : `/api/ventures/${slug}`, {
      method: creating ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v),
    });
    setBusy("");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return showToast(j.error ?? "Could not save");
    await reload();
    setDirty(false);
    showToast(creating ? `${v.name} created — next, upload its layout in Layouts & GIS` : `${v.name} saved`);
    if (creating) onSelectVenture(j.slug);
  }

  const checklist: { label: string; done: boolean }[] = [
    { label: "Name, city and address", done: !!(v.name && v.city && v.address) },
    { label: "Location pinned (coordinates)", done: !!coords },
    { label: "Logo", done: !!v.logoUrl },
    { label: "Cover image", done: !!v.coverUrl },
    { label: "Layout plan uploaded", done: !!layout?.overlay },
    { label: "Plots marked on the layout", done: (layout?.plots.length ?? 0) > 0 },
    { label: "Drawn layout shown to buyers", done: !!layout && !layout.showPlan && layout.features.some((f) => f.kind === "boundary") },
    { label: "Prices set", done: !!layout && layout.plots.some((p) => plotPrice(layout, p) !== null) },
    { label: "Approvals / RERA", done: !!(v.rera || layout?.approvals.length) },
    { label: "Gallery photos", done: (layout?.gallery.length ?? 0) > 0 },
    { label: "Brochure", done: !!layout?.brochure },
    { label: "WhatsApp number", done: !!layout?.whatsapp },
    { label: "Visible to buyers (Live / Coming soon)", done: isPublicVenture(v) },
  ];

  return (
    <section>
      <div className="eyebrow">Portfolio / Venture manager</div>
      <div className="page-title-row">
        <div>
          <h1>Venture management</h1>
          <p style={{ color: "#7b867f" }}>Create and edit ventures. Draft and archived ventures are hidden from buyers.</p>
        </div>
        {isAdmin ? <button className="btn" onClick={startNew}>+ New venture</button> : null}
      </div>

      <div className="card venture-selector-card">
        <div className="cardhead">
          <b>{creating ? "New venture" : "Select venture"}</b>
          <span>{creating ? "Fill in the details and click Create venture" : "Switch the complete venture workspace"}</span>
        </div>
        <div className="venture-select-row">
          <div className="field">
            <label>Active venture</label>
            {creating ? (
              <button className="btn ghost" onClick={() => { setCreating(false); setV(existing ?? emptyVenture()); setDirty(false); }} disabled={!existing}>
                ← Back to {existing?.name ?? "list"}
              </button>
            ) : <VentureSelect value={slug} onChange={onSelectVenture} />}
          </div>
          {!creating ? (
            <div className="venture-live-summary">
              <span><b>{VENTURE_STATUS_LABEL[v.status]}</b></span>
              <span>{v.city || "—"}</span>
              {counts ? <><span>{counts.total} plots</span><span>{counts.available} available · {counts.sold} sold</span></> : <span>No layout published</span>}
              <span>/explore/{slug}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="venture-form-hero">
        <div className="venture-brand-side">
          <div className="venture-logo-box">
            {v.logoUrl ? <LogoImg src={v.logoUrl} /> : <div className="venture-logo-symbol">{v.logoText || initials(v.name || "V")}</div>}
          </div>
          <div>
            <div className="venture-brand-name">{(v.name || "Venture name").toUpperCase()}</div>
            <div className="venture-brand-tag">{v.tagline || "Tagline"}</div>
            <div className="venture-address">{v.address || "Address"}</div>
            <div className="venture-location">📍 <span>{[v.locality, v.city].filter(Boolean).join(", ") || "City"}</span></div>
          </div>
        </div>
        <div className="venture-plot-side">
          <div className="plot-summary-grid">
            <div><small>Total Plots</small><strong>{counts?.total ?? "—"}</strong></div>
            <div><small>Available</small><strong>{counts?.available ?? "—"}</strong></div>
            <div><small>Booked</small><strong>{counts ? counts.confirmed + counts.received : "—"}</strong></div>
            <div><small>Sold Out</small><strong>{counts?.sold ?? "—"}</strong></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardhead">
          <b>{creating ? "Create venture" : "Edit venture"}</b>
          <span>{ro ? "Read-only for sales" : dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        <fieldset className="formgrid" disabled={ro || !!busy}>
          <div className="field"><label>Venture name *</label><input value={v.name} onChange={(e) => edit({ name: e.target.value, logoText: v.logoText || "" })} placeholder="My Fortune" /></div>
          <div className="field">
            <label>Status *</label>
            <select value={v.status} onChange={(e) => edit({ status: e.target.value as VentureStatus })}>
              {VENTURE_STATUSES.map((s) => <option key={s} value={s}>{VENTURE_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="field"><label>Tagline</label><input value={v.tagline} onChange={(e) => edit({ tagline: e.target.value })} placeholder="Experience the Luck" /></div>
          <div className="field"><label>Logo initials (when no logo image)</label><input value={v.logoText} maxLength={3} onChange={(e) => edit({ logoText: e.target.value.toUpperCase() })} placeholder={initials(v.name || "V")} /></div>
          <div className="field"><label>City / area *</label><input value={v.city} onChange={(e) => edit({ city: e.target.value })} placeholder="Dundigal, Hyderabad" /></div>
          <div className="field"><label>Locality / landmark</label><input value={v.locality} onChange={(e) => edit({ locality: e.target.value })} /></div>
          <div className="field full"><label>Full address *</label><textarea value={v.address} onChange={(e) => edit({ address: e.target.value })} placeholder="Survey number, road, village, mandal, district, state" /></div>
          <div className="field"><label>PIN code</label><input value={v.pin} maxLength={6} inputMode="numeric" onChange={(e) => edit({ pin: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field">
            <label>Coordinates * (paste from Google Maps)</label>
            <input value={coords} onChange={(e) => applyCoords(e.target.value)} placeholder="17.5935, 78.4405" />
          </div>
          <div className="field"><label>Total acres</label><input value={v.acres} inputMode="decimal" onChange={(e) => edit({ acres: e.target.value.replace(/[^\d.]/g, "") })} /></div>
          <div className="field"><label>RERA / HMDA approval number</label><input value={v.rera} onChange={(e) => edit({ rera: e.target.value })} /></div>
          <div className="field"><label>Order in lists (1 = first)</label><input type="number" min={0} max={999} value={v.sort} onChange={(e) => edit({ sort: Number(e.target.value) || 0 })} /></div>
          <div className="field">
            <label>Total plots</label>
            <input value={counts ? String(counts.total) : "Counted from the layout"} readOnly />
          </div>
          <div className="field full">
            <label>Logo &amp; cover</label>
            <div className="brand-editor">
              <label className="upload compact le-upload">
                {v.logoUrl ? "Replace logo" : "Upload logo"} <b>PNG / JPG / WebP</b><br /><small>Square, transparent background works best</small>
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadImage(e.target.files?.[0], "logoUrl")} />
              </label>
              <label className="upload compact le-upload">
                {v.coverUrl ? "Replace cover image" : "Upload cover image"} <b>JPG / WebP</b><br /><small>Shown on venture cards · 1600 × 900 recommended</small>
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadImage(e.target.files?.[0], "coverUrl")} />
              </label>
            </div>
            {v.logoUrl || v.coverUrl ? (
              <div className="le-row" style={{ marginTop: 8 }}>
                {v.logoUrl ? <button type="button" className="btn ghost danger" onClick={() => edit({ logoUrl: null })}>Remove logo</button> : null}
                {v.coverUrl ? <button type="button" className="btn ghost danger" onClick={() => edit({ coverUrl: null })}>Remove cover</button> : null}
              </div>
            ) : null}
          </div>
          <div className="field full">
            <label>Amenities</label>
            <div className="check-grid">
              {AMENITY_OPTIONS.map((a) => (
                <label key={a}>
                  <input type="checkbox" checked={v.amenities.includes(a)} onChange={(e) => edit({ amenities: e.target.checked ? [...v.amenities, a] : v.amenities.filter((x) => x !== a) })} /> {a}
                </label>
              ))}
            </div>
          </div>
        </fieldset>
        <p className="le-muted" style={{ marginTop: 12 }}>
          The plot map, description, photos, brochure, prices, approvals and WhatsApp number are managed in{" "}
          {isAdmin && !creating ? <button className="pv-link-admin" onClick={onOpenLayouts}>Layouts &amp; GIS</button> : "Layouts & GIS"}.
        </p>
        {!ro ? (
          <div className="formactions">
            {!creating && dirty ? <button className="btn ghost" onClick={() => { setV(existing!); setCoords(`${existing!.lat}, ${existing!.lng}`); setDirty(false); }}>Discard changes</button> : null}
            <button className="btn" onClick={save} disabled={!!busy || (!dirty && !creating)}>{busy || (creating ? "Create venture" : "Save venture")}</button>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="cardhead">
          <b>Plot status by project</b>
          <span>Live from each published layout · click a row to open that venture</span>
        </div>
        <table className="inventory venture-status-table">
          <thead>
            <tr><th>Project name</th><th>Status</th><th>Total plots</th>{PLOT_STATUSES.map((s) => <th key={s}>{STATUS_LABEL[s]}</th>)}</tr>
          </thead>
          <tbody>
            {ventures.map((p) => {
              const c = countPlots(layouts?.[p.slug]);
              return (
                <tr key={p.slug} className={p.slug === slug && !creating ? "active" : ""} onClick={() => onSelectVenture(p.slug)}>
                  <td><b>{p.name}</b></td>
                  <td><span className={`badge ${p.status === "live" ? "available" : p.status === "coming_soon" ? "hold" : "mortgage"}`}>{VENTURE_STATUS_LABEL[p.status].replace(/ \(.*\)/, "")}</span></td>
                  <td>{c ? c.total : layouts ? "—" : "…"}</td>
                  {PLOT_STATUSES.map((s) => (
                    <td key={s}>{c ? <span className={`count-chip ${c[s] ? "" : "zero"}`} style={{ "--c": STATUS_COLOR[s] } as React.CSSProperties}>{c[s]}</span> : "—"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {layouts ? (
            <tfoot>
              <tr>
                <td><b>Total</b></td><td />
                <td><b>{Object.values(layouts).reduce((a, l) => a + (countPlots(l)?.total ?? 0), 0)}</b></td>
                {PLOT_STATUSES.map((s) => <td key={s}><b>{Object.values(layouts).reduce((a, l) => a + (countPlots(l)?.[s] ?? 0), 0)}</b></td>)}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <b>Venture setup checklist</b>
            <span>{checklist.filter((c) => c.done).length} / {checklist.length}</span>
          </div>
          <div className="mini-list">
            {checklist.map((c) => (
              <p key={c.label}>{c.label} <b style={{ color: c.done ? "#2c7a3f" : "#c59b54" }}>{c.done ? "✓" : "Pending"}</b></p>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="cardhead"><b>Customer-facing preview</b><span>Updates as you type</span></div>
          <div className="preview-mini">
            <div className="preview-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.coverUrl ?? satellite(v)} alt={v.name} />
            </div>
            <h3>{v.name || "Untitled venture"}</h3>
            <p>{v.city || "Location"} · {v.acres || "—"} acres · {counts?.total ?? "—"} plots</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function satellite(v: Venture) {
  const d = 0.004;
  const bbox = [v.lng - d, v.lat - d * 0.55, v.lng + d, v.lat + d * 0.55].join("%2C");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=900%2C500&imageSR=4326&format=jpg&f=image`;
}

function LogoImg({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}
