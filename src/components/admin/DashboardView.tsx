"use client";

import { useEffect, useState } from "react";
import type { AdminView } from "@/shared/adminViews";
import type { BookingRow } from "@/shared/bookings";
import { PLOT_STATUSES, STATUS_COLOR, STATUS_LABEL } from "@/shared/types";
import { VENTURE_STATUS_LABEL } from "@/shared/ventures";
import AdminLayoutMap from "./AdminLayoutMap";
import { countPlots, isoDaysAgo, timeAgo, useAudit, useLayouts, useLeads } from "./adminData";
import { useVentures, VentureSelect } from "./VenturesContext";

export default function DashboardView({ slug, onSelectVenture, onOpen, isAdmin }: {
  slug: string;
  onSelectVenture: (slug: string) => void;
  onOpen: (view: AdminView, slug?: string) => void;
  isAdmin: boolean;
}) {
  const { ventures } = useVentures();
  const layouts = useLayouts(ventures);
  const { leads } = useLeads();
  const activity = useAudit("?limit=12");
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  useEffect(() => { fetch("/api/bookings").then((r) => r.json()).then(setBookings).catch(() => setBookings([])); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = isoDaysAgo(7);
  const all = Object.values(layouts ?? {}).map(countPlots).filter(Boolean);
  const sum = (k: keyof NonNullable<(typeof all)[number]>) => all.reduce((s, c) => s + (c ? c[k] : 0), 0);
  const kpis = [
    { label: "Live ventures", value: ventures.filter((v) => v.status === "live").length, note: `${ventures.length} in total`, go: "ventures" as AdminView },
    { label: "Plots available", value: sum("available"), note: `of ${sum("total")} plots`, go: "inventory" as AdminView },
    { label: "Booked / sold", value: sum("confirmed") + sum("received") + sum("sold"), note: `${sum("hold")} on hold`, go: "inventory" as AdminView },
    { label: "Leads this week", value: leads ? leads.filter((l) => l.created_at >= weekAgo).length : "…", note: `${leads?.filter((l) => l.status === "new").length ?? 0} new to call`, go: "leads" as AdminView },
    { label: "Upcoming visits", value: leads ? leads.filter((l) => l.kind === "visit" && (l.visit_date ?? "") >= today && l.status !== "lost").length : "…", note: `${leads?.filter((l) => l.visit_date === today).length ?? 0} today`, go: "visits" as AdminView },
    { label: "Open bookings", value: bookings ? bookings.filter((b) => ["submitted", "received"].includes(b.status)).length : "…", note: `${bookings?.filter((b) => b.status === "confirmed").length ?? 0} confirmed`, go: "bookingApplications" as AdminView },
  ];

  return (
    <section>
      <div className="admin-top">
        <div>
          <div className="eyebrow">Operations / Today</div>
          <h1>Venture control center</h1>
          <p>Every number here is live from your ventures, plots, leads and bookings.</p>
        </div>
        <div className="datepill">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <div className="admin-kpis">
        {kpis.map((k) => (
          <button className="admin-kpi as-link" key={k.label} onClick={() => onOpen(k.go)}>
            <small>{k.label}</small>
            <strong>{layouts === null && typeof k.value === "number" && k.go === "inventory" ? "…" : k.value}</strong>
            <span>{k.note}</span>
          </button>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <b>Venture portfolio</b>
            <span>{ventures.length} ventures · {sum("total")} plots mapped</span>
          </div>
          <div className="venture-grid">
            {ventures.map((v) => {
              const c = countPlots(layouts?.[v.slug]);
              return (
                <button className="venture-card as-link" key={v.slug} onClick={() => onOpen("ventures", v.slug)}>
                  <div className="venture-image" style={v.coverUrl ? { backgroundImage: `url(${v.coverUrl})` } : undefined}>
                    <span className="image-badge">{c ? `${c.total} PLOTS` : "NO LAYOUT YET"}</span>
                  </div>
                  <div className="vcbody">
                    <div className="vc-title-row">
                      <h3>{v.name}</h3>
                      <span className={`live-dot ${v.status}`}>{VENTURE_STATUS_LABEL[v.status].replace(/ \(.*\)/, "").toUpperCase()}</span>
                    </div>
                    <p>{[v.city, v.acres ? `${v.acres} acres` : ""].filter(Boolean).join(" · ") || "—"}</p>
                    {c ? (
                      <>
                        <div className="vcstats">
                          <span><b>{c.available}</b> available</span>
                          <span><b>{c.confirmed + c.received + c.sold}</b> booked/sold</span>
                          <span><b>{c.hold}</b> hold</span>
                        </div>
                        <div className="statusbar" title={PLOT_STATUSES.map((s) => `${STATUS_LABEL[s]}: ${c[s]}`).join(" · ")}>
                          {PLOT_STATUSES.map((s) => c[s] ? <i key={s} style={{ width: `${(c[s] / c.total) * 100}%`, background: STATUS_COLOR[s] }} /> : null)}
                        </div>
                      </>
                    ) : <div className="vcstats"><span>{isAdmin ? "Upload the plan in Layouts & GIS" : "Layout not published yet"}</span></div>}
                    <div className="venture-card-action">View venture details →</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="cardhead">
            <b>Recent activity</b>
            {isAdmin ? <button className="pv-link-admin" onClick={() => onOpen("audit")}>Full audit log →</button> : null}
          </div>
          <div className="mini-list">
            {!activity ? <p>Loading…</p> : !activity.length ? <p>No activity yet.</p> : activity.map((a) => (
              <p key={a.id}>
                <span><i className="activity-dot" />{a.summary}</span>
                <small>{a.userName} · {timeAgo(a.at)}</small>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="section-title map-title">
        <div>
          <h2>Live venture map</h2>
          <p>Exactly what buyers see. Click a plot to change its status — it updates on the customer map within seconds.</p>
        </div>
        <VentureSelect className="map-venture-select" value={slug} onChange={onSelectVenture} />
      </div>
      <AdminLayoutMap key={slug} slug={slug} onOpenLayouts={isAdmin ? () => onOpen("layouts", slug) : undefined} />
    </section>
  );
}
