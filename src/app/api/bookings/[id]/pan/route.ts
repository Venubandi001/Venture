import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { decrypt } from "@/server/crypto";
import { db, schema } from "@/server/db";

/** Admin only: reveal the full PAN for KYC. Every reveal is written to the audit log. */
export async function GET(_req: Request, ctx: RouteContext<"/api/bookings/[id]/pan">) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const id = Number((await ctx.params).id);
  const [b] = Number.isInteger(id) ? await db().select({ panEnc: schema.bookingApplications.panEnc, name: schema.bookingApplications.applicantName })
    .from(schema.bookingApplications).where(eq(schema.bookingApplications.id, id)) : [];
  if (!b?.panEnc) return Response.json({ error: "No PAN on this application" }, { status: 404 });
  await audit(u, "booking.reveal_pan", "booking", String(id), `Viewed PAN of ${b.name} (application #${id})`);
  return Response.json({ pan: decrypt(b.panEnc) }, { headers: { "Cache-Control": "no-store" } });
}
