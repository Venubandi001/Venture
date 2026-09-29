import "server-only";
import type { User } from "@/shared/users";
import { db, schema } from "./db/index";

/**
 * Append one entry to the audit log. `user` null = a buyer on the public site.
 * Never throws: a logging hiccup must not fail the change it describes.
 */
export async function auditMany(
  user: Pick<User, "id" | "name"> | null, entries: { action: string; entity: string; entityId: string; summary: string; details?: unknown }[],
) {
  if (!entries.length) return;
  try {
    await db().insert(schema.auditLog).values(entries.map((e) => ({
      userId: user?.id ?? null, userName: user?.name ?? "Buyer (website)", action: e.action, entity: e.entity, entityId: e.entityId,
      summary: e.summary.slice(0, 500), details: e.details ?? null,
    })));
  } catch (e) {
    console.error("audit write failed:", (e as Error).message);
  }
}

export async function audit(
  user: Pick<User, "id" | "name"> | null, action: string, entity: string, entityId: string, summary: string, details?: unknown,
) {
  try {
    await db().insert(schema.auditLog).values({
      userId: user?.id ?? null, userName: user?.name ?? "Buyer (website)", action, entity, entityId, summary: summary.slice(0, 500),
      details: details ?? null,
    });
  } catch (e) {
    console.error("audit write failed:", (e as Error).message);
  }
}
