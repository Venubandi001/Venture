import { requireUser } from "@/server/auth";
import { createBooking, listBookings, parseBooking } from "@/server/bookings";

export async function GET() {
  const u = await requireUser();
  if (u instanceof Response) return u;
  return Response.json(await listBookings()); // never includes the encrypted PAN
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (u instanceof Response) return u;
  const v = parseBooking(await req.json().catch(() => null));
  if ("error" in v) return Response.json(v, { status: 400 });
  const r = await createBooking(u, v);
  return "error" in r ? Response.json({ error: r.error }, { status: r.status }) : Response.json({ ok: true, id: r.id });
}
