"use client";

import { useState } from "react";
import { Plot } from "@/lib/types";
import PlotPanel from "./PlotPanel";
import ApplicationModal, { ApplicationType } from "./ApplicationModal";
import LeafletExploreView from "./LeafletExploreView";

type MapMode = "satellite" | "layout";

const MODES: { key: MapMode; label: string }[] = [
  { key: "satellite", label: "Satellite" },
  { key: "layout", label: "Layout" },
];

export default function ExploreSection() {
  const [mapMode, setMapMode] = useState<MapMode>("satellite");
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [modalType, setModalType] = useState<ApplicationType | null>(null);

  return (
    <section className="section" id="explore">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">01 / Explore</div>
          <h2>Explore every plot.</h2>
        </div>
        <p>Click a plot to reveal dimensions, facing, road width, price and availability.</p>
      </div>

      <div className="mapbox">
        <div className="mapbar">
          <span>
            <b style={{ color: "#176b2c" }}>● Available</b>
            {"　"}
            <b style={{ color: "#f0a51a" }}>● Hold</b>
            {"　"}
            <b style={{ color: "#7b4fa0" }}>● Reserved / Under Construction</b>
            {"　"}
            <b style={{ color: "#9b0000" }}>● Sold Out</b>
          </span>
          <div className="maptools">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`maptoggle ${mapMode === m.key ? "active" : ""}`}
                onClick={() => setMapMode(m.key)}
              >
                {m.label}
              </button>
            ))}
            <b>Green Valley · Master Layout</b>
          </div>
        </div>
        <div className="maprow">
          <LeafletExploreView
            variant={mapMode}
            selectedPlot={selectedPlot}
            onSelectPlot={setSelectedPlot}
          />
          <PlotPanel plot={selectedPlot} onAction={(type) => setModalType(type)} />
        </div>
      </div>

      {modalType ? (
        <ApplicationModal type={modalType} onClose={() => setModalType(null)} />
      ) : null}
    </section>
  );
}
