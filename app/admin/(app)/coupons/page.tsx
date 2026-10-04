import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import CouponsView from "@/components/admin/CouponsView";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const db = await getDb();
  return <CouponsView coupons={await db.listCoupons()} />;
}
