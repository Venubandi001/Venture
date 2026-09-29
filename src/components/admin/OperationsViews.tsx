"use client";

// Customers, Site Visits, Reports, Documents and Audit Log — all built from real leads, bookings, layouts and the audit log.
import { useEffect, useMemo, useState } from "react";
import { BOOKING_STATUS_LABEL, BookingRow } from "@/shared/bookings";
import { formatInr } from "@/shared/layout";
import { LEAD_STATUSES } from "@/shared/leads";
import { PLOT_STATUSES, STATUS_LABEL } from "@/shared/types";
import { useToast } from "../ToastProvider";
import { countPlots, downloadCsv, isoDaysAgo, Lead, timeAgo, useAudit, useLayouts, useLeads } from "./adminData";
import { useVentures } from "./VenturesContext";

const LEAD_LABEL: Record<Lead["status"], string> = { new: "New", contacted: "Contacted", visit: "Visit scheduled", booked: "Booked", lost: "Lost" };
const LEAD_BADGE: Record<Lead["status"], string> = { new: "available", contacted: "hold", visit: "confirmed", booked: "received", lost: "sold" };

function useBookings() {
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  useEffect(() => { fetch("/api/bookings").then((r) => r.json()).then(setRows).catch(() => setRows([])); }, []);
  return rows;
}

function Kpis({ items }: { items: { label: string; value: string | number; note: string }[] }) {
  return (
    <div className="admin-kpis">
      {items.map((k) => <div className="admin-kpi" key={k.label}><small>{k.label}</small><strong>{k.value}</strong><span>{k.note}</span></div>)}
    </div>
  );
}

