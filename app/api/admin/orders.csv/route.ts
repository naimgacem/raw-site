import { getDb } from "@/lib/db";
import { assertAdmin } from "@/lib/admin-auth";
import { wilayaLabel } from "@/lib/algeria";
import { itemsSummary } from "@/lib/order";
import { todayKey } from "@/lib/dates";

/** All orders as a spreadsheet (opens in Excel / Google Sheets; Arabic names included). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["Order", "Date", "Status", "Name", "Phone", "Wilaya", "Commune", "Address", "Delivery", "Products", "Subtotal", "Delivery fee", "Discount", "Coupon", "Total", "Tracking", "Source", "Note", "Your note"];
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const status = new URL(req.url).searchParams.get("status");
  const db = await getDb();
  const orders = (await db.listOrders()).filter((o) => !status || status === "all" || o.status === status);
  const rows = orders.map((o) => [
    o.id, o.createdAt.replace("T", " ").slice(0, 16), o.status, o.name, o.phone, wilayaLabel(o.wilaya), o.commune, o.address,
    o.delivery === "desk" ? "Stop desk" : "Home", itemsSummary(o.items), o.subtotal, o.shipping, o.discount, o.coupon, o.total, o.tracking, o.source, o.note, o.adminNote,
  ]);
  const csv = "﻿" + [COLS, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="raw-orders-${todayKey()}.csv"`, "Cache-Control": "no-store" },
  });
}
