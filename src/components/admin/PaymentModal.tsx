"use client";

import { useState } from "react";
import { useToast } from "../ToastProvider";

export default function PaymentModal({ onClose }: { onClose: () => void }) {
  const showToast = useToast();
  const [amount, setAmount] = useState("");

  function submit() {
    if (!amount.trim()) {
      showToast("Payment amount is required");
      return;
    }
    onClose();
    showToast("Payment record saved — pending verification");
  }

  return (
    <div className="booking-modal-bg" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-head">
          <div>
            <div className="eyebrow">Finance / Payment entry</div>
            <h2>Record payment received</h2>
            <p>Capture who sent the money, who received it, how it was paid, and the complete transaction trail.</p>
          </div>
          <button className="booking-close" onClick={onClose}>×</button>
        </div>

        <div className="booking-section">
          <h3>1 · Booking & customer</h3>
          <div className="booking-grid">
            <div className="field"><label>Booking ID <span className="booking-required">*</span></label><input placeholder="BK-2026-00124" /></div>
            <div className="field"><label>Receipt number</label><input placeholder="REC-24092" /></div>
            <div className="field"><label>Venture</label><select><option>Haritha Vanam</option><option>Green Valley</option><option>Lakeview Enclave</option><option>Oak County</option></select></div>
            <div className="field"><label>Plot number <span className="booking-required">*</span></label><input placeholder="P-124" /></div>
            <div className="field"><label>Customer / payer name <span className="booking-required">*</span></label><input placeholder="Full legal name" /></div>
            <div className="field"><label>Customer mobile</label><input placeholder="+91" /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>2 · Sender / Payer details</h3>
          <div className="booking-grid">
            <div className="field"><label>Payment sender name <span className="booking-required">*</span></label><input placeholder="Name on bank / UPI account" /></div>
            <div className="field"><label>Sender type</label><select><option>Customer</option><option>Joint applicant</option><option>Company / employer</option><option>Family member</option><option>Other</option></select></div>
            <div className="field"><label>Sender bank</label><input placeholder="Bank name" /></div>
            <div className="field"><label>Sender account last 4 digits</label><input placeholder="1234" /></div>
            <div className="field"><label>Sender UPI ID</label><input placeholder="name@upi" /></div>
            <div className="field"><label>Sender PAN</label><input placeholder="ABCDE1234F" /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>3 · Payment details</h3>
          <div className="booking-grid">
            <div className="field">
              <label>Amount received <span className="booking-required">*</span></label>
              <input placeholder="₹" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field"><label>Payment mode <span className="booking-required">*</span></label><select><option>NEFT</option><option>RTGS</option><option>IMPS</option><option>UPI</option><option>Bank transfer</option><option>Cheque</option><option>DD</option><option>Cash</option><option>Payment gateway</option><option>Loan disbursement</option></select></div>
            <div className="field"><label>Payment date <span className="booking-required">*</span></label><input type="date" /></div>
            <div className="field"><label>Payment time</label><input type="time" /></div>
            <div className="field"><label>UTR / transaction ID <span className="booking-required">*</span></label><input placeholder="Bank / UPI / gateway reference" /></div>
            <div className="field"><label>Cheque / DD number</label><input placeholder="If applicable" /></div>
            <div className="field"><label>Bank / gateway</label><input placeholder="Receiving bank or payment gateway" /></div>
            <div className="field"><label>Installment</label><select><option>Booking amount</option><option>1st installment</option><option>2nd installment</option><option>Final payment</option><option>Other</option></select></div>
            <div className="field"><label>Payment purpose</label><select><option>Plot booking</option><option>Plot installment</option><option>Registration-related payment</option><option>Other</option></select></div>
            <div className="field"><label>Transaction charges</label><input placeholder="₹0" /></div>
            <div className="field"><label>Net amount credited</label><input placeholder="₹" /></div>
            <div className="field full"><label>Payment notes</label><textarea placeholder="Payment remarks, bank confirmation, cheque details or other reconciliation notes" /></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>4 · Receiver / company details</h3>
          <div className="booking-grid">
            <div className="field"><label>Received by person <span className="booking-required">*</span></label><select><option>Ravi Kumar</option><option>Anjali Reddy</option><option>Suresh Naik</option><option>Accounts Team</option><option>Finance Manager</option></select></div>
            <div className="field"><label>Receiver organization</label><input defaultValue="Venture Plot Developments" /></div>
            <div className="field"><label>Receiving bank account</label><input placeholder="Company account / collection account" /></div>
            <div className="field"><label>Account last 4 digits</label><input placeholder="5678" /></div>
            <div className="field"><label>Received / verified by</label><input placeholder="Finance team member" /></div>
            <div className="field"><label>Verification status</label><select><option>Pending verification</option><option>Verified</option><option>Rejected</option></select></div>
          </div>
        </div>

        <div className="booking-section">
          <h3>5 · Receipt & reconciliation</h3>
          <div className="booking-grid">
            <div className="field"><label>Receipt status</label><select><option>Draft</option><option>Issued</option><option>Cancelled</option></select></div>
            <div className="field"><label>Receipt date</label><input type="date" /></div>
            <div className="field"><label>Accounting reference</label><input placeholder="Ledger / voucher number" /></div>
            <div className="field"><label>Sales person</label><select><option>Ravi Kumar</option><option>Anjali Reddy</option><option>Suresh Naik</option></select></div>
            <div className="field full"><label>Upload / attach payment proof</label><div className="upload">Bank advice · UTR screenshot · cheque image · gateway receipt</div></div>
          </div>
        </div>

        <div className="booking-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>Save payment record</button>
        </div>
      </div>
    </div>
  );
}
