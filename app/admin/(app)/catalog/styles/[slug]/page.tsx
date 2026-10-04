import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogFresh } from "@/lib/catalog";
import StyleEditor from "@/components/admin/StyleEditor";

export const metadata: Metadata = { title: "Style" };

export default async function StyleEditPage({ params }: { params: { slug: string } }) {
  const cat = await getCatalogFresh();
  const isNew = params.slug === "new";
  const style = isNew ? undefined : cat.styles.find((s) => s.slug === params.slug);
  if (!isNew && !style) notFound();
  return <StyleEditor style={style} categories={cat.categories} />;
}
