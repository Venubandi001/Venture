"use client";

import { useEffect, useMemo, useState } from "react";
import { LEAD_STATUSES } from "@/shared/leads";
import { useVentures } from "./VenturesContext";
import { useToast } from "../ToastProvider";

interface Lead {
  id: number;
  slug: string;
  plot_number: string | null;
  kind: "enquiry" | "visit";
  name: string;
  phone: string;
  email: string | null;
  visit_date: string | null;
  visit_slot: string | null;
  message: string | null;
  status: (typeof LEAD_STATUSES)[number];
  assigned_to: number | null;
  assigned_name: string | null;
  created_at: string;
}
interface Member { id: number; name: string }

const STATUS_CLASS: Record<Lead["status"], string> = { new: "available", contacted: "hold", visit: "reserved", booked: "available", lost: "sold" };
// Status = the sales stage (set by the team). Not to be confused with the request type (what the buyer asked for).
const LABEL: Record<Lead["status"], string> = { new: "New", contacted: "Contacted", visit: "Visit scheduled", booked: "Booked", lost: "Lost" };
const KINDS = [{ k: "all", label: "All requests" }, { k: "visit", label: "Site visit requests" }, { k: "enquiry", label: "Enquiries" }] as const;

function ago(iso: string) {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60e3);
  return m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

export default function LeadsView() {
  const showToast = useToast();
  const { bySlug } = useVentures();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [team, setTeam] = useState<Member[]>([]);
  const [status, setStatus] = useState<Lead["status"] | "all">("all");
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("all");
  const [upcoming, setUpcoming] = useState(false);

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then(setLeads).catch(() => setLeads([]));
    fetch("/api/users").then((r) => r.json()).then((rows: (Member & { active?: boolean })[]) => setTeam(rows.filter((t) => t.active !== false))).catch(() => {});
  }, []);

  async function update(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) return showToast("Could not update lead");
    setLeads((ls) => ls && ls.map((l) => (l.id === id ? {
      ...l,
      ...(patch.status ? { status: patch.status as Lead["status"] } : {}),
      ...("assignedTo" in patch ? { assigned_to: patch.assignedTo as number | null, assigned_name: team.find((t) => t.id === patch.assignedTo)?.name ?? null } : {}),
    } : l)));
  }

  const today = new Date().toISOString().slice(0, 10);
  // created_at is an ISO UTC timestamp, so string comparison with a date works
  const weekAgo = new Date(new Date(today).getTime() - 6 * 864e5).toISOString().slice(0, 10);
  const isUpcoming = (l: Lead) => l.kind === "visit" && (l.visit_date ?? "") >= today;
  // the three filters combine (AND); each tab's count reflects the other two filters
  const match = (l: Lead, f: { status?: typeof status; kind?: typeof kind; upcoming?: boolean }) =>
    ((f.status ?? status) === "all" || l.status === (f.status ?? status)) &&
    ((f.kind ?? kind) === "all" || l.kind === (f.kind ?? kind)) &&
    (!(f.upcoming ?? upcoming) || isUpcoming(l));
  const shown = useMemo(() => (leads ?? []).filter((l) => match(l, {})), [leads, status, kind, upcoming, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (f: Parameters<typeof match>[1]) => (leads ?? []).filter((l) => match(l, f)).length;
  const n = (s: Lead["status"] | "visits") => (leads ?? []).filter((l) => (s === "visits" ? isUpcoming(l) : l.status === s)).length;

  const kpis = [
    { label: "Total leads", value: leads?.length ?? 0, note: `${(leads ?? []).filter((l) => l.created_at >= weekAgo).length} this week` },
    { label: "New — to call", value: n("new"), note: "Respond within 1 hour" },
    { label: "Upcoming site visits", value: n("visits"), note: "From today" },
    { label: "Booked", value: n("booked"), note: "Converted leads" },
  ];

  return (
    <section>
      <div className="eyebrow">Sales / Applications</div>
      <h1>Applications & leads</h1>
      <div className="admin-kpis">
        {kpis.map((k) => (
          <div className="admin-kpi" key={k.label}>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span>{k.note}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="lead-filters">
          <div className="lead-filter-row">
            <span className="lead-filter-label">Request</span>
            <div className="tabs">
              {KINDS.map((x) => (
                <button key={x.k} className={`tab ${kind === x.k ? "active" : ""}`} onClick={() => setKind(x.k)}>
                  {x.label} <span className="tab-count">{count({ kind: x.k })}</span>
                </button>
              ))}
              <button className={`tab ${upcoming ? "active" : ""}`} onClick={() => setUpcoming((v) => !v)} aria-pressed={upcoming}>
                Upcoming visits only <span className="tab-count">{count({ upcoming: true })}</span>
              </button>
            </div>
          </div>
          <div className="lead-filter-row">
            <span className="lead-filter-label">Status</span>
            <div className="tabs">
              {(["all", ...LEAD_STATUSES] as const).map((s) => (
                <button key={s} className={`tab ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>
                  {s === "all" ? "All" : LABEL[s]} <span className="tab-count">{count({ status: s })}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {!leads ? <p className="le-muted">Loading…</p> : !leads.length ? (
          <p className="le-muted">No leads yet. Enquiries and site-visit bookings from the customer map appear here instantly.</p>
        ) : !shown.length ? (
          <p className="le-muted">
            No leads match these filters.{" "}
            <button className="pv-link-admin" onClick={() => { setStatus("all"); setKind("all"); setUpcoming(false); }}>Clear filters</button>
          </p>
        ) : (
          <table className="inventory">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Venture · Plot</th><th>Request</th><th>Message</th><th>Owner</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.name}</b>{l.email ? <><br /><small>{l.email}</small></> : null}</td>
                  <td>
                    <a href={`tel:${l.phone}`}>{l.phone}</a><br />
                    <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp</a>
                  </td>
                  <td>{bySlug(l.slug)?.name ?? l.slug}{l.plot_number ? ` · P-${l.plot_number}` : ""}</td>
                  <td>{l.kind === "visit" ? <>Site visit<br /><small>{l.visit_date} · {l.visit_slot}</small></> : "Enquiry"}</td>
                  <td style={{ maxWidth: 220 }}>{l.message ?? "—"}</td>
                  <td>
                    <select className="inv-select" value={l.assigned_to ?? ""} onChange={(e) => update(l.id, { assignedTo: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">Unassigned</option>
                      {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className={`inv-select badge ${STATUS_CLASS[l.status]}`} value={l.status} onChange={(e) => update(l.id, { status: e.target.value })}>
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td>{ago(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
