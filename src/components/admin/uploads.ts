"use client";

// File uploads for admin screens: sign → PUT straight to storage (see /api/uploads).
/** Get a one-time signed URL from our API, then send the file straight to storage. */
export async function upload(file: File): Promise<string> {
  const res = await fetch("/api/uploads", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: file.type, size: file.size }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Upload failed");
  const put = await fetch(j.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Upload to storage failed — please try again");
  return j.url;
}

/** Downscale in the browser (phone GPUs can't draw images wider than ~4096 px); optionally make the paper white transparent. */
export async function shrink(file: File, maxPx: number, clearWhite = false) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, maxPx / Math.max(img.width, img.height));
  if (s === 1 && !clearWhite) return { file, w: img.width, h: img.height };
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (clearWhite) {
    const px = ctx.getImageData(0, 0, c.width, c.height);
    const d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      const min = Math.min(d[i], d[i + 1], d[i + 2]);
      if (min > 238) d[i + 3] = 0; // paper
      else if (min > 215) d[i + 3] = Math.round(((238 - min) / 23) * 255); // soften anti-aliased edges
    }
    ctx.putImageData(px, 0, 0);
  }
  const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("Could not read image"))), "image/webp", 0.92));
  return { file: new File([blob], "image.webp", { type: "image/webp" }), w: c.width, h: c.height };
}

