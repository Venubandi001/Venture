import { UPLOAD_NAME } from "@/shared/layout";
import { publicUrl } from "@/server/storage";

// Stable links for everything stored in layouts (/api/uploads/<uuid>.ext) → the file in Supabase Storage (CDN).
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  if (!UPLOAD_NAME.test(file)) return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 308,
    headers: { Location: publicUrl(file), "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
