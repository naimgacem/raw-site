import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductView from "@/components/ProductView";
import { getPublicCatalog } from "@/lib/catalog";

export async function generateStaticParams() {
  const { products } = await getPublicCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = (await getPublicCatalog()).products.find((x) => x.slug === params.slug);
  if (!p) return {};
  return { title: p.name, description: `${p.blurb} ${p.description}`, openGraph: { images: [p.variants[0].image] } };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = (await getPublicCatalog()).products.find((x) => x.slug === params.slug);
  if (!p) notFound();
  // keyed so switching products starts fresh (colour, quantity, form)
  return <ProductView key={p.slug} slug={p.slug} />;
}
