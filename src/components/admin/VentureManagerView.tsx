"use client";

import { useEffect, useState } from "react";
import { DimensionRow, VentureProfile } from "@/lib/types";
import { DEFAULT_DIMENSIONS, VENTURE_PROFILES } from "@/lib/ventures";
import DimensionRowsEditor from "./DimensionRowsEditor";
import { useToast } from "../ToastProvider";

const SAMPLE_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
    label: "Landscape / location",
  },
  {
    src: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
    label: "Land / aerial",
  },
  {
    src: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
    label: "Future home / lifestyle",
  },
];

const AMENITIES = [
  { label: "Grand entrance", checked: true },
  { label: "Central park", checked: true },
  { label: "Clubhouse", checked: true },
  { label: "Swimming pool", checked: false },
  { label: "Children's play area", checked: false },
  { label: "Walking track", checked: false },
  { label: "Security / CCTV", checked: false },
  { label: "Street lighting", checked: false },
];

const CHECKLIST: { label: string; done: boolean }[] = [
  { label: "Basic information", done: true },
  { label: "Complete address", done: true },
  { label: "Satellite location", done: true },
  { label: "Master layout", done: false },
  { label: "Plot dimensions", done: true },
  { label: "Plot inventory", done: true },
  { label: "Documents / approvals", done: false },
  { label: "Gallery & media", done: true },
];

