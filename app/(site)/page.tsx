import { preload } from "react-dom";
import Hero from "@/components/Hero";
import StylesRail from "@/components/StylesRail";
import { About, HowItWorks, SectionHead, ShopRail } from "@/components/Sections";

// One idea per section, each with one action: hero → the menu → how booking works → the shop → who RAW is.
// Everything reads in about four screens on a phone.
export default function Home() {
  // the hero's still frame is what the first paint shows — fetch it before anything else
  preload("/media/deep-poster.jpg", { as: "image", fetchPriority: "high" });
  return (
    <>
      <Hero />

      <section className="cv pb-10 pt-8" aria-label="The menu">
        <SectionHead eyebrow="Braids · Twists · Art" title="The menu" href="/menu" link="All prices" />
        <StylesRail />
      </section>

      <HowItWorks />
      <ShopRail />
      <About />
    </>
  );
}
