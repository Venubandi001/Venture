import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  BOOKING_SOURCES, BookingDetails, BookingRow, BookingStatus, DOC_CHECKS, KYC_STATUSES, NEXT_BOOKING_STATUS, PAYMENT_MODES, PLOT_FOR_BOOKING,
} from "@/shared/bookings";
import type { User } from "@/shared/users";
import { audit } from "./audit";
import { encrypt } from "./crypto";
import { db, schema } from "./db/index";
import { auditPlotChanges, changePlotStatuses } from "./plots";
import { getVenture } from "./ventures";

const { bookingApplications: ba, users } = schema;
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const amount = (v: unknown) => { const n = Number(String(v ?? "").replace(/[₹,\s]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
const date = (v: unknown) => { const d = s(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ""; };

export interface BookingInput {
  ventureSlug: string; plotNumber: string; applicantName: string; mobile: string; email: string | null;
  pan: string | null; salesPersonId: number; leadId: number | null; details: BookingDetails;
}

export function parseBooking(body: unknown): BookingInput | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const d = (b.details ?? {}) as Record<string, unknown>;
  const nominee = (d.nominee ?? {}) as Record<string, unknown>;
  const docs = (d.docs ?? {}) as Record<string, unknown>;
  const name = s(b.applicantName, 80), mobile = s(b.mobile, 20).replace(/[\s-]/g, ""), email = s(b.email, 254).toLowerCase();
  const pan = s(b.pan, 10).toUpperCase();
  if (!s(b.ventureSlug, 64) || !s(b.plotNumber, 20)) return { error: "Choose the venture and plot" };
  if (name.length < 2) return { error: "Enter the applicant's full name" };
  if (!/^\+?\d{10,15}$/.test(mobile)) return { error: "Enter a valid mobile number" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email" };
  if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return { error: "PAN must look like ABCDE1234F" };
  const address = s(d.address, 400);
  if (address.length < 8) return { error: "Enter the permanent address" };
  const aadhaarLast4 = s(d.aadhaarLast4, 4);
  if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) return { error: "Aadhaar: enter only the last 4 digits" };
  const pin = s(d.pin, 6);
  if (pin && !/^\d{6}$/.test(pin)) return { error: "PIN code must be 6 digits" };
  const paymentMode = PAYMENT_MODES.includes(s(d.paymentMode, 30)) ? s(d.paymentMode, 30) : "";
  if (!paymentMode) return { error: "Choose the payment mode" };
  const bookingAmount = amount(d.bookingAmount);
  if (!bookingAmount) return { error: "Enter the booking amount" };
  const salesPersonId = Number(b.salesPersonId);
  if (!Number.isInteger(salesPersonId)) return { error: "Choose the sales person" };
  return {
    ventureSlug: s(b.ventureSlug, 64), plotNumber: s(b.plotNumber, 20), applicantName: name, mobile, email: email || null,
    pan: pan || null, salesPersonId, leadId: Number.isInteger(b.leadId) ? (b.leadId as number) : null,
    details: {
      dob: date(d.dob), occupation: s(d.occupation, 80), maritalStatus: s(d.maritalStatus, 20), address, city: s(d.city, 60), state: s(d.state, 60), pin,
      aadhaarLast4, kycStatus: KYC_STATUSES.includes(s(d.kycStatus, 20)) ? s(d.kycStatus, 20) : "Pending",
      nominee: { name: s(nominee.name, 80), relation: s(nominee.relation, 40), mobile: s(nominee.mobile, 20) },
      quotedPrice: amount(d.quotedPrice), paymentMode, bookingAmount,
      paymentReference: s(d.paymentReference, 80), expectedRegistration: date(d.expectedRegistration),
      source: BOOKING_SOURCES.includes(s(d.source, 30)) ? s(d.source, 30) : "Other",
      notes: s(d.notes, 1000),
      docs: Object.fromEntries(DOC_CHECKS.map(([k]) => [k, docs[k] === true])) as BookingDetails["docs"],
    },
  };
}

export async function listBookings(): Promise<BookingRow[]> {
  const rows = await db().select({
    id: ba.id, ventureSlug: ba.ventureSlug, plotNumber: ba.plotNumber, status: ba.status, applicantName: ba.applicantName, mobile: ba.mobile,
    email: ba.email, panLast4: ba.panLast4, details: ba.details, salesPersonId: ba.salesPersonId, salesPersonName: users.name, createdAt: ba.createdAt,
  }).from(ba).leftJoin(users, eq(users.id, ba.salesPersonId)).orderBy(desc(ba.createdAt)).limit(500);
  return rows.map((r) => ({ ...r, details: r.details as BookingDetails, createdAt: r.createdAt.toISOString() }));
}

/** New application: holds the plot in the same transaction; refuses plots that are taken or already applied for. */
export async function createBooking(u: User, v: BookingInput): Promise<{ id: number } | { error: string; status: number }> {
  if (!(await getVenture(v.ventureSlug))) return { error: "Unknown venture", status: 404 };
  const [sp] = await db().select({ active: users.active }).from(users).where(eq(users.id, v.salesPersonId));
  if (!sp?.active) return { error: "Choose an active sales person", status: 400 };
  if (v.pan && !process.env.DATA_ENCRYPTION_KEY) return { error: "Server is missing DATA_ENCRYPTION_KEY — PAN can't be stored safely", status: 500 };

  let result: { id: number; changed: Awaited<ReturnType<typeof changePlotStatuses>> } | { error: string; status: number };
  try {
    result = await db().transaction(async (tx) => {
      const [open] = await tx.select({ id: ba.id }).from(ba)
        .where(and(eq(ba.ventureSlug, v.ventureSlug), eq(ba.plotNumber, v.plotNumber), ne(ba.status, "cancelled")));
      if (open) throw new Error(`Plot ${v.plotNumber} already has an open application (#${open.id})`);
      const changed = await changePlotStatuses(v.ventureSlug, (p) => p.number === v.plotNumber, "hold", {
        tx, guard: (p) => (p.status === "available" || p.status === "hold" ? null : `Plot ${p.number} is not available (${p.status})`),
      });
      if ("error" in changed) throw new Error(changed.error);
      const [row] = await tx.insert(ba).values({
        ventureSlug: v.ventureSlug, plotNumber: v.plotNumber, applicantName: v.applicantName, mobile: v.mobile, email: v.email,
        panEnc: v.pan ? encrypt(v.pan) : null, panLast4: v.pan ? v.pan.slice(-4) : null, details: v.details,
        salesPersonId: v.salesPersonId, leadId: v.leadId, createdBy: u.id,
      }).returning({ id: ba.id });
      return { id: row.id, changed };
    });
  } catch (e) {
    return { error: (e as Error).message, status: 409 };
  }
  if ("error" in result) return result;
  if ("changed" in result.changed) await auditPlotChanges(u, v.ventureSlug, result.changed.changed, "hold", `booking application #${result.id}`);
  await audit(u, "booking.create", "booking", String(result.id), `Booking application #${result.id}: ${v.applicantName} for ${v.ventureSlug} plot ${v.plotNumber}`);
  return { id: result.id };
}

/** Move an application forward (or cancel it); the plot follows in the same transaction. */
export async function advanceBooking(u: User, id: number, to: BookingStatus): Promise<{ ok: true } | { error: string; status: number }> {
  const [b] = await db().select().from(ba).where(eq(ba.id, id));
  if (!b) return { error: "Application not found", status: 404 };
  if (!NEXT_BOOKING_STATUS[b.status].includes(to)) return { error: `Can't go from ${b.status} to ${to}`, status: 400 };
  const plotTo = PLOT_FOR_BOOKING[to];
  let changed;
  try {
    changed = await db().transaction(async (tx) => {
      const r = await changePlotStatuses(b.ventureSlug, (p) => p.number === b.plotNumber, plotTo, { tx });
      if ("error" in r) throw new Error(r.error);
      await tx.update(ba).set({ status: to, updatedAt: new Date() }).where(eq(ba.id, id));
      return r.changed;
    });
  } catch (e) {
    return { error: (e as Error).message, status: 409 };
  }
  await auditPlotChanges(u, b.ventureSlug, changed, plotTo, `booking application #${id}`);
  await audit(u, "booking.status", "booking", String(id), `Booking #${id} (${b.applicantName}, plot ${b.plotNumber}): ${b.status} → ${to}`, { status: [b.status, to] });
  return { ok: true };
}
