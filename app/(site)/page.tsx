import Hero from "@/components/Hero";
import StylesRail from "@/components/StylesRail";
import { About, HowItWorks, SectionHead, ShopRail } from "@/components/Sections";

// One idea per section, each with one action: hero → the menu → how booking works → the shop → who RAW is.
// Everything reads in about four screens on a phone.
export default function Home() {
  return (
    <>
      <Hero />

      <section className="pb-10 pt-8" aria-label="The menu">
        <SectionHead eyebrow="Braids · Twists · Art" title="The menu" href="/menu" link="All prices" />
        <StylesRail />
      </section>

      <HowItWorks />
      <ShopRail />
      <About />
    </>
  );
}
