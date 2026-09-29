import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import StatsBand from "@/components/home/StatsBand";
import ExploreSection from "@/components/home/ExploreSection";
import Finder from "@/components/home/Finder";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import Approach from "@/components/home/Approach";
import Faq from "@/components/home/Faq";

import { connection } from "next/server";
import { plotPrice } from "@/shared/layout";
import { featuredSlug, getLayout } from "@/server/layouts";
import { getVenture } from "@/server/ventures";
import { ventureCard } from "@/shared/ventures";

export default async function Home() {
  await connection(); // ventures + layouts change at runtime from /admin, so render per request
  const slug = await featuredSlug();
  const venture = slug ? await getVenture(slug) : null;
  const layout = slug ? await getLayout(slug) : null;
  const featured = venture && layout ? { venture: { ...ventureCard(venture), center: [venture.lat, venture.lng] as [number, number] }, layout } : null;
  const facts = venture && layout ? {
    name: venture.name,
    loc: venture.city,
    acres: venture.acres || "—",
    plots: layout.plots.length,
    available: layout.plots.filter((p) => p.status === "available").length,
    roads: [...new Set(layout.features.filter((f) => f.kind === "road" && f.label).map((f) => f.label!.replace(/\s*road$/i, "")))].join(" / ") || "—",
  } : null;
  const priced = !!layout?.plots.some((p) => plotPrice(layout, p) !== null);
  const facings = layout ? [...new Set(layout.plots.map((p) => p.facing).filter((f): f is string => !!f))].sort() : [];

  return (
    <>
      <Nav findHref={slug ? "#finder" : "#explore"} />
      <Hero exploreHref={featured ? `/explore/${featured.layout.slug}` : "#explore"} findHref={slug ? "#finder" : "#explore"} facts={facts} />
      {facts ? <StatsBand facts={facts} /> : null}
      <ExploreSection featured={featured} />
      {slug ? <Finder slug={slug} priced={priced} facings={facings} /> : null}
      <FeaturesGrid />
      <Approach />
      <Faq />
    </>
  );
}
