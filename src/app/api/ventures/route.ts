import { currentUser, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { getVenture, listPublicVentures, listVentures, parseVentureInput, saveVenture } from "@/server/ventures";

// Staff get every venture; buyers only live / coming-soon ones.
export async function GET() {
  const u = await currentUser();
  return Response.json(u && !u.mustChangePassword ? await listVentures() : await listPublicVentures());
}

export async function POST(req: Request) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const v = parseVentureInput(await req.json().catch(() => null), null);
  if ("error" in v) return Response.json(v, { status: 400 });
  if (await getVenture(v.slug)) return Response.json({ error: `A venture with the web address “${v.slug}” already exists — use a different name` }, { status: 409 });
  await saveVenture(v, true);
  await audit(u, "venture.create", "venture", v.slug, `Created venture ${v.name}`);
  return Response.json({ ok: true, slug: v.slug });
}
