import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { toRow } from "@/lib/admin-data";
import OrdersView from "@/components/admin/OrdersView";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: { s?: string; q?: string } }) {
  const db = await getDb();
  const orders = await db.listOrders();
  return <OrdersView rows={orders.map(toRow)} initialStatus={searchParams.s ?? "all"} initialQuery={searchParams.q ?? ""} />;
}
