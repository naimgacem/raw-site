import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { history } from "@/lib/admin-data";
import OrderDetail from "@/components/admin/OrderDetail";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [order, orders, cfg] = await Promise.all([db.getOrder(id), db.listOrders(), db.getConfig(["blocked"]).catch(() => ({}))]);
  if (!order) notFound();
  const blocked = ((cfg as { blocked?: string[] }).blocked ?? []).includes(order.phone);
  return <OrderDetail order={order} past={history(orders, order.phone, order.id)} blocked={blocked} />;
}
