// Booking application model shared by the admin form, list and server validation.
import type { PlotStatus } from "./types";

export const BOOKING_STATUSES = ["submitted", "received", "confirmed", "sold", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  submitted: "Submitted",
  received: "Booking amount received",
  confirmed: "Booking confirmed",
  sold: "Registered / sold",
  cancelled: "Cancelled",
};

/** What each application step does to its plot. */
export const PLOT_FOR_BOOKING: Record<BookingStatus, PlotStatus> = {
  submitted: "hold",
  received: "received",
  confirmed: "confirmed",
  sold: "sold",
  cancelled: "available",
};

/** Allowed next steps (forward only; cancel any time before registration). */
export const NEXT_BOOKING_STATUS: Record<BookingStatus, BookingStatus[]> = {
  submitted: ["received", "confirmed", "cancelled"],
  received: ["confirmed", "cancelled"],
  confirmed: ["sold", "cancelled"],
  sold: [],
  cancelled: [],
};

export const PAYMENT_MODES = ["Self funded", "Bank finance", "Combination"];
export const BOOKING_SOURCES = ["Website", "Walk-in", "Referral", "Instagram", "Facebook", "Broker", "Newspaper", "Other"];
export const KYC_STATUSES = ["Pending", "Submitted", "Verified"];
export const DOC_CHECKS = [
  ["pan", "PAN copy received"],
  ["idProof", "ID proof received"],
  ["addressProof", "Address proof received"],
  ["photo", "Passport photo received"],
  ["paymentProof", "Payment proof received"],
  ["declaration", "Customer declaration signed"],
] as const;

export interface BookingDetails {
  dob: string;
  occupation: string;
  maritalStatus: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  aadhaarLast4: string;
  kycStatus: string;
  nominee: { name: string; relation: string; mobile: string };
  quotedPrice: number | null;
  paymentMode: string;
  bookingAmount: number | null;
  paymentReference: string;
  expectedRegistration: string;
  source: string;
  notes: string;
  docs: Record<(typeof DOC_CHECKS)[number][0], boolean>;
}

export interface BookingRow {
  id: number;
  ventureSlug: string;
  plotNumber: string;
  status: BookingStatus;
  applicantName: string;
  mobile: string;
  email: string | null;
  panLast4: string | null;
  details: BookingDetails;
  salesPersonId: number | null;
  salesPersonName: string | null;
  createdAt: string;
}
