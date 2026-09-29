"use client";

import { useEffect, useMemo, useState } from "react";
import { BOOKING_STATUS_LABEL, BOOKING_STATUSES, BookingRow, BookingStatus, NEXT_BOOKING_STATUS, PLOT_FOR_BOOKING } from "@/shared/bookings";
import { formatInr } from "@/shared/layout";
import { STATUS_LABEL } from "@/shared/types";
import { useToast } from "../ToastProvider";
import BookingApplicationModal from "./BookingApplicationModal";
import { useVentures } from "./VenturesContext";

const BADGE: Record<BookingStatus, string> = { submitted: "hold", received: "received", confirmed: "confirmed", sold: "sold", cancelled: "mortgage" };
const ACTION: Record<BookingStatus, string> = { submitted: "", received: "Mark amount received", confirmed: "Confirm booking", sold: "Mark registered / sold", cancelled: "Cancel" };

export default function BookingApplicationsView({ slug }: { slug: string; onSelectVenture: (s: string) => void }) {
  const showToast = useToast();
  const { bySlug } = useVentures();
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<BookingStatus | "open" | "all">("open");
  const [openId, setOpenId] = useState<number | null>(null);
  const [pan, setPan] = useState<Record<number, string>>({});

  const load = () => fetch("/api/bookings").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function advance(b: BookingRow, to: BookingStatus) {
    const plotTo = STATUS_LABEL[PLOT_FOR_BOOKING[to]];
    if (!confirm(`${ACTION[to]} for ${b.applicantName}? Plot ${b.plotNumber} will become “${plotTo}”.`)) return;
    const r = await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: to }) });
    if (!r.ok) return showToast((await r.json().catch(() => ({}))).error ?? "Could not update");
    showToast(`Application #${b.id}: ${BOOKING_STATUS_LABEL[to]} · plot ${b.plotNumber} → ${plotTo}`);
    load();
  }

  async function reveal(id: number) {
    const r = await fetch(`/api/bookings/${id}/pan`);
    if (!r.ok) return showToast((await r.json().catch(() => ({}))).error ?? "Not allowed");
    setPan({ ...pan, [id]: (await r.json()).pan });
  }

  const list = useMemo(() => rows ?? [], [rows]);
  const shown = useMemo(() => list.filter((b) => tab === "all" || (tab === "open" ? !["sold", "cancelled"].includes(b.status) : b.status === tab)), [list, tab]);
  const live = list.filter((b) => b.status !== "cancelled");
  const kpis = [
    { label: "Open applications", value: list.filter((b) => ["submitted", "received"].includes(b.status)).length, note: "Awaiting amount / confirmation" },
    { label: "Confirmed bookings", value: list.filter((b) => b.status === "confirmed").length, note: "Plots marked Booking Confirmed" },
    { label: "Registered / sold", value: list.filter((b) => b.status === "sold").length, note: "Completed" },
    { label: "Booking amounts", value: formatInr(live.reduce((s, b) => s + (b.details.bookingAmount ?? 0), 0)), note: "Across non-cancelled applications" },
  ];

  return (
    <section>
      <div className="eyebrow">Sales / Booking workflow</div>
      <div className="page-title-row">
        <div>
          <h1>Booking applications</h1>
          <p style={{ color: "#7b867f" }}>
            Each step updates the plot automatically: Submitted → <b>Hold</b>, amount received → <b>Received</b>,
            confirmed → <b>Booking Confirmed</b>, registered → <b>Sold Out</b>, cancelled → <b>Available</b>.
          </p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>+ New Booking Application</button>
      </div>

      <div className="admin-kpis">
        {kpis.map((k) => (
          <div className="admin-kpi" key={k.label}><small>{k.label}</small><strong>{k.value}</strong><span>{k.note}</span></div>
        ))}
      </div>

      <div className="card">
        <div className="tabs">
          {(["open", "all", ...BOOKING_STATUSES] as const).map((t) => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "open" ? "Open" : t === "all" ? "All" : BOOKING_STATUS_LABEL[t]}
            </button>
          ))}
        </div>
        {!rows ? <p className="le-muted">Loading…</p> : !shown.length ? (
          <p className="le-muted">{list.length ? "No applications with this status." : "No booking applications yet — click “New Booking Application”."}</p>
        ) : (
          <table className="inventory">
            <thead><tr><th>#</th><th>Applicant</th><th>Venture · Plot</th><th>Booking amount</th><th>Payment</th><th>Sales person</th><th>Status</th><th>Next step</th></tr></thead>
            <tbody>
              {shown.map((b) => (
                <FragmentRow key={b.id} b={b} ventureName={bySlug(b.ventureSlug)?.name ?? b.ventureSlug} open={openId === b.id}
                  onToggle={() => setOpenId(openId === b.id ? null : b.id)} onAdvance={(to) => advance(b, to)} pan={pan[b.id]} onReveal={() => reveal(b.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal ? <BookingApplicationModal slug={slug} onClose={() => setShowModal(false)} onSaved={load} /> : null}
    </section>
  );
}

function FragmentRow({ b, ventureName, open, onToggle, onAdvance, pan, onReveal }: {
  b: BookingRow; ventureName: string; open: boolean; onToggle: () => void; onAdvance: (to: BookingStatus) => void; pan?: string; onReveal: () => void;
}) {
  const d = b.details;
  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td>{b.id}</td>
        <td><b>{b.applicantName}</b><br /><small>{b.mobile}</small></td>
        <td>{ventureName} · P-{b.plotNumber}</td>
        <td>{d.bookingAmount ? formatInr(d.bookingAmount) : "—"}</td>
        <td>{d.paymentMode}</td>
        <td>{b.salesPersonName ?? "—"}</td>
        <td><span className={`badge ${BADGE[b.status]}`}>{BOOKING_STATUS_LABEL[b.status]}</span></td>
        <td className="user-actions" onClick={(e) => e.stopPropagation()}>
          {NEXT_BOOKING_STATUS[b.status].map((to) => (
            <button key={to} className={`tab ${to === "cancelled" ? "danger" : ""}`} onClick={() => onAdvance(to)}>{ACTION[to]}</button>
          ))}
        </td>
      </tr>
      {open ? (
        <tr className="booking-detail-row">
          <td colSpan={8}>
            <div className="booking-detail">
              <div><small>Email</small>{b.email ?? "—"}</div>
              <div><small>PAN</small>{pan ?? (b.panLast4 ? <>••••••{b.panLast4} <button className="pv-link-admin" onClick={onReveal}>Reveal (admin)</button></> : "—")}</div>
              <div><small>Aadhaar</small>{d.aadhaarLast4 ? `•••• ${d.aadhaarLast4}` : "—"}</div>
              <div><small>KYC</small>{d.kycStatus}</div>
              <div className="wide"><small>Address</small>{[d.address, d.city, d.state, d.pin].filter(Boolean).join(", ")}</div>
              <div><small>Nominee</small>{d.nominee.name ? `${d.nominee.name} (${d.nominee.relation || "—"}) ${d.nominee.mobile}` : "—"}</div>
              <div><small>Quoted price</small>{d.quotedPrice ? formatInr(d.quotedPrice) : "—"}</div>
              <div><small>Payment ref.</small>{d.paymentReference || "—"}</div>
              <div><small>Registration</small>{d.expectedRegistration || "—"}</div>
              <div><small>Source</small>{d.source}</div>
              <div><small>Documents</small>{Object.entries(d.docs).filter(([, v]) => v).length} of 6 received</div>
              {d.notes ? <div className="wide"><small>Notes</small>{d.notes}</div> : null}
              <div><small>Created</small>{new Date(b.createdAt).toLocaleString("en-IN")}</div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
