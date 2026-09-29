"use client";

import { useEffect, useState } from "react";
import type { VentureLayout } from "@/shared/layout";
import { ventureCard } from "@/shared/ventures";
import PlotViewer from "../viewer/PlotViewer";
import { useVentures } from "./VenturesContext";

/** The customer plot map, embedded in the admin portal (status on, plot status editable). */
export default function AdminLayoutMap({ slug, onOpenLayouts }: { slug: string; onOpenLayouts?: () => void }) {
  const { bySlug } = useVentures();
  const venture = bySlug(slug);
  const [layout, setLayout] = useState<VentureLayout | null>(null);

  useEffect(() => {
    let stale = false;
    fetch(`/api/layouts/${slug}`).then((r) => r.json()).then((l) => !stale && setLayout(l));
    return () => { stale = true; };
  }, [slug]);

  if (!venture) return <div className="card admin-map-empty">Pick a venture.</div>;
  if (!layout) return <div className="card admin-map-empty">Loading layout…</div>;
  if (!layout.overlay)
    return (
      <div className="card admin-map-empty">
        <b>No layout published for {venture.name} yet.</b>
        {onOpenLayouts ? <button className="btn" onClick={onOpenLayouts}>Upload it in Layouts &amp; GIS</button> : null}
      </div>
    );
  return (
    <div className="admin-plot-map">
      <PlotViewer key={slug} venture={{ ...ventureCard(venture), center: [venture.lat, venture.lng] }} layout={layout} others={[]} embedded initialStatus admin />
    </div>
  );
}
