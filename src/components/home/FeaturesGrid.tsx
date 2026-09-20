const FEATURES = [
  { icon: "🛰️", title: "Live satellite view", desc: "Real Esri/Maxar satellite imagery draped over the actual venture boundary." },
  { icon: "📍", title: "GPS plot boundaries", desc: "Every plot is geo-tagged so buyers see the exact polygon on the ground." },
  { icon: "🗂️", title: "Live inventory", desc: "Available, hold, reserved and sold status updates the moment your team acts." },
  { icon: "📐", title: "Dimension cards", desc: "Width, depth, road access and facing shown the instant a plot is selected." },
  { icon: "🧭", title: "Layout & satellite toggle", desc: "Switch between the master layout and real satellite imagery in one click." },
  { icon: "📝", title: "Booking applications", desc: "Capture applicant, KYC and payment details without leaving the page." },
  { icon: "💬", title: "Instant enquiries", desc: "Site-visit requests and enquiries land straight in your admin console." },
  { icon: "📊", title: "Admin control center", desc: "Manage every venture, plot, lead and payment from one dashboard." },
];

export default function FeaturesGrid() {
  return (
    <section className="section" id="features">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">04 / What you get</div>
          <h2>Everything a buyer needs to decide.</h2>
        </div>
        <p>
          Replace scattered brochures and PDFs with one interactive, always
          up to date link.
        </p>
      </div>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
