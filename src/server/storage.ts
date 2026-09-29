// Supabase Storage via its REST API (no SDK needed for these three calls).
// Files live in one public bucket; names are server-chosen UUIDs, so URLs are unguessable and immutable.
export const BUCKET = "media";
export const MAX_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const base = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;
function headers(): Record<string, string> {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set — add it to .env.local");
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` }; // new vs legacy keys
}

export const publicUrl = (name: string) => `${base()}/object/public/${BUCKET}/${name}`;

/** One-time URL the browser PUTs the file to (valid ~2 hours, single object). */
export async function signedUploadUrl(name: string): Promise<string> {
  const r = await fetch(`${base()}/object/upload/sign/${BUCKET}/${name}`, { method: "POST", headers: headers() });
  if (!r.ok) throw new Error(`storage sign failed: ${r.status} ${await r.text()}`);
  return `${base()}${(await r.json()).url}`;
}

/** Server-side upload (migration/seed scripts). */
export async function putObject(name: string, body: Buffer, contentType: string) {
  const r = await fetch(`${base()}/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
    body: new Uint8Array(body),
  });
  if (!r.ok) throw new Error(`storage upload failed: ${r.status} ${await r.text()}`);
}

/** Create the bucket once (public read; size + type limits enforced by Supabase itself). */
export async function ensureBucket() {
  const r = await fetch(`${base()}/bucket`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: MAX_BYTES, allowed_mime_types: Object.keys(UPLOAD_TYPES) }),
  });
  if (!r.ok && !(await r.text()).includes("already exists")) throw new Error(`bucket create failed: ${r.status}`);
}
