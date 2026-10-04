import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { customers, toRow } from "@/lib/admin-data";
import CustomersView from "@/components/admin/CustomersView";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const db = await getDb();
  const [orders, cfg] = await Promise.all([db.listOrders(), db.getConfig(["blocked"]).catch(() => ({}))]);
  const blocked = (cfg as { blocked?: string[] }).blocked ?? [];
  return <CustomersView customers={customers(orders, blocked)} orders={orders.map(toRow)} initialQuery={searchParams.q ?? ""} />;
}
