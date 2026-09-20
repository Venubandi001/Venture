"use client";

import { useState } from "react";
import BookingApplicationModal from "./BookingApplicationModal";

const ROWS = [
  {
    applicant: "Rahul K.",
    mobile: "+91 98•••••210",
    venture: "Green Valley",
    plot: "P-124",
    area: "220 Sq.Yds",
    payment: "Bank finance",
    salesPerson: "Ravi Kumar",
    status: "New",
    statusClass: "available",
    received: "8m",
  },
  {
    applicant: "Priya R.",
    mobile: "+91 97•••••842",
    venture: "Green Valley",
    plot: "P-108",
    area: "200 Sq.Yds",
    payment: "Self funded",
    salesPerson: "Anjali Reddy",
    status: "Review",
    statusClass: "hold",
    received: "34m",
  },
  {
    applicant: "Arjun S.",
    mobile: "+91 99•••••391",
    venture: "Lakeview Enclave",
    plot: "P-216",
    area: "250 Sq.Yds",
    payment: "Bank finance",
    salesPerson: "Suresh Naik",
    status: "Documents",
    statusClass: "reserved",
    received: "1h",
  },
];

const KPIS = [
  { label: "Booking applications", value: "28", note: "6 new today" },
  { label: "Awaiting review", value: "11", note: "Customer documents pending" },
  { label: "Selected plots", value: "19", note: "Plot preference captured" },
  { label: "Booking value", value: "₹7.4 Cr", note: "Applications in pipeline" },
];

export default function BookingApplicationsView() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section>
      <div className="eyebrow">Sales / Booking workflow</div>
      <div className="page-title-row">
        <div>
          <h1>Booking applications</h1>
          <p style={{ color: "#7b867f" }}>
            Capture the complete customer, plot, KYC, payment and booking
            information before a plot moves into booking.
          </p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>
          + New Booking Application
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
          <b>Recent booking applications</b>
          <button className="btn ghost" onClick={() => window.open("/", "_blank")}>
            Open customer booking flow
          </button>
        </div>
        <table className="inventory">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Mobile</th>
              <th>Venture</th>
              <th>Plot</th>
              <th>Area</th>
              <th>Preferred payment</th>
              <th>Sales Person</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.applicant}>
                <td><b>{r.applicant}</b></td>
                <td>{r.mobile}</td>
                <td>{r.venture}</td>
                <td>{r.plot}</td>
                <td>{r.area}</td>
                <td>{r.payment}</td>
                <td>{r.salesPerson}</td>
                <td>
                  <span className={`badge ${r.statusClass}`}>{r.status}</span>
                </td>
                <td>{r.received}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <BookingApplicationModal onClose={() => setShowModal(false)} />
      ) : null}
    </section>
  );
}
