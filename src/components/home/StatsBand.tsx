export interface VentureFacts {
  name: string;
  loc: string;
  acres: string;
  plots: number;
  available: number;
  roads: string;
}

export default function StatsBand({ facts }: { facts: VentureFacts }) {
  const stats = [
    { value: facts.acres, label: "Acres" },
    { value: String(facts.plots), label: "Total plots" },
    { value: facts.roads, label: "Roads" },
    { value: String(facts.available), label: "Available now" },
  ];
  return (
    <section className="section">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">{facts.name} · {facts.loc}</div>
          <h2>
            Not a brochure.
            <br />
            Explore the place.
          </h2>
        </div>
        <p>
          See the layout, roads, parks and plots as one connected experience —
          with live availability straight from the sales team.
        </p>
      </div>
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label}>
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
