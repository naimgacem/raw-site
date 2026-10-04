import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkCoupon, clientIp } from "@/lib/server";

/** Checks a discount code for the order form. Codes stay on the server — they're not in the page. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 30);
  if (!code) return NextResponse.json({ ok: false, reason: "invalid" });
  const db = await getDb();
  if (!(await db.hit(`coupon:${clientIp(req)}`, 30, 600))) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 429 });
  return NextResponse.json(checkCoupon(await db.getCoupon(code)));
}
