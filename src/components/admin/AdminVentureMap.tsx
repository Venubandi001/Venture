"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import { VentureProfile } from "@/lib/types";
import { useToast } from "../ToastProvider";

const STATUS_COLORS = {
  available: "#176b2c",
  hold: "#f0a51a",
  reserved: "#7b4fa0",
  sold: "#9b0000",
};

export default function AdminVentureMap({ profile }: { profile: VentureProfile }) {
  const showToast = useToast();
  const [mode, setMode] = useState<"satellite" | "layout">("satellite");

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const plotLayerRef = useRef<LayerGroup | null>(null);
  const layersRef = useRef<{ satellite: TileLayer; labels: TileLayer } | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leafletModule) => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      const L = leafletModule.default;

      const map = L.map(mapDivRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([17.462222, 78.154444], 16);

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

      const plotLayer = L.layerGroup().addTo(map);

      mapRef.current = map;
      plotLayerRef.current = plotLayer;
      layersRef.current = { satellite, labels };
      renderPlots(L, map, plotLayer, profile);
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
    const map = mapRef.current;
    const plotLayer = plotLayerRef.current;
    if (!map || !plotLayer) return;
    import("leaflet").then((leafletModule) => {
      renderPlots(leafletModule.default, map, plotLayer, profile);
    });
  }, [profile]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;
    if (mode === "satellite") {
      layers.satellite.setOpacity(1);
      layers.labels.setOpacity(0.72);
    } else {
      layers.satellite.setOpacity(0.18);
      layers.labels.setOpacity(1);
    }
  }, [mode]);

  function renderPlots(
    L: typeof import("leaflet"),
    map: LeafletMap,
    plotLayer: LayerGroup,
    p: VentureProfile
  ) {
    plotLayer.clearLayers();
    const rows = 7;
    const cols = 9;
    const [latSpan, lngSpan] = p.span;
    const bounds = L.latLngBounds(
      [p.center[0] - latSpan / 2, p.center[1] - lngSpan / 2],
      [p.center[0] + latSpan / 2, p.center[1] + lngSpan / 2]
    );
    map.fitBounds(bounds, { padding: [18, 18], maxZoom: 17 });

    const total = Math.min(63, Number(p.plots) || 63);
    const soldCut = Math.round(total * (p.sold / p.plots));
    const underCut = soldCut + Math.round(total * (p.under / p.plots));
    const holdCut = underCut + Math.round(total * (p.hold / p.plots));
    const dy = (bounds.getNorth() - bounds.getSouth()) / rows;
    const dx = (bounds.getEast() - bounds.getWest()) / cols;

    for (let i = 0; i < total; i++) {
      const rr = Math.floor(i / cols);
      const cc = i % cols;
      const status =
        i < soldCut
          ? "sold"
          : i < underCut
          ? "reserved"
          : i < holdCut
          ? "hold"
          : "available";
      const s = bounds.getSouth() + rr * dy + dy * 0.08;
      const n = bounds.getSouth() + (rr + 1) * dy - dy * 0.08;
      const w = bounds.getWest() + cc * dx + dx * 0.06;
      const e = bounds.getWest() + (cc + 1) * dx - dx * 0.06;
      const plotId = 101 + i;

      const poly = L.polygon(
        [
          [s, w],
          [n, w],
          [n, e],
          [s, e],
        ],
        {
          color: "#fff",
          weight: 1.3,
          fillColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
          fillOpacity: 0.62,
        }
      ).addTo(plotLayer);

      const label =
        status === "sold"
          ? "SOLD OUT"
          : status === "hold"
          ? "HOLD"
          : status === "reserved"
          ? "UNDER CONSTRUCTION"
          : "AVAILABLE";
      poly.bindTooltip(`<b>P-${plotId}</b> · ${label}`, { sticky: true });
      poly.on("click", () => showToast(`${p.brand} · Plot ${plotId} · ${label}`));
    }
  }

  return (
    <div className="card">
      <div className="mapbar">
        <b id="mapVentureTitle">{profile.brand} · Live inventory</b>
        <span>
          <b style={{ color: "#176b2c" }}>● Available</b>
          {"　"}
          <b style={{ color: "#f0a51a" }}>● Hold</b>
          {"　"}
          <b style={{ color: "#7b4fa0" }}>● Reserved / Under Construction</b>
          {"　"}
          <b style={{ color: "#9b0000" }}>● Sold Out</b>
        </span>
      </div>
      <div className="admin-map">
        <div id="adminRealMap" ref={mapDivRef} />
        <div className="admin-map-badge">LIVE GIS · SATELLITE INVENTORY</div>
        <div className="admin-map-tools">
          <button
            className={mode === "satellite" ? "active" : ""}
            onClick={() => setMode("satellite")}
          >
            Satellite
          </button>
          <button
            className={mode === "layout" ? "active" : ""}
            onClick={() => setMode("layout")}
          >
            Layout
          </button>
        </div>
      </div>
    </div>
  );
}
