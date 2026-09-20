const TESTIMONIALS = [
  {
    quote:
      "We closed a plot in the first week just from customers exploring the satellite map on their own phones.",
    name: "Ravi Kumar",
    role: "Sales Lead, Green Valley",
  },
  {
    quote:
      "Buyers finally understand what they're paying for before the site visit — questions dropped a lot.",
    name: "Anjali Reddy",
    role: "Sales Executive",
  },
  {
    quote:
      "Being able to see live availability instead of an outdated PDF changed how fast I could decide.",
    name: "Priya R.",
    role: "Plot buyer, Green Valley",
  },
];

export default function Testimonials() {
  return (
    <section className="section" id="testimonials">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">05 / What people say</div>
          <h2>Trusted by teams and buyers.</h2>
        </div>
        <p>A live map beats a brochure every time.</p>
      </div>
      <div className="testimonial-grid">
        {TESTIMONIALS.map((t) => (
          <div className="testimonial-card" key={t.name}>
            <p className="testimonial-quote">“{t.quote}”</p>
            <div className="testimonial-author">
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
