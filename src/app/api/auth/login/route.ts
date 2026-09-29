import { clientIp, rateLimited, startSession, verifyLogin } from "@/server/auth";
import { cleanEmail } from "@/server/validate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = cleanEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const [byIp, byEmail] = await Promise.all([
    rateLimited(`login:ip:${clientIp(req)}`, 20, 15 * 60e3),
    rateLimited(`login:email:${email}`, 8, 15 * 60e3),
  ]);
  if (byIp || byEmail) return Response.json({ error: "Too many attempts — try again in 15 minutes" }, { status: 429 });
  const user = await verifyLogin(email, password);
  if (!user) return Response.json({ error: "Wrong email or password" }, { status: 401 });
  await startSession(user.id);
  return Response.json({ ok: true, mustChangePassword: user.mustChangePassword });
}
