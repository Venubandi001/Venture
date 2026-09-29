import { asc } from "drizzle-orm";
import { createUser, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { tempPassword } from "@/server/password";
import { cleanEmail } from "@/server/validate";

const { users } = schema;

export async function GET() {
  const u = await requireUser(["admin", "sales"]); // sales needs the list to see lead owners
  if (u instanceof Response) return u;
  const rows = await db()
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active,
      mustChangePassword: users.mustChangePassword, created_at: users.createdAt })
    .from(users).orderBy(asc(users.id));
  return Response.json(u.role === "admin" ? rows : rows.filter((r) => r.active).map(({ id, name }) => ({ id, name })));
}

/** Admin adds a team member; we generate a one-time password they must change at first sign-in. */
export async function POST(req: Request) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = cleanEmail(b.email), name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  if (name.length < 2) return Response.json({ error: "Enter a name" }, { status: 400 });
  const role = b.role === "admin" ? "admin" : "sales";
  const password = tempPassword();
  try {
    const id = await createUser(email, name, role, password, true);
    await audit(u, "user.create", "user", String(id), `Added ${name} (${email}) as ${role}`);
    return Response.json({ id, tempPassword: password });
  } catch {
    return Response.json({ error: "A user with that email already exists" }, { status: 409 });
  }
}
