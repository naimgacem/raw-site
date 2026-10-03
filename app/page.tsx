import Hero from "@/components/Hero";
import StylesRail from "@/components/StylesRail";
import ProductCard from "@/components/ProductCard";
import { Banner, Collections, Feature, InstagramStrip, MoreLink, SectionTitle } from "@/components/Sections";
import { PRODUCTS } from "@/lib/products";

// Same rhythm as sunviya.com: video hero → card row → full-bleed banner → card row
// → lilac feature → tall collection cards → lilac newsletter/footer.
export default function Home() {
  return (
    <>
      <Hero />

      <section className="pb-14 pt-12" aria-label="The menu">
        <SectionTitle sub="Tap a style to see options, live pricing and book by DM.">The menu</SectionTitle>
        <StylesRail />
        <MoreLink href="/menu">Full menu &amp; prices</MoreLink>
      </section>

      <Banner />

      <section className="py-14" aria-label="Shop the drop">
        <SectionTitle sub="Durags, bonnets and care — made to protect the work.">Shop the drop</SectionTitle>
        <div className="rail">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} className="w-[40vw] max-w-[180px] shrink-0" />
          ))}
        </div>
        <MoreLink href="/shop">Shop all</MoreLink>
      </section>

      <Feature />
      <Collections />
      <InstagramStrip />
    </>
  );
}
