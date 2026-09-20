"use client";

import { useState } from "react";
import { VENTURE_PROFILES } from "@/lib/ventures";
import { useToast } from "../ToastProvider";

const PLOT_OPTIONS = ["P-101", "P-102", "P-108", "P-124", "P-216", "P-250"];

export default function BookingApplicationModal({ onClose }: { onClose: () => void }) {
  const showToast = useToast();
  const [venture, setVenture] = useState(Object.keys(VENTURE_PROFILES)[0]);
  const [applicantName, setApplicantName] = useState("");

  function submit() {
    if (!applicantName.trim()) {
      showToast("Applicant full name is required");
      return;
    }
    onClose();
    showToast("Booking application saved — ready for KYC and review");
  }

  return (
    <div className="booking-modal-bg" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-head">
          <div>
            <div className="eyebrow">New booking application</div>
            <h2>Plot booking details</h2>
            <p>Capture the customer and transaction details required before confirming a plot booking.</p>
          </div>
          <button className="booking-close" onClick={onClose}>×</button>
        </div>

        <div className="booking-section">
          <h3>1 · Venture & plot selection</h3>
          <div className="booking-grid">
            <div className="field">
              <label>Venture <span className="booking-required">*</span></label>
              <select value={venture} onChange={(e) => setVenture(e.target.value)}>
                {Object.keys(VENTURE_PROFILES).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Plot number <span className="booking-required">*</span></label>
              <select>
                {PLOT_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Plot status</label>
              <select>
                <option>Hold for booking</option>
                <option>Available</option>
              </select>
            </div>
            <div className="field">
              <label>Area</label>
              <input defaultValue="220 Sq.Yds" readOnly />
            </div>
            <div className="field">
              <label>Facing</label>
              <select>
                <option>East</option>
                <option>West</option>
                <option>North</option>
                <option>South</option>
                <option>North-East</option>
                <option>North-West</option>
                <option>South-East</option>
                <option>South-West</option>
              </select>
            </div>
            <div className="field">
              <label>Quoted price</label>
              <input placeholder="₹40,00,000" />
            </div>
            <div className="field full">
              <label>Plot dimensions / road width</label>
              <input defaultValue="40 × 50 FT · 40 FT road" />
            </div>
          </div>
        </div>

        <div className="booking-section">
          <h3>2 · Applicant details</h3>
          <div className="booking-grid">
            <div className="field">
              <label>Applicant full name <span className="booking-required">*</span></label>
              <input
                placeholder="Full legal name"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Mobile number <span className="booking-required">*</span></label>
              <input placeholder="+91" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="name@email.com" />
            </div>
            <div className="field">
              <label>Date of birth</label>
              <input type="date" />
            </div>
            <div className="field">
              <label>Occupation</label>
              <input placeholder="Occupation / business" />
            </div>
            <div className="field">
              <label>Marital status</label>
              <select>
                <option>Select</option>
                <option>Single</option>
                <option>Married</option>
              </select>
            </div>
            <div className="field full">
              <label>Permanent address <span className="booking-required">*</span></label>
              <textarea placeholder="House / flat, street, locality, city, state, PIN" />
            </div>
            <div className="field">
              <label>City</label>
              <input placeholder="City" />
            </div>
            <div className="field">
              <label>State</label>
              <input placeholder="State" />
            </div>
            <div className="field">
              <label>PIN code</label>
              <input placeholder="PIN" />
            </div>
          </div>
        </div>

        <div className="booking-section">
          <h3>3 · KYC & nominee</h3>
          <div className="booking-grid">
            <div className="field">
              <label>PAN number <span className="booking-required">*</span></label>
              <input placeholder="ABCDE1234F" />
            </div>
            <div className="field">
              <label>Aadhaar / ID last 4 digits</label>
              <input placeholder="XXXX" />
            </div>
            <div className="field">
              <label>KYC status</label>
              <select>
                <option>Pending</option>
                <option>Submitted</option>
                <option>Verified</option>
              </select>
            </div>
            <div className="field">
              <label>Nominee name</label>
              <input placeholder="Nominee full name" />
            </div>
            <div className="field">
              <label>Nominee relationship</label>
              <input placeholder="Father / Mother / Spouse / Other" />
            </div>
            <div className="field">
              <label>Nominee mobile</label>
              <input placeholder="+91" />
            </div>
          </div>
        </div>

        <div className="booking-section">
          <h3>4 · Payment & booking</h3>
          <div className="booking-grid">
            <div className="field">
              <label>Payment mode <span className="booking-required">*</span></label>
              <select>
                <option>Self funded</option>
                <option>Bank finance</option>
                <option>Combination</option>
              </select>
            </div>
            <div className="field">
              <label>Booking amount <span className="booking-required">*</span></label>
              <input placeholder="₹" />
            </div>
            <div className="field">
              <label>Payment reference</label>
              <input placeholder="UTR / transaction ID / cheque no." />
            </div>
            <div className="field">
              <label>Expected registration date</label>
              <input type="date" />
            </div>
            <div className="field">
              <label>Sales person <span className="booking-required">*</span></label>
              <select>
                <option>Ravi Kumar</option>
                <option>Anjali Reddy</option>
                <option>Suresh Naik</option>
              </select>
            </div>
            <div className="field">
              <label>Booking source</label>
              <select>
                <option>Website</option>
                <option>Walk-in</option>
                <option>Referral</option>
                <option>Instagram</option>
                <option>Broker</option>
              </select>
            </div>
            <div className="field full">
              <label>Customer notes / special terms</label>
              <textarea placeholder="Any agreed commercial terms, payment schedule or customer notes" />
            </div>
          </div>
        </div>

        <div className="booking-section">
          <h3>5 · Documents & declarations</h3>
          <div className="booking-checks">
            <label><input type="checkbox" /> PAN copy received</label>
            <label><input type="checkbox" /> ID proof received</label>
            <label><input type="checkbox" /> Address proof received</label>
            <label><input type="checkbox" /> Passport photo received</label>
            <label><input type="checkbox" /> Payment proof received</label>
            <label><input type="checkbox" /> Customer declaration signed</label>
          </div>
        </div>

        <div className="booking-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>Save booking application</button>
        </div>
      </div>
    </div>
  );
}
