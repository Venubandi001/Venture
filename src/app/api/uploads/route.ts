import { randomUUID } from "node:crypto";
import { requireUser } from "@/server/auth";
import { MAX_BYTES, signedUploadUrl, UPLOAD_TYPES } from "@/server/storage";

// Admin asks to upload { type, size } → gets a one-time signed URL; the browser PUTs the file straight to storage
// (Vercel limits request bodies to ~4.5 MB, so files never pass through this server).
export async function POST(req: Request) {
  const u = await requireUser(["admin"]);
  if (u instanceof Response) return u;
  const b = (await req.json().catch(() => ({}))) as { type?: unknown; size?: unknown };
  const ext = UPLOAD_TYPES[String(b.type)];
  if (!ext) return Response.json({ error: "Only PNG, JPG, WebP or PDF" }, { status: 415 });
  if (typeof b.size !== "number" || b.size <= 0 || b.size > MAX_BYTES) return Response.json({ error: "File larger than 25 MB" }, { status: 413 });

  const name = `${randomUUID()}.${ext}`; // server-chosen name: nothing from the client reaches the path
  return Response.json({ uploadUrl: await signedUploadUrl(name), url: `/api/uploads/${name}` });
}
