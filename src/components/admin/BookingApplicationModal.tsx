"use client";

import { useEffect, useMemo, useState } from "react";
import { BOOKING_SOURCES, DOC_CHECKS, KYC_STATUSES, PAYMENT_MODES } from "@/shared/bookings";
import { edgeLengths, formatInr, plotAreaSqYd, plotPrice, VentureLayout } from "@/shared/layout";
import { STATUS_LABEL } from "@/shared/types";
import { useToast } from "../ToastProvider";
import { VentureSelect } from "./VenturesContext";

interface Member { id: number; name: string; active?: boolean }

const blank = {
  applicantName: "", mobile: "", email: "", pan: "",
  dob: "", occupation: "", maritalStatus: "", address: "", city: "", state: "Telangana", pin: "",
  aadhaarLast4: "", kycStatus: "Pending", nomineeName: "", nomineeRelation: "", nomineeMobile: "",
  quotedPrice: "", paymentMode: PAYMENT_MODES[0], bookingAmount: "", paymentReference: "", expectedRegistration: "",
  source: BOOKING_SOURCES[0], notes: "",
};

export default function BookingApplicationModal({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved: () => void }) {
  const showToast = useToast();
  const [venture, setVenture] = useState(slug);
  const [layout, setLayout] = useState<VentureLayout | null>(null);
  const [plotNumber, setPlotNumber] = useState("");
  const [team, setTeam] = useState<Member[]>([]);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [f, setF] = useState(blank);
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((rows: Member[]) => setTeam(rows.filter((t) => t.active !== false))).catch(() => {});
  }, []);
  useEffect(() => {
    let stale = false;
    fetch(`/api/layouts/${venture}`).then((r) => r.json()).then((l: VentureLayout) => { if (!stale) { setLayout(l); setPlotNumber(""); } });
    return () => { stale = true; };
  }, [venture]);

  // only plots that can still be applied for
  const open = useMemo(() => (layout?.plots ?? []).filter((p) => p.status === "available" || p.status === "hold")
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })), [layout]);
  const plot = open.find((p) => p.number === plotNumber);
  const o = layout?.overlay;
  const price = plot && layout ? plotPrice(layout, plot) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ventureSlug: venture, plotNumber, applicantName: f.applicantName, mobile: f.mobile, email: f.email, pan: f.pan,
        salesPersonId: Number(salesPersonId),
        details: {
          dob: f.dob, occupation: f.occupation, maritalStatus: f.maritalStatus, address: f.address, city: f.city, state: f.state, pin: f.pin,
          aadhaarLast4: f.aadhaarLast4, kycStatus: f.kycStatus,
          nominee: { name: f.nomineeName, relation: f.nomineeRelation, mobile: f.nomineeMobile },
          quotedPrice: f.quotedPrice || price, paymentMode: f.paymentMode, bookingAmount: f.bookingAmount,
          paymentReference: f.paymentReference, expectedRegistration: f.expectedRegistration, source: f.source, notes: f.notes, docs,
        },
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setError(j.error ?? "Could not save");
    showToast(`Application #${j.id} saved — plot ${plotNumber} is now on Hold`);
    onSaved();
    onClose();
  }

  return (
    <div className="booking-modal-bg" onClick={onClose}>
      <form className="booking-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="booking-modal-head">
          <div>
            <div className="eyebrow">New booking application</div>
            <h2>Plot booking details</h2>
            <p>Saving puts the plot on <b>Hold</b> so no one else can book it. Fields marked * are required.</p>
          </div>
          <button type="button" className="booking-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="booking-section">
          <h3>1 · Venture &amp; plot</h3>
          <div className="booking-grid">
            <div className="field"><label>Venture *</label><VentureSelect value={venture} onChange={setVenture} /></div>
            <div className="field">
              <label>Plot number *</label>
              <select value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} required>
                <option value="">{layout ? (open.length ? "Choose a plot" : "No open plots") : "Loading…"}</option>
                {open.map((p) => <option key={p.id} value={p.number}>{p.number}{p.status === "hold" ? " (on hold)" : ""}</option>)}
              </select>
            </div>
            <div className="field"><label>Quoted price (₹)</label><input inputMode="numeric" value={f.quotedPrice} onChange={set("quotedPrice")} placeholder={price ? String(price) : "e.g. 4000000"} /></div>
            {plot && o ? (
              <div className="field full booking-plot-facts">
                <span><b>{plotAreaSqYd(o, plot).toFixed(0)}</b> Sq.Yds</span>
                <span><b>{edgeLengths(o, plot.points).filter((x) => x >= 1).map((x) => x.toFixed(2)).join(" × ")}</b> m</span>
                <span>Facing <b>{plot.facing ?? "—"}</b></span>
                <span>Now <b>{STATUS_LABEL[plot.status]}</b></span>
                {price ? <span>List price <b>{formatInr(price)}</b></span> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="booking-section">
          <h3>2 · Applicant</h3>
          <div className="booking-grid">
            <div className="field"><label>Full name *</label><input value={f.applicantName} onChange={set("applicantName")} required minLength={2} autoComplete="off" /></div>
            <div className="field"><label>Mobile *</label><input value={f.mobile} onChange={set("mobile")} required inputMode="tel" placeholder="+91" /></div>
            <div className="field"><label>Email</label><input type="email" value={f.email} onChange={set("email")} /></div>
            <div className="field"><label>Date of birth</label><input type="date" value={f.dob} onChange={set("dob")} /></div>
            <div className="field"><label>Occupation</label><input value={f.occupation} onChange={set("occupation")} /></div>
            <div className="field"><label>Marital status</label>
              <select value={f.maritalStatus} onChange={set("maritalStatus")}><option value="">—</option><option>Single</option><option>Married</option></select>
            </div>
            <div className="field full"><label>Permanent address *</label><textarea value={f.address} onChange={set("address")} required minLength={8} /></div>
            <div className="field"><label>City</label><input value={f.city} onChange={set("city")} /></div>
            <div className="field"><label>State</label><input value={f.state} onChange={set("state")} /></div>
            <div className="field"><label>PIN code</label><input value={f.pin} onChange={set("pin")} inputMode="numeric" maxLength={6} /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>3 · KYC &amp; nominee</h3>
          <div className="booking-grid">
            <div className="field"><label>PAN (stored encrypted)</label><input value={f.pan} onChange={set("pan")} placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: "uppercase" }} /></div>
            <div className="field"><label>Aadhaar — last 4 digits only</label><input value={f.aadhaarLast4} onChange={set("aadhaarLast4")} inputMode="numeric" maxLength={4} /></div>
            <div className="field"><label>KYC status</label><select value={f.kycStatus} onChange={set("kycStatus")}>{KYC_STATUSES.map((k) => <option key={k}>{k}</option>)}</select></div>
            <div className="field"><label>Nominee name</label><input value={f.nomineeName} onChange={set("nomineeName")} /></div>
            <div className="field"><label>Nominee relationship</label><input value={f.nomineeRelation} onChange={set("nomineeRelation")} /></div>
            <div className="field"><label>Nominee mobile</label><input value={f.nomineeMobile} onChange={set("nomineeMobile")} inputMode="tel" /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>4 · Booking</h3>
          <div className="booking-grid">
            <div className="field"><label>Payment mode *</label><select value={f.paymentMode} onChange={set("paymentMode")}>{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
            <div className="field"><label>Booking amount (₹) *</label><input value={f.bookingAmount} onChange={set("bookingAmount")} inputMode="numeric" required /></div>
            <div className="field"><label>Payment reference</label><input value={f.paymentReference} onChange={set("paymentReference")} placeholder="UTR / cheque no." /></div>
            <div className="field"><label>Expected registration</label><input type="date" value={f.expectedRegistration} onChange={set("expectedRegistration")} /></div>
            <div className="field"><label>Sales person *</label>
              <select value={salesPersonId} onChange={(e) => setSalesPersonId(e.target.value)} required>
                <option value="">Choose</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Source</label><select value={f.source} onChange={set("source")}>{BOOKING_SOURCES.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="field full"><label>Notes / special terms</label><textarea value={f.notes} onChange={set("notes")} /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>5 · Documents received</h3>
          <div className="booking-checks">
            {DOC_CHECKS.map(([k, label]) => (
              <label key={k}><input type="checkbox" checked={!!docs[k]} onChange={(e) => setDocs({ ...docs, [k]: e.target.checked })} /> {label}</label>
            ))}
          </div>
        </div>

        {error ? <div className="login-error" role="alert">{error}</div> : null}
        <div className="booking-footer">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !plotNumber}>{busy ? "Saving…" : "Save application & hold plot"}</button>
        </div>
      </form>
    </div>
  );
}
