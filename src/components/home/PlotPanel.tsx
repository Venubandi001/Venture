"use client";

import { Plot, STATUS_LABEL } from "@/lib/types";
import { ApplicationType } from "./ApplicationModal";

export default function PlotPanel({
  plot,
  onAction,
}: {
  plot: Plot | null;
  onAction: (type: ApplicationType) => void;
}) {
  if (!plot) {
    return (
      <aside className="panel" id="plotPanel">
        <div className="empty">
          <b>Select a plot</b>
          <p>Explore the layout and click any plot to see its details.</p>
        </div>
      </aside>
    );
  }

  const [width, depth] = plot.dims.split("×").map((x) => x.trim());

  return (
    <aside className="panel" id="plotPanel">
      <div className="plot-panel-top">
        <div className="eyebrow">Selected plot</div>
        <span className="plot-live">LIVE INVENTORY</span>
      </div>
      <h3>P-{plot.id}</h3>
      <div className="price">₹{plot.price} Lakhs</div>
      <div className="dimension-card">
        <div className="dimension-visual">
          <div className="dimension-plot">
            <span className="dim-top">{width} FT</span>
            <span className="dim-side">{depth} FT</span>
            <div className="dim-corner" />
          </div>
        </div>
        <div className="dimension-caption">
          <b>Plot dimensions</b>
          <span>{plot.dims} FT</span>
        </div>
      </div>
      <div className="plot-detail-grid">
        <div className="plot-detail-row">
          <span>Size</span>
          <b>{plot.area} Sq.Yds</b>
        </div>
        <div className="plot-detail-row">
          <span>Status</span>
          <b className={`status-${plot.status}`}>{STATUS_LABEL[plot.status]}</b>
        </div>
        <div className="plot-detail-row">
          <span>Facing</span>
          <b>{plot.facing}</b>
        </div>
        {plot.road ? (
          <div className="plot-detail-row">
            <span>Road access</span>
            <b>{plot.road} FT</b>
          </div>
        ) : null}
      </div>
      <button className="btn wide" onClick={() => onAction("site")}>
        Request Site Visit
      </button>
      <button className="btn wide" onClick={() => onAction("booking")}>
        Start Booking Application
      </button>
      <button className="btn ghost wide" onClick={() => onAction("enquiry")}>
        Enquire About This Plot
      </button>
    </aside>
  );
}
