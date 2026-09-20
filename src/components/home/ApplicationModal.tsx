"use client";

import { useState } from "react";
import { useToast } from "../ToastProvider";

export type ApplicationType = "site" | "booking" | "enquiry";

export default function ApplicationModal({
  type,
  onClose,
}: {
  type: ApplicationType;
  onClose: () => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState("");
  const [notes, setNotes] = useState("");

  const booking = type === "booking";
  const title =
    type === "site"
      ? "Request a site visit"
      : booking
      ? "Booking application"
      : "Enquire about this plot";

  function submit() {
    onClose();
    showToast(
      booking
        ? "Booking application submitted — the sales team will contact you."
        : "Request received — the sales team will contact you."
    );
  }

  return (
    <div className="modalbg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">GREEN VALLEY · PLOT APPLICATION</div>
        <h2>{title}</h2>
        <input
          placeholder="Your name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Mobile number *"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder={
            booking
              ? "Preferred payment: Self funded / Bank finance"
              : "Preferred date / requirement"
          }
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <textarea
          placeholder={
            booking
              ? "Address, PAN / ID availability, and any booking notes"
              : "Anything you would like us to know?"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>{" "}
        <button className="btn" onClick={submit}>
          Submit {booking ? "booking application" : "request"}
        </button>
      </div>
    </div>
  );
}
