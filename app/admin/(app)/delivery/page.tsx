import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import DeliveryEditor from "@/components/admin/DeliveryEditor";

export const metadata: Metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  const cat = await getCatalogFresh();
  return <DeliveryEditor delivery={cat.delivery} />;
}
