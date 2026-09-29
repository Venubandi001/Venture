import { readFile } from "node:fs/promises";
import path from "node:path";

// MapLibre resolves its web worker next to its own bundle, which doesn't survive Next's bundling.
// Serve the worker (and the chunk it imports) straight from the installed package so versions always match.
const FILES = new Set(["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]);

export async function GET(_req: Request, ctx: RouteContext<"/api/maplibre/[file]">) {
  const { file } = await ctx.params;
  if (!FILES.has(file)) return new Response("Not found", { status: 404 });
  const body = await readFile(path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", file));
  return new Response(body, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
