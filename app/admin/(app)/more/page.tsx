import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import MoreView from "@/components/admin/MoreView";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const db = await getDb();
  const [coupons, cfg] = await Promise.all([db.listCoupons(), db.getConfig(["blocked"]).catch(() => ({}))]);
  return <MoreView activeCoupons={coupons.filter((c) => c.active).length} blocked={((cfg as { blocked?: string[] }).blocked ?? []).length} />;
}
