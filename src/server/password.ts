// Password + token primitives (plain Node, no Next.js imports) — shared by the app and scripts/admin.mjs.
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

/** Constant-time check; pass `null` for unknown users so timing doesn't reveal which emails exist. */
export function checkPassword(pw: string, stored: string | null): boolean {
  const [salt, hash] = (stored ?? "00:" + "00".repeat(64)).split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, Buffer.from(salt, "hex"), 64);
  return a.length === b.length && timingSafeEqual(a, b) && stored !== null;
}

/** Readable one-time password, e.g. "Kpte-7Hq3-Wmxa" (no 0/O/1/l). */
export function tempPassword(): string {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz", D = "23456789";
  const part = () => Array.from({ length: 4 }, (_, i) => (i === 1 ? D : A)[randomInt(i === 1 ? D.length : A.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}