// ---------------- Customers ----------------
/** Everyone who has contacted you, merged by phone number across enquiries, visits and bookings. */
export function CustomersView() {
  const { leads } = useLeads();
  const bookings = useBookings();
  const { bySlug } = useVentures();
  const [q, setQ] = useState("");

  const people = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email: string | null; interests: Set<string>; requests: number; bookings: BookingRow[]; last: string; status: Lead["status"] | "customer" }>();
    const key = (p: string) => p.replace(/\D/g, "").slice(-10);
    for (const l of leads ?? []) {
      const k = key(l.phone);
      const e = map.get(k) ?? { name: l.name, phone: l.phone, email: l.email, interests: new Set(), requests: 0, bookings: [], last: l.created_at, status: l.status };
      e.requests++;
      e.interests.add(`${bySlug(l.slug)?.name ?? l.slug}${l.plot_number ? ` · P-${l.plot_number}` : ""}`);
      if (l.created_at > e.last) { e.last = l.created_at; e.status = l.status; }
      e.email ??= l.email;
      map.set(k, e);
    }
    for (const b of bookings ?? []) {
      const k = key(b.mobile);
      const e = map.get(k) ?? { name: b.applicantName, phone: b.mobile, email: b.email, interests: new Set(), requests: 0, bookings: [], last: b.createdAt, status: "customer" as const };
      e.bookings.push(b);
      e.interests.add(`${bySlug(b.ventureSlug)?.name ?? b.ventureSlug} · P-${b.plotNumber}`);
      if (b.status !== "cancelled") e.status = "customer";
      if (b.createdAt > e.last) e.last = b.createdAt;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [leads, bookings, bySlug]);

  const shown = people.filter((p) => !q || `${p.name} ${p.phone} ${p.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section>
      <div className="eyebrow">Sales / Customers</div>
      <h1>Customers</h1>
      <p style={{ color: "#7b867f" }}>Every person who enquired, booked a visit or applied — merged by mobile number.</p>
      <Kpis items={[
        { label: "People", value: people.length, note: "Unique mobile numbers" },
        { label: "With a booking", value: people.filter((p) => p.bookings.some((b) => b.status !== "cancelled")).length, note: "Active applications" },
        { label: "Repeat contacts", value: people.filter((p) => p.requests > 1).length, note: "More than one request" },
      ]} />
      <div className="card">
        <div className="tabs"><input className="inv-search" placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {!leads || !bookings ? <p className="le-muted">Loading…</p> : !shown.length ? <p className="le-muted">No customers yet.</p> : (
          <table className="inventory">
            <thead><tr><th>Name</th><th>Contact</th><th>Interested in</th><th>Requests</th><th>Bookings</th><th>Latest status</th><th>Last contact</th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.phone}>
                  <td><b>{p.name}</b>{p.email ? <><br /><small>{p.email}</small></> : null}</td>
                  <td><a href={`tel:${p.phone}`}>{p.phone}</a><br /><a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp</a></td>
                  <td>{[...p.interests].join(", ")}</td>
                  <td>{p.requests}</td>
                  <td>{p.bookings.length ? p.bookings.map((b) => `#${b.id} ${BOOKING_STATUS_LABEL[b.status]}`).join(", ") : "—"}</td>
                  <td>{p.status === "customer" ? <span className="badge confirmed">Customer</span> : <span className={`badge ${LEAD_BADGE[p.status]}`}>{LEAD_LABEL[p.status]}</span>}</td>
                  <td>{timeAgo(p.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ---------------- Site visits ----------------
export function SiteVisitsView() {
  const showToast = useToast();
  const { leads, setLeads } = useLeads();
  const { bySlug } = useVentures();
  const [when, setWhen] = useState<"upcoming" | "today" | "past">("upcoming");
  const today = new Date().toISOString().slice(0, 10);
  const visits = (leads ?? []).filter((l) => l.kind === "visit" && l.visit_date);
  const shown = visits
    .filter((l) => (when === "today" ? l.visit_date === today : when === "upcoming" ? l.visit_date! >= today : l.visit_date! < today))
    .sort((a, b) => (when === "past" ? b.visit_date!.localeCompare(a.visit_date!) : a.visit_date!.localeCompare(b.visit_date!)) || (a.visit_slot ?? "").localeCompare(b.visit_slot ?? ""));

  async function setStatus(l: Lead, status: Lead["status"]) {
    const r = await fetch(`/api/leads/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!r.ok) return showToast("Could not update");
    setLeads((ls) => ls && ls.map((x) => (x.id === l.id ? { ...x, status } : x)));
  }

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return (
    <section>
      <div className="eyebrow">Sales / Site visits</div>
      <h1>Site visits</h1>
      <p style={{ color: "#7b867f" }}>Visits buyers booked from the plot map. Call to confirm, then update the status after the visit.</p>
      <Kpis items={[
        { label: "Today", value: visits.filter((l) => l.visit_date === today).length, note: today },
        { label: "Upcoming", value: visits.filter((l) => l.visit_date! >= today).length, note: "From today" },
        { label: "Not yet confirmed", value: visits.filter((l) => l.visit_date! >= today && l.status === "new").length, note: "Status still New" },
      ]} />
      <div className="card">
        <div className="tabs">
          {(["upcoming", "today", "past"] as const).map((w) => <button key={w} className={`tab ${when === w ? "active" : ""}`} onClick={() => setWhen(w)}>{w[0].toUpperCase() + w.slice(1)}</button>)}
        </div>
        {!leads ? <p className="le-muted">Loading…</p> : !shown.length ? <p className="le-muted">No {when} site visits.</p> : (
          <table className="inventory">
            <thead><tr><th>Date</th><th>Time</th><th>Visitor</th><th>Venture · Plot</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className={l.visit_date === today ? "row-today" : ""}>
                  <td><b>{fmt(l.visit_date!)}</b></td>
                  <td>{l.visit_slot}</td>
                  <td><b>{l.name}</b><br /><a href={`tel:${l.phone}`}>{l.phone}</a> · <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp</a></td>
                  <td>{bySlug(l.slug)?.name ?? l.slug}{l.plot_number ? ` · P-${l.plot_number}` : ""}</td>
                  <td>{l.assigned_name ?? "Unassigned"}</td>
                  <td>
                    <select className="inv-select" value={l.status} onChange={(e) => setStatus(l, e.target.value as Lead["status"])}>
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ---------------- Reports ----------------
export function ReportsView() {
  const { ventures, bySlug } = useVentures();
  const layouts = useLayouts(ventures);
  const { leads } = useLeads();
  const bookings = useBookings();
  const [days, setDays] = useState(30);
  const since = isoDaysAgo(days);
  const recent = (leads ?? []).filter((l) => l.created_at >= since);
  const byVenture = ventures.map((v) => {
    const vl = recent.filter((l) => l.slug === v.slug);
    return { v, leads: vl.length, visits: vl.filter((l) => l.kind === "visit").length, booked: vl.filter((l) => l.status === "booked").length, lost: vl.filter((l) => l.status === "lost").length };
  }).filter((r) => r.leads);
  const conv = recent.length ? Math.round((recent.filter((l) => l.status === "booked").length / recent.length) * 100) : 0;

  function exportLeads() {
    downloadCsv(`leads-last-${days}-days.csv`, ["Received", "Name", "Phone", "Email", "Venture", "Plot", "Request", "Visit date", "Slot", "Status", "Owner", "Message"],
      recent.map((l) => [new Date(l.created_at).toLocaleString("en-IN"), l.name, l.phone, l.email, bySlug(l.slug)?.name ?? l.slug, l.plot_number, l.kind, l.visit_date, l.visit_slot, LEAD_LABEL[l.status], l.assigned_name, l.message]));
  }
  function exportInventory() {
    const rows: (string | number | null)[][] = [];
    for (const v of ventures) for (const p of layouts?.[v.slug]?.plots ?? []) rows.push([v.name, p.number, p.areaSqYd ?? "", p.facing ?? "", STATUS_LABEL[p.status]]);
    downloadCsv("plot-inventory.csv", ["Venture", "Plot", "Area (Sq.Yds)", "Facing", "Status"], rows);
  }
  function exportBookings() {
    downloadCsv("booking-applications.csv", ["#", "Created", "Applicant", "Mobile", "Venture", "Plot", "Status", "Booking amount", "Payment mode", "Sales person", "Source"],
      (bookings ?? []).map((b) => [b.id, new Date(b.createdAt).toLocaleDateString("en-IN"), b.applicantName, b.mobile, bySlug(b.ventureSlug)?.name ?? b.ventureSlug, b.plotNumber, BOOKING_STATUS_LABEL[b.status], b.details.bookingAmount, b.details.paymentMode, b.salesPersonName, b.details.source]));
  }

  return (
    <section>
      <div className="eyebrow">Operations / Reports</div>
      <div className="page-title-row">
        <div><h1>Reports</h1><p style={{ color: "#7b867f" }}>Live numbers, plus Excel-ready CSV downloads.</p></div>
        <div className="le-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
            {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
      </div>
      <Kpis items={[
        { label: "Leads", value: recent.length, note: `Last ${days} days` },
        { label: "Site-visit requests", value: recent.filter((l) => l.kind === "visit").length, note: `${recent.filter((l) => l.kind === "enquiry").length} enquiries` },
        { label: "Lead → booked", value: `${conv}%`, note: `${recent.filter((l) => l.status === "booked").length} booked · ${recent.filter((l) => l.status === "lost").length} lost` },
        { label: "Booking amounts", value: formatInr((bookings ?? []).filter((b) => b.status !== "cancelled" && b.createdAt >= since).reduce((s, b) => s + (b.details.bookingAmount ?? 0), 0)), note: `Applications, last ${days} days` },
      ]} />
      <div className="grid2">
        <div className="card">
          <div className="cardhead"><b>Leads by venture</b><button className="tab" onClick={exportLeads} disabled={!recent.length}>Download leads CSV</button></div>
          {!byVenture.length ? <p className="le-muted">No leads in this period.</p> : (
            <table className="inventory">
              <thead><tr><th>Venture</th><th>Leads</th><th>Visit requests</th><th>Booked</th><th>Lost</th></tr></thead>
              <tbody>{byVenture.map((r) => <tr key={r.v.slug}><td><b>{r.v.name}</b></td><td>{r.leads}</td><td>{r.visits}</td><td>{r.booked}</td><td>{r.lost}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="cardhead"><b>Lead pipeline</b></div>
          <div className="mini-list">
            {LEAD_STATUSES.map((s) => <p key={s}>{LEAD_LABEL[s]} <b>{recent.filter((l) => l.status === s).length}</b></p>)}
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="cardhead">
          <b>Inventory by venture</b>
          <span className="le-row">
            <button className="tab" onClick={exportInventory} disabled={!layouts}>Download inventory CSV</button>
            <button className="tab" onClick={exportBookings} disabled={!bookings?.length}>Download bookings CSV</button>
          </span>
        </div>
        <table className="inventory venture-status-table">
          <thead><tr><th>Venture</th><th>Total</th>{PLOT_STATUSES.map((s) => <th key={s}>{STATUS_LABEL[s]}</th>)}<th>Sold %</th></tr></thead>
          <tbody>
            {ventures.map((v) => {
              const c = countPlots(layouts?.[v.slug]);
              return c ? (
                <tr key={v.slug}><td><b>{v.name}</b></td><td>{c.total}</td>{PLOT_STATUSES.map((s) => <td key={s}>{c[s]}</td>)}<td>{Math.round(((c.sold + c.confirmed) / c.total) * 100)}%</td></tr>
              ) : null;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------- Documents ----------------
export function DocumentsView({ onOpenLayouts, isAdmin }: { onOpenLayouts: (slug: string) => void; isAdmin: boolean }) {
  const { ventures } = useVentures();
  const layouts = useLayouts(ventures);
  return (
    <section>
      <div className="eyebrow">Operations / Documents</div>
      <h1>Documents</h1>
      <p style={{ color: "#7b867f" }}>Approved layout plans, brochures, approvals and photos for each venture. Uploads happen in Layouts &amp; GIS.</p>
      {!layouts ? <p className="le-muted">Loading…</p> : ventures.map((v) => {
        const l = layouts[v.slug];
        return (
          <div className="card doc-card" key={v.slug}>
            <div className="cardhead">
              <b>{v.name}</b>
              {isAdmin ? <button className="tab" onClick={() => onOpenLayouts(v.slug)}>Manage in Layouts &amp; GIS</button> : null}
            </div>
            <div className="doc-grid">
              <DocItem label="Approved layout plan" href={l?.overlay?.url} />
              <DocItem label="Brochure (PDF)" href={l?.brochure ?? undefined} />
              <div className="doc-item"><small>Approvals</small>{l?.approvals.length || v.rera ? [...new Set([v.rera, ...(l?.approvals ?? [])].filter(Boolean))].map((a) => <div key={a}>✓ {a}</div>) : <span className="le-muted">None added</span>}</div>
              <div className="doc-item"><small>Gallery</small>{l?.gallery.length ? <div className="doc-thumbs">{l.gallery.slice(0, 6).map((g) => <Thumb key={g} src={g} />)}</div> : <span className="le-muted">No photos</span>}</div>
              <DocItem label="Logo" href={v.logoUrl ?? undefined} />
              <DocItem label="Cover image" href={v.coverUrl ?? undefined} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Thumb({ src }: { src: string }) {
  return (
    <a href={src} target="_blank" rel="noopener">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
    </a>
  );
}

function DocItem({ label, href }: { label: string; href?: string }) {
  return <div className="doc-item"><small>{label}</small>{href ? <a href={href} target="_blank" rel="noopener">Open ↗</a> : <span className="le-muted">Not uploaded</span>}</div>;
}

// ---------------- Audit log ----------------
const ENTITIES = [["", "Everything"], ["plot", "Plot status"], ["lead", "Leads"], ["booking", "Bookings"], ["venture", "Ventures"], ["layout", "Layouts"], ["user", "Users"]] as const;

export function AuditLogView() {
  const [entity, setEntity] = useState("");
  const [search, setSearch] = useState("");
  const rows = useAudit(`?limit=500${entity ? `&entity=${entity}` : ""}`);
  const shown = (rows ?? []).filter((r) => !search || `${r.summary} ${r.userName} ${r.entityId}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section>
      <div className="eyebrow">Operations / Audit</div>
      <h1>Audit log</h1>
      <p style={{ color: "#7b867f" }}>Every change — who, what and when. Search a plot (e.g. “my-fortune:45”) to see its full status history.</p>
      <div className="card">
        <div className="tabs">
          {ENTITIES.map(([k, label]) => <button key={k} className={`tab ${entity === k ? "active" : ""}`} onClick={() => setEntity(k)}>{label}</button>)}
          <input className="inv-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!rows ? <p className="le-muted">Loading…</p> : !shown.length ? <p className="le-muted">Nothing recorded yet.</p> : (
          <table className="inventory">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Item</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td title={new Date(r.at).toLocaleString("en-IN")}>{new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{r.userName}</td>
                  <td>{r.summary}</td>
                  <td><small>{r.entity} · {r.entityId}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
