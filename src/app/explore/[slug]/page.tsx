import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlotViewer from "@/components/viewer/PlotViewer";
import { getVisibleLayout } from "@/server/layouts";
import { getVenture, listPublicVentures } from "@/server/ventures";
import { filterFromParams } from "@/shared/plotFilter";
import { ventureCard } from "@/shared/ventures";

export async function generateMetadata({ params }: PageProps<"/explore/[slug]">): Promise<Metadata> {
  const v = await getVenture((await params).slug);
  return v ? { title: `${v.name} · Explore plots`, description: `${v.name}, ${v.city} — live plot availability, sizes and site-visit booking.` } : { title: "Venture not found" };
}

export default async function ExplorePage({ params, searchParams }: PageProps<"/explore/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const layout = await getVisibleLayout(slug); // null for unknown ventures and (for buyers) draft/archived ones
  const venture = await getVenture(slug);
  if (!layout || !venture) notFound();

  return (
    <PlotViewer
      venture={{ ...ventureCard(venture), center: [venture.lat, venture.lng] }}
      layout={layout}
      others={(await listPublicVentures()).filter((v) => v.slug !== slug).map(ventureCard)}
      initialStatus={sp.status === "1"}
      initialPlot={typeof sp.plot === "string" ? sp.plot.slice(0, 20) : null}
      initialFilter={filterFromParams(sp)}
    />
  );
}
