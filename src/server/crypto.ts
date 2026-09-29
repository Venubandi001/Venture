import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Field-level encryption for sensitive values (PAN). AES-256-GCM; key = DATA_ENCRYPTION_KEY (32 bytes, base64).
// Stored format: "v1:<iv>:<tag>:<ciphertext>" (base64 parts).
function key(): Buffer {
  const k = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (base64) — see .env.example");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(stored: string): string {
  const [v, iv, tag, data] = stored.split(":");
  if (v !== "v1") throw new Error("unknown ciphertext version");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
