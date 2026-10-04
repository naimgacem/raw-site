import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCatalogFresh } from "@/lib/catalog";
import { resolveWilayas } from "@/lib/algeria";
import OrderEditor from "@/components/admin/OrderEditor";

export const metadata: Metadata = { title: "Edit order" };

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const db = await getDb();
  const [order, cat] = await Promise.all([db.getOrder(Number(params.id)), getCatalogFresh()]);
  if (!order) notFound();
  return <OrderEditor order={order} products={cat.products} wilayas={resolveWilayas(cat.delivery)} freeOver={cat.delivery.freeOver} />;
}
