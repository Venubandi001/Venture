import "server-only";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Role, User } from "@/shared/users";
import { db, schema } from "./db/index";
import { checkPassword, hashPassword, newToken, sha256 } from "./password";

export type { Role, User };

const COOKIE = "vt_session";
const SESSION_DAYS = 7;
const RESET_MINUTES = 30;
const { users, sessions, passwordResets, authAttempts } = schema;
const userCols = { id: users.id, email: users.email, name: users.name, role: users.role, mustChangePassword: users.mustChangePassword };

// ---------- accounts ----------
export async function createUser(email: string, name: string, role: Role, password: string, mustChangePassword = true): Promise<number> {
  const [row] = await db().insert(users)
    .values({ email: email.trim().toLowerCase(), name: name.trim(), role, passHash: hashPassword(password), mustChangePassword })
    .returning({ id: users.id });
  return row.id;
}

export async function hasUsers() {
  return (await db().select({ id: users.id }).from(users).limit(1)).length > 0;
}

/** Wrong email, wrong password and deactivated account all look identical to the caller. */
export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const [row] = await db().select({ ...userCols, passHash: users.passHash, active: users.active })
    .from(users).where(eq(users.email, email.trim().toLowerCase()));
  const ok = checkPassword(password, row?.passHash ?? null);
  if (!row || !ok || !row.active) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, mustChangePassword: row.mustChangePassword };
}

export async function passwordMatches(userId: number, password: string) {
  const [row] = await db().select({ passHash: users.passHash }).from(users).where(eq(users.id, userId));
  return checkPassword(password, row?.passHash ?? null);
}

/** New password; signs the user out everywhere (all sessions deleted). */
export async function setPassword(userId: number, password: string, mustChangePassword = false) {
  await db().update(users).set({ passHash: hashPassword(password), mustChangePassword, passwordChangedAt: new Date() }).where(eq(users.id, userId));
  await db().delete(sessions).where(eq(sessions.userId, userId));
  await db().delete(passwordResets).where(eq(passwordResets.userId, userId));
}

export async function countActiveAdmins() {
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "admin"), eq(users.active, true)));
  return r.n;
}

// ---------- sessions ----------
export async function startSession(userId: number) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db().delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db().insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt: expires });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

/** Signed-in, active user — or null. Deactivating a user ends their access on the next request. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db().select(userCols).from(sessions).innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)));
  return row ?? null;
}

/**
 * For route handlers: the signed-in user with one of `roles`, or a 401/403 Response to return.
 * Users who must change their password can't do anything else until they have.
 */
export async function requireUser(roles: Role[] = ["admin", "sales"], opts: { allowMustChange?: boolean } = {}): Promise<User | Response> {
  const u = await currentUser();
  if (!u) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (u.mustChangePassword && !opts.allowMustChange) return Response.json({ error: "Please set a new password first" }, { status: 403 });
  if (!roles.includes(u.role)) return Response.json({ error: "Not allowed for your role" }, { status: 403 });
  return u;
}

// ---------- forgot password ----------
/** Token for an active account's reset link, or null (unknown/inactive emails get the same response upstream). */
export async function createResetToken(email: string): Promise<{ token: string; user: { id: number; name: string; email: string } } | null> {
  const [u] = await db().select({ id: users.id, name: users.name, email: users.email }).from(users)
    .where(and(eq(users.email, email.trim().toLowerCase()), eq(users.active, true)));
  if (!u) return null;
  const token = newToken();
  await db().delete(passwordResets).where(eq(passwordResets.userId, u.id)); // only the newest link works
  await db().insert(passwordResets).values({ tokenHash: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60e3) });
  return { token, user: u };
}

/** Uses a reset link once. Returns false when it's unknown, used, expired, or the account was deactivated. */
export async function redeemResetToken(token: string, newPassword: string): Promise<boolean> {
  const [r] = await db().update(passwordResets).set({ usedAt: new Date() })
    .where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .returning({ userId: passwordResets.userId }); // atomic: two clicks can't both succeed
  if (!r) return false;
  const [u] = await db().select({ active: users.active }).from(users).where(eq(users.id, r.userId));
  if (!u?.active) return false;
  await setPassword(r.userId, newPassword);
  return true;
}

// ---------- rate limiting (shared by all server instances) ----------
/** Records an attempt for `key`; true when there have been more than `max` in the last `windowMs`. */
export async function rateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  await db().insert(authAttempts).values({ key });
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.at, new Date(Date.now() - windowMs))));
  if (Math.random() < 0.02) await db().delete(authAttempts).where(lt(authAttempts.at, new Date(Date.now() - 864e5))); // prune old rows
  return r.n > max;
}

export function clientIp(req: Request) {
  // Vercel sets x-forwarded-for; the first entry is the client
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
