"use client";

import { VentureLayout } from "@/shared/layout";
import type { VentureCard } from "@/shared/ventures";
import PlotViewer from "../viewer/PlotViewer";

export default function ExploreSection({
  featured,
}: {
  featured: { venture: VentureCard & { center: [number, number] }; layout: VentureLayout } | null;
}) {
  return (
    <section className="section" id="explore">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">01 / Explore</div>
          <h2>Explore every plot.</h2>
        </div>
        <p>Click a plot to reveal dimensions, facing, area, price and live availability.</p>
      </div>

      {featured ? (
        <PlotViewer venture={featured.venture} layout={featured.layout} others={[]} embedded initialStatus />
      ) : (
        <div className="explore-soon">
          <b>Interactive layouts are coming soon.</b>
          <span>Our team is publishing the plot maps — check back shortly.</span>
        </div>
      )}
    </section>
  );
}
