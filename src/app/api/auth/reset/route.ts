import { clientIp, rateLimited, redeemResetToken } from "@/server/auth";
import { validPassword } from "@/server/validate";

export async function POST(req: Request) {
  if (await rateLimited(`reset:ip:${clientIp(req)}`, 20, 60 * 60e3))
    return Response.json({ error: "Too many attempts — try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
  const pw = validPassword(b.password);
  if (typeof pw !== "string") return Response.json(pw, { status: 400 });
  if (typeof b.token !== "string" || !(await redeemResetToken(b.token.slice(0, 200), pw)))
    return Response.json({ error: "This link is invalid or has expired — request a new one" }, { status: 400 });
  return Response.json({ ok: true });
}
