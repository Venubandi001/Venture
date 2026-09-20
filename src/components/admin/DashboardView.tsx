import { VentureProfile } from "@/lib/types";
import AdminVentureMap from "./AdminVentureMap";

const KPIS = [
  { label: "Total ventures", value: "08", note: "2 launching soon" },
  { label: "Applications received", value: "486", note: "+32 this week" },
  { label: "Active leads", value: "214", note: "68 high intent" },
  { label: "Site visits", value: "57", note: "12 scheduled" },
  { label: "Bookings", value: "73", note: "₹24.8 Cr value" },
  { label: "Collection", value: "₹8.6 Cr", note: "+11.4% this month" },
];

const PORTFOLIO_CARDS: {
  brand: string;
  thumbClass: string;
  badge: string;
  loc: string;
  plots: number;
  available: number;
  sold: number;
  widths: [number, number, number, number];
}[] = [
  {
    brand: "Green Valley",
    thumbClass: "green-thumb",
    badge: "REAL SATELLITE · 240 PLOTS",
    loc: "Hyderabad · 18.42 acres · Survey No. 124",
    plots: 240,
    available: 126,
    sold: 85,
    widths: [52, 5, 8, 35],
  },
  {
    brand: "Lakeview Enclave",
    thumbClass: "lake-thumb",
    badge: "REAL SATELLITE · 318 PLOTS",
    loc: "Shamshabad · 24.8 acres · Airport Road",
    plots: 318,
    available: 204,
    sold: 61,
    widths: [64, 4, 13, 19],
  },
  {
    brand: "Oak County",
    thumbClass: "oak-thumb",
    badge: "REAL SATELLITE · 412 PLOTS",
    loc: "Yadadri · 31.2 acres · Temple Road",
    plots: 412,
    available: 330,
    sold: 39,
    widths: [80, 3, 7, 10],
  },
];

const ACTIVITY = [
  { text: "New application", meta: "Rahul K. · 3m" },
  { text: "Site visit confirmed", meta: "Green Valley · 18m" },
  { text: "Plot P-108 reserved", meta: "₹40L · 42m" },
  { text: "Payment received", meta: "₹12.5L · 1h" },
  { text: "New venture enquiry", meta: "Lakeview · 2h" },
];

export default function DashboardView({
  profile,
  onOpenVenture,
}: {
  profile: VentureProfile;
  onOpenVenture: (name: string) => void;
}) {
  return (
    <section>
      <div className="admin-top">
        <div>
          <div className="eyebrow">Operations / Today</div>
          <h1>Venture control center</h1>
          <p>
            Manage every venture, plot, enquiry, application and site visit
            from one place.
          </p>
        </div>
        <div className="datepill">19 September 2026 · Live dashboard</div>
      </div>

      <div className="admin-kpis">
        {KPIS.map((k) => (
          <div className="admin-kpi" key={k.label}>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span>{k.note}</span>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <b>Venture portfolio</b>
            <span>8 ventures · 1,426 plots</span>
          </div>
          <div className="venture-grid">
            {PORTFOLIO_CARDS.map((c) => (
              <div
                className="venture-card"
                key={c.brand}
                onClick={() => onOpenVenture(c.brand)}
              >
                <div className={`venture-image satellite-thumb ${c.thumbClass}`}>
                  <span className="image-badge">{c.badge}</span>
                </div>
                <div className="vcbody">
                  <div className="vc-title-row">
                    <h3>{c.brand}</h3>
                    <span className="live-dot">LIVE</span>
                  </div>
                  <p>{c.loc}</p>
                  <div className="vcstats">
                    <span>
                      <b>{c.plots}</b> plots
                    </span>
                    <span>
                      <b>{c.available}</b> available
                    </span>
                    <span>
                      <b>{c.sold}</b> sold
                    </span>
                  </div>
                  <div className="statusbar">
                    <i className="av" style={{ width: `${c.widths[0]}%` }} />
                    <i className="hd" style={{ width: `${c.widths[1]}%` }} />
                    <i className="rs" style={{ width: `${c.widths[2]}%` }} />
                    <i className="sd" style={{ width: `${c.widths[3]}%` }} />
                  </div>
                  <div className="venture-card-action">View venture details →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="cardhead">
            <b>Today&apos;s activity</b>
            <span>Live</span>
          </div>
          <div className="mini-list">
            {ACTIVITY.map((a, i) => (
              <p key={i}>
                <span>
                  <i className="activity-dot" />
                  {a.text}
                </span>
                <small>{a.meta}</small>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Live venture map</h2>
        <p>Select a venture to see its satellite inventory and plot status.</p>
      </div>
      <AdminVentureMap profile={profile} />
    </section>
  );
}
