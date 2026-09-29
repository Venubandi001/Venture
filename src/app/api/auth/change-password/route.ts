import { passwordMatches, requireUser, setPassword, startSession } from "@/server/auth";
import { audit } from "@/server/audit";
import { validPassword } from "@/server/validate";

// Signed-in user changes their own password (also the forced step after a reset / first login).
export async function POST(req: Request) {
  const u = await requireUser(["admin", "sales"], { allowMustChange: true });
  if (u instanceof Response) return u;
  const b = (await req.json().catch(() => ({}))) as { current?: unknown; next?: unknown };
  if (typeof b.current !== "string" || !(await passwordMatches(u.id, b.current)))
    return Response.json({ error: "Current password is wrong" }, { status: 400 });
  const pw = validPassword(b.next);
  if (typeof pw !== "string") return Response.json(pw, { status: 400 });
  if (pw === b.current) return Response.json({ error: "Choose a different password" }, { status: 400 });
  await setPassword(u.id, pw); // signs out every device…
  await startSession(u.id); // …then keeps this one signed in
  await audit(u, "user.password", "user", String(u.id), `${u.name} changed their password`);
  return Response.json({ ok: true });
}
