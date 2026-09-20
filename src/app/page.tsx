import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import StatsBand from "@/components/home/StatsBand";
import ExploreSection from "@/components/home/ExploreSection";
// import Finder from "@/components/home/Finder";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import Approach from "@/components/home/Approach";
import Testimonials from "@/components/home/Testimonials";
import Faq from "@/components/home/Faq";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <StatsBand />
      <ExploreSection />
      {/* <Finder /> */}
      <FeaturesGrid />
      <Approach />
      <Testimonials />
      <Faq />
    </>
  );
}
