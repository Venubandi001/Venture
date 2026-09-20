"use client";

import { useState } from "react";
import PaymentModal from "./PaymentModal";

const KPIS = [
  { label: "Total bookings", value: "73", note: "Across all ventures" },
  { label: "Amount received", value: "₹2.86 Cr", note: "This booking pipeline" },
  { label: "Pending collection", value: "₹1.42 Cr", note: "Scheduled / outstanding" },
  { label: "Payments today", value: "₹18.4 L", note: "9 transactions" },
];

const ROWS = [
  {
    receipt: "REC-24091",
    sender: "Rahul Kumar",
    ventureplot: "Green Valley · P-124",
    mode: "NEFT",
    ref: "HDFC9A82••",
    amount: "₹8,00,000",
    receivedBy: "Ravi Kumar",
    status: "Received",
    statusClass: "available",
    date: "18 Sep 2026",
  },
  {
    receipt: "REC-24090",
    sender: "Priya Reddy",
    ventureplot: "Green Valley · P-108",
    mode: "UPI",
    ref: "UPI-8261••",
    amount: "₹5,00,000",
    receivedBy: "Anjali Reddy",
    status: "Received",
    statusClass: "available",
    date: "18 Sep 2026",
  },
  {
    receipt: "REC-24089",
    sender: "Arjun Naik",
    ventureplot: "Lakeview Enclave · P-216",
    mode: "Bank finance",
    ref: "LOAN-DISB-••",
    amount: "₹12,50,000",
    receivedBy: "Suresh Naik",
    status: "Pending receipt",
    statusClass: "hold",
    date: "17 Sep 2026",
  },
];

export default function BookingsView() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section>
      <div className="eyebrow">Sales / Finance</div>
      <div className="page-title-row">
        <div>
          <h1>Bookings & payments</h1>
          <p style={{ color: "#7b867f" }}>
            Track booking amounts, installments and every payment received
            with complete sender, receiver and transaction details.
          </p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Record Payment
        </button>
      </div>

      <div className="admin-kpis">
        {KPIS.map((k) => (
          <div className="admin-kpi" key={k.label}>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span>{k.note}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="cardhead">
          <b>Payment register</b>
          <span>Booking · sender · receiver · mode · UTR · amount · status</span>
        </div>
        <table className="inventory">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Customer / Sender</th>
              <th>Venture · Plot</th>
              <th>Payment Mode</th>
              <th>UTR / Reference</th>
              <th>Amount</th>
              <th>Received By</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.receipt}>
                <td><b>{r.receipt}</b></td>
                <td>{r.sender}</td>
                <td>{r.ventureplot}</td>
                <td>{r.mode}</td>
                <td>{r.ref}</td>
                <td>{r.amount}</td>
                <td>{r.receivedBy}</td>
                <td>
                  <span className={`badge ${r.statusClass}`}>{r.status}</span>
                </td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal ? <PaymentModal onClose={() => setShowModal(false)} /> : null}
    </section>
  );
}
