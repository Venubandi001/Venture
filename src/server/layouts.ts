import "server-only";
import { eq } from "drizzle-orm";
import { emptyLayout, parseLayout, VentureLayout } from "@/shared/layout";
import { isPublicVenture } from "@/shared/ventures";
import { currentUser } from "./auth";
import { db, schema } from "./db/index";
import { getVenture, listPublicVentures } from "./ventures";

const { layouts } = schema;

/** The layout for a venture (empty if none saved yet), or null if the venture doesn't exist. */
export async function getLayout(slug: string): Promise<VentureLayout | null> {
  if (!(await getVenture(slug))) return null;
  const [row] = await db().select().from(layouts).where(eq(layouts.slug, slug));
  if (!row) return emptyLayout(slug);
  const l = parseLayout(slug, row.json);
  return l ? { ...l, updatedAt: row.updatedAt.toISOString() } : emptyLayout(slug);
}

/** Same, but hides draft/archived ventures from anyone who isn't signed-in staff. */
export async function getVisibleLayout(slug: string): Promise<VentureLayout | null> {
  const v = await getVenture(slug);
  if (!v) return null;
  if (!isPublicVenture(v) && !(await currentUser())) return null;
  return getLayout(slug);
}

export async function saveLayout(layout: VentureLayout): Promise<string> {
  const at = new Date();
  const json = { ...layout, updatedAt: undefined };
  await db().insert(layouts).values({ slug: layout.slug, json, updatedAt: at })
    .onConflictDoUpdate({ target: layouts.slug, set: { json, updatedAt: at } });
  return at.toISOString();
}

/** First live venture whose layout has been published (an overlay uploaded) — shown on the home page. */
export async function featuredSlug(): Promise<string | null> {
  for (const v of await listPublicVentures()) {
    if (v.status !== "live") continue;
    const l = await getLayout(v.slug);
    if (l?.overlay) return l.slug;
  }
  return null;
}
