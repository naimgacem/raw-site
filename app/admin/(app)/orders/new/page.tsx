import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import { resolveWilayas } from "@/lib/algeria";
import OrderEditor from "@/components/admin/OrderEditor";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  const cat = await getCatalogFresh();
  return <OrderEditor products={cat.products} wilayas={resolveWilayas(cat.delivery)} freeOver={cat.delivery.freeOver} />;
}