function previewImageUrl(p: VentureProfile) {
  const [lat, lng] = p.center;
  const [latSpan, lngSpan] = p.span;
  const bbox = [
    lng - lngSpan / 2,
    lat - latSpan / 2,
    lng + lngSpan / 2,
    lat + latSpan / 2,
  ].join("%2C");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=900%2C500&imageSR=4326&format=jpg&f=image`;
}

export default function VentureManagerView({
  activeKey,
  onSelectVenture,
}: {
  activeKey: string;
  onSelectVenture: (key: string) => void;
}) {
  const showToast = useToast();
  const profile = VENTURE_PROFILES[activeKey];

  const [ventureName, setVentureName] = useState(profile.brand);
  const [ventureLocation, setVentureLocation] = useState(profile.loc);
  const [ventureLocality, setVentureLocality] = useState(profile.locality);
  const [ventureAddress, setVentureAddress] = useState(profile.address);
  const [ventureAcres, setVentureAcres] = useState(profile.acres);
  const [venturePlots, setVenturePlots] = useState(String(profile.plots));
  const [brandName, setBrandName] = useState(profile.brand);
  const [brandTagline, setBrandTagline] = useState(profile.tag);
  const [dimensionRows, setDimensionRows] =
    useState<DimensionRow[]>(DEFAULT_DIMENSIONS);

  useEffect(() => {
    setVentureName(profile.brand);
    setVentureLocation(profile.loc);
    setVentureLocality(profile.locality);
    setVentureAddress(profile.address);
    setVentureAcres(profile.acres);
    setVenturePlots(String(profile.plots));
    setBrandName(profile.brand);
    setBrandTagline(profile.tag);
  }, [profile]);

  const firstDim = dimensionRows[0];
  const brandInitials = profile.logo;

  return (
    <section>
      <div className="eyebrow">Portfolio / Venture manager</div>
      <h1>Venture management</h1>
      <p style={{ color: "#7b867f" }}>
        Select a venture below. Its brand, location, plot inventory, status
        counts and GIS view update together.
      </p>

      <div className="card venture-selector-card">
        <div className="cardhead">
          <b>Select venture</b>
          <span>Switch the complete venture workspace</span>
        </div>
        <div className="venture-select-row">
          <div className="field">
            <label>Active venture</label>
            <select
              value={activeKey}
              onChange={(e) => onSelectVenture(e.target.value)}
            >
              {Object.keys(VENTURE_PROFILES).map((key) => (
                <option key={key}>{key}</option>
              ))}
            </select>
          </div>
          <div className="venture-live-summary">
            <span>
              <b>{profile.status}</b>
            </span>
            <span>{profile.loc}</span>
            <span>{profile.plots} plots</span>
            <span>
              {profile.available} available · {profile.sold} sold
            </span>
          </div>
        </div>
      </div>

      <div className="venture-form-hero">
        <div className="venture-brand-side">
          <div className="venture-logo-box">
            <div className="venture-logo-symbol">{brandInitials}</div>
          </div>
          <div>
            <div className="venture-brand-name">{brandName.toUpperCase()}</div>
            <div className="venture-brand-tag">{brandTagline}</div>
            <div className="venture-address">{ventureAddress}</div>
            <div className="venture-location">
              📍 <span>{ventureLocation}</span>
            </div>
          </div>
        </div>
        <div className="venture-plot-side">
          {/* <div className="plot-head-label">DEFAULT PLOT CONFIGURATION</div> */}
          <div className="plot-summary-grid">
            <div>
              <small>Total Plots</small>
              <strong>{firstDim?.area || "—"}</strong>
              {/* <span>Sq.Yds</span> */}
            </div>
            {/* <div>
              <small>Dimensions</small>
              <strong>{firstDim?.dims || "—"}</strong>
              <span>FT</span>
            </div> */}
            {/* <div>
              <small>Facing</small>
              <strong>{firstDim?.facing || "—"}</strong>
              <span>Facing</span>
            </div> */}
            {/* <div>
              <small>Road</small>
              <strong>{firstDim?.road || "—"}</strong>
              <span>FT</span>
            </div> */}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardhead">
          <b>Create / edit venture</b>
          <span>Changes are venture-specific</span>
        </div>
        <div className="formgrid">
          <div className="field">
            <label>Venture name *</label>
            <input
              value={ventureName}
              onChange={(e) => setVentureName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Status *</label>
            <select defaultValue="Live">
              <option>Live</option>
              <option>Coming Soon</option>
              <option>Draft</option>
              <option>Archived</option>
            </select>
          </div>
          <div className="field">
            <label>City / State *</label>
            <input
              value={ventureLocation}
              onChange={(e) => setVentureLocation(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Locality / Landmark</label>
            <input
              value={ventureLocality}
              onChange={(e) => setVentureLocality(e.target.value)}
            />
          </div>
          <div className="field full">
            <label>Full venture address *</label>
            <textarea
              value={ventureAddress}
              onChange={(e) => setVentureAddress(e.target.value)}
              placeholder="Survey number, road, village, mandal, district, state, PIN"
            />
          </div>
          <div className="field">
            <label>PIN code</label>
            <input defaultValue="500001" />
          </div>
          <div className="field">
            <label>Google Maps / coordinates</label>
            <input placeholder="Paste Google Maps URL or latitude, longitude" />
          </div>
          <div className="field">
            <label>Total acres *</label>
            <input
              value={ventureAcres}
              onChange={(e) => setVentureAcres(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Total plots *</label>
            <input
              value={venturePlots}
              onChange={(e) => setVenturePlots(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Starting price</label>
            <input defaultValue="₹32 Lakhs" />
          </div>
          <div className="field">
            <label>Road network</label>
            <input defaultValue="30–60 FT" />
          </div>
          <div className="field">
            <label>RERA / approval number</label>
            <input placeholder="Approval reference" />
          </div>
          <div className="field">
            <label>Approval status</label>
            <select>
              <option>Approved</option>
              <option>Under verification</option>
              <option>Pending</option>
            </select>
          </div>
          <div className="field full">
            <label>Brand identity / venture logo</label>
            <div className="brand-editor">
              <div className="brand-logo-preview">
                <div className="leaf-mark">{brandInitials}</div>
                <div>
                  <strong>{brandName.toUpperCase()}</strong>
                  <small>{brandTagline}</small>
                </div>
              </div>
              <div className="brand-fields">
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand / venture display name"
                />
                <input
                  value={brandTagline}
                  onChange={(e) => setBrandTagline(e.target.value)}
                  placeholder="Brand tagline"
                />
                <div className="upload compact">
                  Upload brand logo <b>Choose file</b>
                  <br />
                  <small>SVG / PNG · transparent background recommended</small>
                </div>
              </div>
            </div>
          </div>
          <div className="field full">
            <label>Venture description</label>
            <textarea defaultValue="Thoughtfully planned plotted development with connected roads, open spaces and residential plots." />
          </div>
          <div className="field full">
            <label>Sample venture images</label>
            <div className="image-samples">
              {SAMPLE_IMAGES.map((img) => (
                <div className="sample-image" key={img.label}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt={img.label} />
                  <span>{img.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>Cover image</label>
            <div className="upload">
              Drop cover image here or <b>choose image</b>
              <br />
              <small>Recommended 1600 × 900 · JPG / PNG / WebP</small>
            </div>
          </div>
          <div className="field full">
            <label>Gallery</label>
            <div className="upload">
              Upload site photos, entrance, roads, parks, clubhouse, amenities
              and aerial views
            </div>
          </div>
          <div className="field full">
            <label>Plot dimensions & inventory rules</label>
            <DimensionRowsEditor
              rows={dimensionRows}
              onChange={setDimensionRows}
            />
          </div>
          <div className="field full">
            <label>Venture-specific amenities</label>
            <div className="check-grid">
              {AMENITIES.map((a) => (
                <label key={a.label}>
                  <input type="checkbox" defaultChecked={a.checked} /> {a.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="formactions">
          <button
            className="btn ghost"
            onClick={() => showToast("Draft saved")}
          >
            Save Draft
          </button>
          <button
            className="btn"
            onClick={() => showToast("Venture saved successfully")}
          >
            Save Venture
          </button>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <b>Venture setup checklist</b>
            <span>
              {CHECKLIST.filter((c) => c.done).length} / {CHECKLIST.length}
            </span>
          </div>
          <div className="mini-list">
            {CHECKLIST.map((c) => (
              <p key={c.label}>
                {c.label}{" "}
                <b style={{ color: c.done ? undefined : "#c59b54" }}>
                  {c.done ? "✓" : "Pending"}
                </b>
              </p>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="cardhead">
            <b>Customer-facing preview</b>
            <span>Updates with venture data</span>
          </div>
          <div className="preview-mini">
            <div className="preview-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImageUrl(profile)} alt={ventureName} />
            </div>
            <h3>{ventureName || "Untitled venture"}</h3>
            <p>
              {ventureLocation || "Location"} · {ventureAcres || "—"} acres ·{" "}
              {venturePlots || "—"} plots
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
