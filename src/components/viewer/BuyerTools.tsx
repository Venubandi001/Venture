"use client";

// Buyer tools around the map: find/filter plots, shortlist & compare, enquiry / site-visit booking with EMI, printable plot sheet.
import { useEffect, useMemo, useState } from "react";
import { edgeLengths, emi, formatInr, LayoutPlot, plotAreaSqYd, plotPrice, SQYD_TO_M2, uvToMeters, VentureLayout } from "@/shared/layout";
import { STATUS_COLOR, STATUS_LABEL } from "@/shared/types";
import { VISIT_SLOTS } from "@/shared/leads";
import { matchPlots, NO_FILTER, PlotFilter } from "@/shared/plotFilter";
import type { VentureCard } from "@/shared/ventures";
import { useToast } from "../ToastProvider";
import { Icon } from "./icons";


// ---------- shortlist (per browser) ----------
export function useShortlist(slug: string) {
  const key = `vt-shortlist-${slug}`;
  // read lazily: the list is only rendered inside panels opened after interaction, so SSR ([]) never mismatches
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } // storage blocked: just won't persist
  });
  const toggle = (id: string) => setIds((cur) => {
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-8);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return { ids, toggle };
}

function Shell({ onClose, className = "", children }: { onClose: () => void; className?: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="pv-modal-bg" onClick={onClose}>
      <div className={`pv-modal ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="pv-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

// ---------- Find plot panel ----------
export function FindPanel({ layout, filter, onChange, onPick, onClose, shortlist, onCompare }: {
  layout: VentureLayout;
  filter: PlotFilter;
  onChange: (f: PlotFilter) => void;
  onPick: (id: string) => void;
  onClose: () => void;
  shortlist: string[];
  onCompare: () => void;
}) {
  const hits = useMemo(() => matchPlots(layout, filter), [layout, filter]);
  const facings = [...new Set(layout.plots.map((p) => p.facing).filter(Boolean))] as string[];
  const priced = layout.plots.some((p) => plotPrice(layout, p) !== null);
  const num = (v: string) => (Number(v) > 0 ? Number(v) : null);

  return (
    <div className="pv-find" role="dialog" aria-label="Find a plot">
      <div className="pv-find-head">
        <b>Find your plot</b>
        <button className="pv-close small" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="pv-chips">
        {["", ...facings].map((f) => (
          <button key={f || "any"} className={`pv-chip ${filter.facing === f ? "on" : ""}`} onClick={() => onChange({ ...filter, facing: f })}>
            {f || "Any facing"}
          </button>
        ))}
      </div>
      <div className="pv-find-row">
        <label>Size (Sq.Yds)
          <span><input inputMode="numeric" placeholder="min" value={filter.min ?? ""} onChange={(e) => onChange({ ...filter, min: num(e.target.value) })} />
          –<input inputMode="numeric" placeholder="max" value={filter.max ?? ""} onChange={(e) => onChange({ ...filter, max: num(e.target.value) })} /></span>
        </label>
        {priced ? (
          <label>Budget (₹ lakh)
            <span><input inputMode="numeric" placeholder="up to" value={filter.budget ?? ""} onChange={(e) => onChange({ ...filter, budget: num(e.target.value) })} /></span>
          </label>
        ) : null}
      </div>
      <label className="pv-find-check">
        <input type="checkbox" checked={filter.availableOnly} onChange={(e) => onChange({ ...filter, availableOnly: e.target.checked })} />
        Available plots only
      </label>
      <div className="pv-find-count">{hits.length} matching plot{hits.length === 1 ? "" : "s"} highlighted</div>
      <div className="pv-find-list">
        {hits.slice(0, 60).map((p) => (
          <button key={p.id} className="pv-chip" onClick={() => onPick(p.id)}>{p.number}</button>
        ))}
      </div>
      <div className="pv-find-foot">
        <button className="pv-outline" onClick={() => onChange(NO_FILTER)}>Clear</button>
        <button className="pv-outline" onClick={onCompare} disabled={!shortlist.length}>♥ Shortlist ({shortlist.length}) · Compare</button>
      </div>
    </div>
  );
}

// ---------- Compare shortlisted plots ----------
export function CompareModal({ layout, ids, onPick, onRemove, onClose }: {
  layout: VentureLayout;
  ids: string[];
  onPick: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const o = layout.overlay!;
  const plots = ids.map((id) => layout.plots.find((p) => p.id === id)).filter(Boolean) as LayoutPlot[];
  return (
    <Shell onClose={onClose} className="pv-compare">
      <h3>Compare shortlisted plots</h3>
      {!plots.length ? <p className="pv-muted">Tap ♥ on a plot’s enquiry card to shortlist it.</p> : (
        <div className="pv-compare-scroll">
          <table>
            <tbody>
              <tr><th>Plot</th>{plots.map((p) => <td key={p.id}><b>{p.number}</b></td>)}</tr>
              <tr><th>Status</th>{plots.map((p) => <td key={p.id}><i className="pv-dot" style={{ background: STATUS_COLOR[p.status] }} />{STATUS_LABEL[p.status]}</td>)}</tr>
              <tr><th>Area</th>{plots.map((p) => <td key={p.id}>{plotAreaSqYd(o, p).toFixed(0)} yd²<br /><small>{(plotAreaSqYd(o, p) * SQYD_TO_M2).toFixed(0)} m²</small></td>)}</tr>
              <tr><th>Sides</th>{plots.map((p) => <td key={p.id}><small>{edgeLengths(o, p.points).filter((x) => x >= 1).map((x) => x.toFixed(2)).join(" × ")} m</small></td>)}</tr>
              <tr><th>Facing</th>{plots.map((p) => <td key={p.id}>{p.facing ?? "—"}</td>)}</tr>
              <tr><th>Price</th>{plots.map((p) => { const v = plotPrice(layout, p); return <td key={p.id}>{v ? formatInr(v) : "On request"}</td>; })}</tr>
              <tr><th /> {plots.map((p) => (
                <td key={p.id}>
                  <button className="pv-link" onClick={() => onPick(p.id)}>View</button> · <button className="pv-link" onClick={() => onRemove(p.id)}>Remove</button>
                </td>
              ))}</tr>
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

// ---------- Enquiry / site visit ----------
export function EnquiryModal({ layout, venture, plot, shortlisted, onToggleShortlist, onClose }: {
  layout: VentureLayout;
  venture: VentureCard;
  plot: LayoutPlot | null;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onClose: () => void;
}) {
  const showToast = useToast();
  const o = layout.overlay;
  const price = plot ? plotPrice(layout, plot) : null;
  const [kind, setKind] = useState<"visit" | "enquiry">("visit");
  const [form, setForm] = useState({ name: "", phone: "", email: "", visitDate: "", visitSlot: VISIT_SLOTS[0], message: "", website: "" });
  const [loan, setLoan] = useState({ pct: 80, rate: 8.5, years: 15 });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, kind, slug: layout.slug, plotNumber: plot?.number ?? null }),
    });
    setBusy(false);
    if (!res.ok) return showToast((await res.json().catch(() => ({}))).error ?? "Could not send — please try again");
    setDone(true);
  }

  async function sharePlot() {
    const url = `${window.location.origin}/explore/${layout.slug}?plot=${encodeURIComponent(plot!.number)}`;
    if (navigator.share) return navigator.share({ title: `${venture.name} · Plot ${plot!.number}`, url }).catch(() => {});
    await navigator.clipboard.writeText(url);
    showToast("Plot link copied");
  }

  const monthly = price ? emi((price * loan.pct) / 100, loan.rate, loan.years) : 0;

  return (
    <Shell onClose={onClose} className="pv-enquiry">
      {plot && o ? (
        <div className="pv-eq-plot">
          <div>
            <small>{venture.name}</small>
            <h3>Plot {plot.number}</h3>
            <p>
              {plotAreaSqYd(o, plot).toFixed(0)} Sq.Yds{plot.facing ? ` · ${plot.facing} facing` : ""} ·{" "}
              <i className="pv-dot" style={{ background: STATUS_COLOR[plot.status] }} />{STATUS_LABEL[plot.status]}
            </p>
          </div>
          <div className="pv-eq-price">
            {price ? <><b>{formatInr(price)}</b>{layout.ratePerSqYd && !plot.price ? <small>₹{layout.ratePerSqYd.toLocaleString("en-IN")} / Sq.Yd</small> : null}</> : <small>Price on request</small>}
          </div>
        </div>
      ) : (
        <div className="pv-eq-plot"><div><small>{venture.name}</small><h3>Talk to our team</h3><p>{venture.loc}</p></div></div>
      )}

      {plot ? (
        <div className="pv-eq-actions">
          <button className={`pv-outline ${shortlisted ? "on" : ""}`} onClick={onToggleShortlist}>{shortlisted ? "♥ Shortlisted" : "♡ Shortlist"}</button>
          <button className="pv-outline" onClick={sharePlot}><Icon name="share" size={15} /> Share plot</button>
          <button className="pv-outline" onClick={() => window.print()}><Icon name="brochure" size={15} /> Plot sheet</button>
        </div>
      ) : null}

      {price ? (
        <div className="pv-emi">
          <div>
            <small>Estimated EMI</small>
            <b>{formatInr(Math.round(monthly))}<span>/month</span></b>
          </div>
          <label>Loan <select value={loan.pct} onChange={(e) => setLoan({ ...loan, pct: +e.target.value })}>{[60, 70, 75, 80, 90].map((v) => <option key={v} value={v}>{v}%</option>)}</select></label>
          <label>Rate <select value={loan.rate} onChange={(e) => setLoan({ ...loan, rate: +e.target.value })}>{[8, 8.5, 9, 9.5, 10, 10.5].map((v) => <option key={v} value={v}>{v}%</option>)}</select></label>
          <label>Years <select value={loan.years} onChange={(e) => setLoan({ ...loan, years: +e.target.value })}>{[5, 10, 15, 20].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
        </div>
      ) : null}

      {done ? (
        <div className="pv-eq-done">
          <b>{kind === "visit" ? "Site visit requested" : "Enquiry sent"}</b>
          <p>Our team will call you on {form.phone} shortly{kind === "visit" ? ` to confirm ${form.visitDate}, ${form.visitSlot}` : ""}.</p>
          <button className="pv-outline" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="pv-eq-form" onSubmit={submit}>
          <div className="pv-seg">
            <button type="button" className={kind === "visit" ? "on" : ""} onClick={() => setKind("visit")}>Book site visit</button>
            <button type="button" className={kind === "enquiry" ? "on" : ""} onClick={() => setKind("enquiry")}>Ask a question</button>
          </div>
          <input placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoComplete="name" />
          <input placeholder="Mobile number *" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required pattern="\+?[0-9\s\-]{10,18}" autoComplete="tel" />
          <input placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          {kind === "visit" ? (
            <div className="pv-eq-two">
              <input type="date" min={today} value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} required aria-label="Visit date" />
              <select value={form.visitSlot} onChange={(e) => setForm({ ...form, visitSlot: e.target.value })} aria-label="Time slot">
                {VISIT_SLOTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          ) : null}
          <textarea placeholder={kind === "visit" ? "Anything we should know? (optional)" : "Your question"} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required={kind === "enquiry"} />
          {/* honeypot: hidden from people, bots fill it */}
          <input className="pv-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} aria-hidden="true" />
          <button className="pv-primary" disabled={busy}>{busy ? "Sending…" : kind === "visit" ? "Request site visit" : "Send enquiry"}</button>
          <small className="pv-muted">We only use your number to contact you about {venture.name}.</small>
        </form>
      )}
      {plot && o ? <PlotSheet layout={layout} venture={venture} plot={plot} /> : null}
    </Shell>
  );
}

// ---------- Printable plot sheet (only visible when printing) ----------
function PlotSheet({ layout, venture, plot }: { layout: VentureLayout; venture: VentureCard; plot: LayoutPlot }) {
  const o = layout.overlay!;
  const pts = plot.points.map((p) => uvToMeters(o, p));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const s = 300 / Math.max(w, h);
  const P = pts.map(([x, y]) => [(x - Math.min(...xs)) * s + 60, (y - Math.min(...ys)) * s + 40]);
  const lens = edgeLengths(o, plot.points);
  const price = plotPrice(layout, plot);
  return (
    <div className="pv-print" aria-hidden="true">
      <h1>{venture.name} — Plot {plot.number}</h1>
      <p>{venture.loc}{layout.approvals.length ? ` · ${layout.approvals.join(" · ")}` : ""}</p>
      <svg width={420} height={Math.max(h * s, 120) + 80} viewBox={`0 0 420 ${Math.max(h * s, 120) + 80}`}>
        <polygon points={P.map((p) => p.join(",")).join(" ")} fill="#e8f0e6" stroke="#294338" strokeWidth={2} />
        {P.map((a, i) => {
          const b = P[(i + 1) % P.length];
          return lens[i] >= 1 ? <text key={i} x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2} fontSize={12} textAnchor="middle" dy={-4}>{lens[i].toFixed(2)} m</text> : null;
        })}
      </svg>
      <table>
        <tbody>
          <tr><th>Area</th><td>{plotAreaSqYd(o, plot).toFixed(2)} Sq.Yds ({(plotAreaSqYd(o, plot) * SQYD_TO_M2).toFixed(2)} m²)</td></tr>
          <tr><th>Facing</th><td>{plot.facing ?? "—"}</td></tr>
          <tr><th>Status</th><td>{STATUS_LABEL[plot.status]}</td></tr>
          <tr><th>Price</th><td>{price ? formatInr(price) : "On request"}</td></tr>
        </tbody>
      </table>
      <p className="pv-print-foot">Generated {new Date().toLocaleDateString("en-IN")} · Dimensions measured from the approved layout; subject to final survey.</p>
    </div>
  );
}
