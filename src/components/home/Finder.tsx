"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SIZES = [
  { label: "Any size", min: "", max: "" },
  { label: "Up to 250 Sq.Yds", min: "", max: "250" },
  { label: "250 – 450 Sq.Yds", min: "250", max: "450" },
  { label: "450+ Sq.Yds", min: "450", max: "" },
];
const BUDGETS = [
  { label: "Any budget", v: "" },
  { label: "Up to ₹40 L", v: "40" },
  { label: "Up to ₹60 L", v: "60" },
  { label: "Up to ₹1 Cr", v: "100" },
];

export default function Finder({ slug, priced, facings }: { slug: string; priced: boolean; facings: string[] }) {
  const router = useRouter();
  const [size, setSize] = useState(0);
  const [facing, setFacing] = useState("");
  const [budget, setBudget] = useState("");

  function find() {
    const q = new URLSearchParams({ find: "1" }); // opens the Find panel even with no filters chosen
    if (SIZES[size].min) q.set("min", SIZES[size].min);
    if (SIZES[size].max) q.set("max", SIZES[size].max);
    if (facing) q.set("facing", facing);
    if (budget) q.set("budget", budget);
    router.push(`/explore/${slug}?${q}`);
  }

  return (
    <section className="section" id="finder">
      <div className="finder">
        <div className="eyebrow">02 / Discover</div>
        <h2>Find your plot.</h2>
        <p>Tell us what matters. We’ll highlight the available plots that match on the live map.</p>
        <div className="filters">
          <label>
            Plot size
            <select value={size} onChange={(e) => setSize(+e.target.value)}>
              {SIZES.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
            </select>
          </label>
          <label>
            Facing
            <select value={facing} onChange={(e) => setFacing(e.target.value)}>
              <option value="">Any facing</option>
              {facings.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          {priced ? (
            <label>
              Budget
              <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                {BUDGETS.map((b) => <option key={b.label} value={b.v}>{b.label}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <button className="btn" onClick={find}>Find matching plots →</button>
      </div>
    </section>
  );
}
