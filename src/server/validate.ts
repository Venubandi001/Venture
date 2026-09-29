import "server-only";
// Input validation for the public/admin APIs (server-side; the client forms mirror these rules).
import { VISIT_SLOTS } from "@/shared/leads";
import { PASSWORD_MIN } from "@/shared/users";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const cleanEmail = (v: unknown) => s(v, 254).toLowerCase();

export function validPassword(pw: unknown): string | { error: string } {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN || pw.length > 200) return { error: `Password must be at least ${PASSWORD_MIN} characters` };
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return { error: "Use letters and at least one number" };
  return pw;
}

export interface LeadInput {
  slug: string;
  plotNumber: string | null;
  kind: "enquiry" | "visit";
  name: string;
  phone: string;
  email: string | null;
  visitDate: string | null;
  visitSlot: string | null;
  message: string | null;
}

export function validLead(body: unknown): LeadInput | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind = b.kind === "visit" ? "visit" : "enquiry";
  const name = s(b.name, 80), phone = s(b.phone, 20).replace(/[\s-]/g, ""), email = cleanEmail(b.email);
  if (name.length < 2) return { error: "Please enter your name" };
  if (!/^\+?\d{10,15}$/.test(phone)) return { error: "Please enter a valid mobile number" };
  if (email && !EMAIL.test(email)) return { error: "Please enter a valid email" };
  let visitDate: string | null = null, visitSlot: string | null = null;
  if (kind === "visit") {
    visitDate = s(b.visitDate, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || visitDate < today) return { error: "Pick a visit date from today onwards" };
    visitSlot = VISIT_SLOTS.includes(s(b.visitSlot, 20)) ? s(b.visitSlot, 20) : VISIT_SLOTS[0];
  }
  return {
    slug: s(b.slug, 64),
    plotNumber: s(b.plotNumber, 20) || null,
    kind, name, phone, email: email || null, visitDate, visitSlot,
    message: s(b.message, 1000) || null,
  };
}
