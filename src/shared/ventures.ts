// Venture profile model — stored in the `ventures` table, edited in Admin → Ventures.
export const VENTURE_STATUSES = ["live", "coming_soon", "draft", "archived"] as const;
export type VentureStatus = (typeof VENTURE_STATUSES)[number];
export const VENTURE_STATUS_LABEL: Record<VentureStatus, string> = {
  live: "Live",
  coming_soon: "Coming soon",
  draft: "Draft (hidden)",
  archived: "Archived (hidden)",
};
/** Buyers can see live + coming-soon ventures; draft/archived are admin-only. */
export const isPublicVenture = (v: Pick<Venture, "status">) => v.status === "live" || v.status === "coming_soon";

export const AMENITY_OPTIONS = [
  "Grand entrance", "Central park", "Clubhouse", "Swimming pool", "Children's play area", "Play area", "Walking track",
  "Open gym", "Yoga park", "Amphitheatre", "Avenue plantation", "Security / CCTV", "Compound wall", "Street lighting",
  "LED street lighting", "Drinking water", "Underground drainage", "Electricity", "Cement concrete roads",
];

export interface Venture {
  slug: string; // URL id, fixed once created
  name: string;
  status: VentureStatus;
  sort: number;
  tagline: string;
  logoText: string; // initials shown when there is no logo image
  logoUrl: string | null;
  coverUrl: string | null;
  city: string;
  locality: string;
  address: string;
  pin: string;
  acres: string;
  lat: number;
  lng: number;
  rera: string;
  amenities: string[];
}

export const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "V";

export function emptyVenture(): Venture {
  return {
    slug: "", name: "", status: "draft", sort: 99, tagline: "", logoText: "", logoUrl: null, coverUrl: null,
    city: "", locality: "", address: "", pin: "", acres: "", lat: 17.385, lng: 78.4867, rera: "", amenities: [],
  };
}

/** What the buyer map and venture lists need. */
export interface VentureCard {
  slug: string;
  name: string;
  logo: string;
  logoUrl: string | null;
  loc: string;
}

export const ventureCard = (v: Venture): VentureCard => ({ slug: v.slug, name: v.name, logo: v.logoText || initials(v.name), logoUrl: v.logoUrl, loc: v.city });
