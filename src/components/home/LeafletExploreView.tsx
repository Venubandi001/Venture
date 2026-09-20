"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Polygon, TileLayer } from "leaflet";
import { HOME_PLOTS } from "@/lib/plots";
import { Plot, STATUS_COLOR, STATUS_TAG } from "@/lib/types";

export default function LeafletExploreView({
  variant,
  selectedPlot,
  onSelectPlot,
}: {
  variant: "satellite" | "layout";
  selectedPlot: Plot | null;
  onSelectPlot: (plot: Plot) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ satellite: TileLayer; labels: TileLayer } | null>(null);
  const onSelectRef = useRef(onSelectPlot);
  onSelectRef.current = onSelectPlot;

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leafletModule) => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      const L = leafletModule.default;

      const center: [number, number] = [17.462222, 78.154444];
      const map = L.map(mapDivRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 16);

      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        }
      ).addTo(map);

      const labels = L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.72 }
      ).addTo(map);

      const bounds = L.latLngBounds([17.45975, 78.1512], [17.4647, 78.1576]);
      const rows = 7;
      const cols = 9;
      const dy = (bounds.getNorth() - bounds.getSouth()) / rows;
      const dx = (bounds.getEast() - bounds.getWest()) / cols;

      HOME_PLOTS.forEach((plot, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const south = bounds.getSouth() + r * dy + dy * 0.08;
        const north = bounds.getSouth() + (r + 1) * dy - dy * 0.08;
        const west = bounds.getWest() + c * dx + dx * 0.06;
        const east = bounds.getWest() + (c + 1) * dx - dx * 0.06;

        const poly: Polygon = L.polygon(
          [
            [south, west],
            [north, west],
            [north, east],
            [south, east],
          ],
          {
            color: "#fff",
            weight: 1.5,
            fillColor: STATUS_COLOR[plot.status],
            fillOpacity: 0.4,
          }
        ).addTo(map);

        poly.bindTooltip(`<b>P-${plot.id}</b><br>${STATUS_TAG[plot.status]}`, {
          sticky: true,
        });
        poly.on("click", () => {
          onSelectRef.current(plot);
          poly.setStyle({ weight: 3, fillOpacity: 0.65 });
          setTimeout(() => poly.setStyle({ weight: 1.5, fillOpacity: 0.4 }), 800);
        });
      });

      mapRef.current = map;
      layersRef.current = { satellite, labels };
      setTimeout(() => map.invalidateSize(), 300);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;
    if (variant === "satellite") {
      layers.satellite.setOpacity(1);
      layers.labels.setOpacity(0.72);
    } else {
      layers.satellite.setOpacity(0.18);
      layers.labels.setOpacity(1);
    }
  }, [variant]);

  return (
    <div className={`layout ${variant === "satellite" ? "satellite" : "layoutmode"}`} id="ventureMap">
      <div id="realMap" ref={mapDivRef} />
      <div className="map-status">LIVE SATELLITE · DRAG / ZOOM · GIS OVERLAY</div>
      <div className="satellite-shade" />
      <div className="road r1" />
      <div className="road r2" />
      <div className="road r3" />
      <div className="park">Central Park</div>
      <div className="club">Clubhouse</div>
      <div className="plots">
        {HOME_PLOTS.map((plot) => (
          <button
            key={plot.id}
            className={`plot ${plot.status} ${selectedPlot?.id === plot.id ? "selected" : ""}`}
            onClick={() => onSelectPlot(plot)}
          >
            {plot.id}
            <span>{STATUS_TAG[plot.status]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
