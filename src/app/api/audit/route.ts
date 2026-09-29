import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { auditLog } = schema;
const SALES_ENTITIES = ["lead", "plot", "booking"]; // sales see sales activity, not account admin

/** Audit log / activity feed. ?entity=plot&id=my-fortune:45 for one item's history; ?before=<id> to page. */
export async function GET(req: Request) {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const conds = [];
  const entity = q.get("entity");
  if (entity) conds.push(eq(auditLog.entity, entity.slice(0, 20)));
  if (q.get("id")) conds.push(eq(auditLog.entityId, q.get("id")!.slice(0, 80)));
  const before = Number(q.get("before"));
  if (Number.isInteger(before) && before > 0) conds.push(lt(auditLog.id, before));
  if (u.role !== "admin") conds.push(inArray(auditLog.entity, SALES_ENTITIES));
  const limit = Math.min(Math.max(Number(q.get("limit")) || 100, 1), 500);
  const rows = await db().select().from(auditLog).where(conds.length ? and(...conds) : undefined).orderBy(desc(auditLog.id)).limit(limit);
  return Response.json(rows);
}
