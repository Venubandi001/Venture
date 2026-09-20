const STATS = [
  { value: "18", label: "Acres" },
  { value: "240", label: "Total plots" },
  { value: "30–60 FT", label: "Roads" },
  { value: "126", label: "Available now" },
];

export default function StatsBand() {
  return (
    <section className="section">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">The venture</div>
          <h2>
            Not a brochure.
            <br />
            Explore the place.
          </h2>
        </div>
        <p>
          See the layout, roads, parks and plots as one connected experience.
          The production version will be database-driven.
        </p>
      </div>
      <div className="stats">
        {STATS.map((s) => (
          <div key={s.label}>
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
