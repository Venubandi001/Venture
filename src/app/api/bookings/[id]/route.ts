import { requireUser } from "@/server/auth";
import { advanceBooking } from "@/server/bookings";
import { BOOKING_STATUSES, BookingStatus } from "@/shared/bookings";

export async function PATCH(req: Request, ctx: RouteContext<"/api/bookings/[id]">) {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const id = Number((await ctx.params).id);
  const b = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (!Number.isInteger(id) || !BOOKING_STATUSES.includes(b.status as BookingStatus)) return Response.json({ error: "Send { status }" }, { status: 400 });
  const r = await advanceBooking(u, id, b.status as BookingStatus);
  return "error" in r ? Response.json({ error: r.error }, { status: r.status }) : Response.json({ ok: true });
}
