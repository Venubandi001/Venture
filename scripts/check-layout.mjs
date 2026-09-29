// Run: node --experimental-strip-types scripts/check-layout.mjs
import assert from "node:assert/strict";
import { uvToLngLat, lngLatToUv, edgeLengths, areaM2, subdivideBlock, parseLayout, emptyLayout } from "../src/shared/layout.ts";

const o = { url: "/api/uploads/x.png", pxWidth: 2000, pxHeight: 1000, center: [78.15, 17.46], rotation: 37, widthMeters: 400, opacity: 1 };
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// uv -> lng/lat -> uv round-trips under rotation
for (const uv of [[0, 0], [0.3, 0.8], [1, 1]]) {
  const back = lngLatToUv(o, uvToLngLat(o, uv));
  close(back[0], uv[0]); close(back[1], uv[1]);
}
// centre maps to centre; 90° rotation turns image-north into east
assert.deepEqual(uvToLngLat(o, [0.5, 0.5]), o.center);
const r90 = { ...o, rotation: 90 };
const top = uvToLngLat(r90, [0.5, 0]);
assert.ok(top[0] > o.center[0] && Math.abs(top[1] - o.center[1]) < 1e-9, "rotation should be clockwise");

// a 0.1 × 0.2 uv rectangle on a 400 m × 200 m image is 40 m × 40 m
const sq = [[0.1, 0.1], [0.2, 0.1], [0.2, 0.3], [0.1, 0.3]];
edgeLengths(o, sq).forEach((l) => close(l, 40));
close(areaM2(o, sq), 1600);

// block subdivision: 2 rows × 3 cols, cells tile the block exactly
const cells = subdivideBlock([[0, 0], [0.3, 0], [0.3, 0.2], [0, 0.2]], 2, 3);
assert.equal(cells.length, 6);
close(cells.reduce((s, c) => s + areaM2(o, c), 0), areaM2(o, [[0, 0], [0.3, 0], [0.3, 0.2], [0, 0.2]]));

// validation: accepts a real layout, rejects foreign URLs and bad statuses
const good = { ...emptyLayout("g"), overlay: { ...o, url: "/api/uploads/0f8e4c1a-1111-4a2b-9c3d-123456789abc.webp" },
  plots: [{ id: "a", number: "1", points: sq, status: "available" }], whatsapp: "919876543210" };
assert.ok(parseLayout("g", good));
assert.equal(parseLayout("g", { ...good, brochure: "javascript:alert(1)" }), null);
assert.equal(parseLayout("g", { ...good, overlay: { ...good.overlay, url: "https://evil.example/x.png" } }), null);
assert.equal(parseLayout("g", { ...good, plots: [{ ...good.plots[0], status: "gone" }] }), null);
// older saves used "reserved" — read back as "Booking Confirmed"
assert.equal(parseLayout("g", { ...good, plots: [{ ...good.plots[0], status: "reserved" }] }).plots[0].status, "confirmed");
console.log("layout checks passed");
