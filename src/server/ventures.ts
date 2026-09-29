import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { UPLOAD_NAME } from "@/shared/layout";
import { AMENITY_OPTIONS, isPublicVenture, slugify, Venture, VENTURE_STATUSES, VentureStatus } from "@/shared/ventures";
import { db, schema } from "./db/index";

const { ventures } = schema;
type Row = typeof ventures.$inferSelect;

function fromRow(r: Row): Venture {
  const d = r.data as Omit<Venture, "slug" | "name" | "status" | "sort">;
  return { ...d, slug: r.slug, name: r.name, status: r.status, sort: r.sort, amenities: d.amenities ?? [] };
}

/** All ventures, ordered — deduplicated per request. */
export const listVentures = cache(async (): Promise<Venture[]> =>
  (await db().select().from(ventures).orderBy(asc(ventures.sort), asc(ventures.name))).map(fromRow));

export async function getVenture(slug: string): Promise<Venture | null> {
  return (await listVentures()).find((v) => v.slug === slug) ?? null;
}

export async function listPublicVentures() {
  return (await listVentures()).filter(isPublicVenture);
}

export async function saveVenture(v: Venture, create: boolean): Promise<void> {
  const { slug, name, status, sort, ...data } = v;
  if (create) await db().insert(ventures).values({ slug, name, status, sort, data });
  else await db().update(ventures).set({ name, status, sort, data, updatedAt: new Date() }).where(eq(ventures.slug, slug));
}

// ---------- validation (admin input) ----------
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const upload = (v: unknown) => (typeof v === "string" && v.startsWith("/api/uploads/") && UPLOAD_NAME.test(v.slice(13)) ? v : null);

export function parseVentureInput(body: unknown, slug: string | null): Venture | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = s(b.name, 80);
  if (name.length < 2) return { error: "Enter the venture name" };
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || lat < -85 || lat > 85 || !Number.isFinite(lng) || lng < -180 || lng > 180)
    return { error: "Enter valid coordinates (latitude, longitude)" };
  const status = (VENTURE_STATUSES as readonly string[]).includes(String(b.status)) ? (b.status as VentureStatus) : "draft";
  const pin = s(b.pin, 10);
  if (pin && !/^\d{6}$/.test(pin)) return { error: "PIN code must be 6 digits" };
  const acres = s(b.acres, 12);
  if (acres && !/^\d+(\.\d+)?$/.test(acres)) return { error: "Acres must be a number, e.g. 11 or 18.42" };
  const finalSlug = slug ?? slugify(s(b.slug, 60) || name);
  if (!finalSlug) return { error: "Enter a name with letters or numbers" };
  return {
    slug: finalSlug, name, status,
    sort: Number.isInteger(b.sort) ? Math.max(0, Math.min(999, b.sort as number)) : 99,
    tagline: s(b.tagline, 80),
    logoText: s(b.logoText, 3).toUpperCase(),
    logoUrl: upload(b.logoUrl),
    coverUrl: upload(b.coverUrl),
    city: s(b.city, 80), locality: s(b.locality, 120), address: s(b.address, 300), pin, acres,
    lat: +lat.toFixed(6), lng: +lng.toFixed(6),
    rera: s(b.rera, 120),
    amenities: Array.isArray(b.amenities) ? [...new Set(b.amenities.map((a) => s(a, 40)).filter((a) => AMENITY_OPTIONS.includes(a)))] : [],
  };
}
