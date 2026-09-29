import type { VentureFacts } from "./StatsBand";

const HERO_TILES = Array.from({ length: 35 }, (_, i) => `h${i % 7}`);

export default function Hero({ exploreHref, findHref, facts }: { exploreHref: string; findHref: string; facts: VentureFacts | null }) {
  return (
    <section className="hero">
      <div>
        <div className="eyebrow">A new way to discover land</div>
        <h1>
          Find your <i>place.</i>
        </h1>
        <p>
          Explore thoughtfully planned ventures, understand every plot, and
          choose the one that fits your vision — all in one immersive
          experience.
        </p>
        <a className="btn" href={exploreHref}>
          Explore the Venture
        </a>
        <a className="btn ghost" href={findHref}>
          Find My Plot
        </a>
      </div>
      <div className="heroart">
        <div className="herogrid">
          {HERO_TILES.map((cls, i) => (
            <b key={i} className={`hplot ${cls}`} />
          ))}
        </div>
        <div className="heroroad hr1" />
        <div className="heroroad hr2" />
        {facts ? (
          <div className="herolabel">
            <strong>{facts.name}</strong>
            <small>{facts.loc} · {facts.acres} acres · {facts.plots} plots</small>
          </div>
        ) : null}
      </div>
    </section>
  );
}
