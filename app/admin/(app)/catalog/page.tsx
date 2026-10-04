import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import CatalogView from "@/components/admin/CatalogView";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage({ searchParams }: { searchParams: { tab?: string } }) {
  const cat = await getCatalogFresh();
  return (
    <CatalogView
      products={cat.products} styles={cat.styles} collections={cat.collections} categories={cat.categories}
      tab={searchParams.tab === "styles" || searchParams.tab === "groups" ? searchParams.tab : "products"}
    />
  );
}
