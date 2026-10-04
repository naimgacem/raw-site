import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogFresh } from "@/lib/catalog";
import ProductEditor from "@/components/admin/ProductEditor";

export const metadata: Metadata = { title: "Product" };

export default async function ProductEditPage({ params, searchParams }: { params: { slug: string }; searchParams: { copy?: string } }) {
  const cat = await getCatalogFresh();
  const isNew = params.slug === "new";
  const source = isNew ? (searchParams.copy ? cat.products.find((p) => p.slug === searchParams.copy) : undefined) : cat.products.find((p) => p.slug === params.slug);
  if (!isNew && !source) notFound();
  return <ProductEditor product={source} isNew={isNew} collections={cat.collections} taken={cat.products.map((p) => p.slug)} />;
}
