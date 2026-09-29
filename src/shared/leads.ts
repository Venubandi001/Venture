// Lead constants shared by the buyer form, the admin Leads screen and server validation.
export const VISIT_SLOTS = ["10:00 – 12:00", "12:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00"];
export const LEAD_STATUSES = ["new", "contacted", "visit", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
