// Postgres schema (Drizzle). Phase 0 mirrors what the app stores today; Phase 1 splits plots + status history out of layouts.json.
import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "sales"] }).notNull(),
  passHash: text("pass_hash").notNull(),
  active: boolean("active").notNull().default(true), // deactivate instead of delete: keeps lead history
  mustChangePassword: boolean("must_change_password").notNull().default(false), // after admin reset / CLI create
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("users_role_chk", sql`${t.role} in ('admin','sales')`)]);

/** Single-use "forgot password" links; only the SHA-256 of the token is stored. */
export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A buyer's booking application for one plot; its status drives the plot status (Hold → Received → Confirmed → Sold). */
export const bookingApplications = pgTable("booking_applications", {
  id: serial("id").primaryKey(),
  ventureSlug: text("venture_slug").notNull().references(() => ventures.slug, { onUpdate: "cascade" }),
  plotNumber: text("plot_number").notNull(),
  status: text("status", { enum: ["submitted", "received", "confirmed", "sold", "cancelled"] }).notNull().default("submitted"),
  applicantName: text("applicant_name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  panEnc: text("pan_enc"), // AES-256-GCM (DATA_ENCRYPTION_KEY); never returned by list APIs
  panLast4: text("pan_last4"),
  details: jsonb("details").notNull(), // address, KYC, nominee, payment mode/amount, source, notes, document checklist
  salesPersonId: integer("sales_person_id").references(() => users.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("booking_status_chk", sql`${t.status} in ('submitted','received','confirmed','sold','cancelled')`),
  index("booking_plot_idx").on(t.ventureSlug, t.plotNumber),
  index("booking_created_idx").on(t.createdAt.desc()),
]);

/** Who changed what, when — append-only. Powers Admin → Audit Log, plot history and the dashboard activity feed. */
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(), // snapshot, so history reads right after a user is removed
  action: text("action").notNull(), // e.g. plot.status, lead.status, venture.update, layout.publish, user.reset
  entity: text("entity").notNull(), // plot | lead | venture | layout | user | booking
  entityId: text("entity_id").notNull(), // e.g. "my-fortune:45", lead id, slug
  summary: text("summary").notNull(), // human sentence shown in the UI
  details: jsonb("details"), // { status: [from, to] } etc.
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_at_idx").on(t.at.desc()), index("audit_entity_idx").on(t.entity, t.entityId, t.at.desc())]);

/** Rate-limit log shared by every server instance (login, forgot password, public lead form). */
export const authAttempts = pgTable("auth_attempts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  key: text("key").notNull(), // e.g. "login:ip:1.2.3.4", "login:email:a@b.com"
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("auth_attempts_key_at_idx").on(t.key, t.at)]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Venture profile (name, location, branding). The plot map for it lives in `layouts` under the same slug. */
export const ventures = pgTable("ventures", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["live", "coming_soon", "draft", "archived"] }).notNull().default("draft"),
  sort: integer("sort").notNull().default(0),
  data: jsonb("data").notNull(), // tagline, logo, city, address, coordinates, acres, RERA, amenities…
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("ventures_status_chk", sql`${t.status} in ('live','coming_soon','draft','archived')`)]);

export const layouts = pgTable("layouts", {
  slug: text("slug").primaryKey(),
  json: jsonb("json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  plotNumber: text("plot_number"),
  kind: text("kind", { enum: ["enquiry", "visit"] }).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  visitDate: text("visit_date"),
  visitSlot: text("visit_slot"),
  message: text("message"),
  status: text("status", { enum: ["new", "contacted", "visit", "booked", "lost"] }).notNull().default("new"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("leads_kind_chk", sql`${t.kind} in ('enquiry','visit')`),
  check("leads_status_chk", sql`${t.status} in ('new','contacted','visit','booked','lost')`),
  index("leads_created_idx").on(t.createdAt.desc()),
]);
