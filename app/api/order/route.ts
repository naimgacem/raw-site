import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCatalog, toPublic } from "@/lib/catalog";
import { normalizePhone, wilayaLabel } from "@/lib/algeria";
import { orderRef, orderText, toOrderLines, totals, type OrderItem } from "@/lib/order";
import { checkCoupon, clientIp, clip, notify } from "@/lib/server";
import type { NewOrder, Order } from "@/lib/types";

/**
 * Receives cash-on-delivery orders. Prices are recomputed here — never trusted from the browser.
 * The order is saved for the admin, then pushed to Telegram / the webhook if configured (.env.example).
 */
export const runtime = "nodejs";

type Body = { items?: OrderItem[]; customer?: Record<string, unknown>; coupon?: string; website?: string };

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return bad("invalid json"); }

  // honeypot: real people never fill the hidden "website" field
  if (body.website) return NextResponse.json({ ok: true, id: "#0", delivered: true, total: 0, text: "" });

  const db = await getDb();
  if (!(await db.hit(`order:${clientIp(req)}`, 8, 600))) return bad("too many orders — try again in a few minutes", 429);

  const cat = toPublic(await getCatalog());
  if (!cat.settings.ordersOpen) return bad("closed", 403);

  const c = body.customer ?? {};
  const phone = normalizePhone(String(c.phone ?? ""));
  const name = clip(c.name, 80);
  const wilaya = String(c.wilaya ?? "");
  const commune = clip(c.commune, 80);
  const delivery = c.delivery === "desk" ? "desk" : "home";
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (name.length < 3 || !phone || !cat.wilayas.some((w) => w.code === wilaya) || !commune || items.length === 0) return bad("missing fields");

  const code = clip(body.coupon, 30).toUpperCase();
  const check = code ? checkCoupon(await db.getCoupon(code)) : null;
  const t = totals(cat, items, wilaya, delivery, check?.ok ? check.coupon : null);
  if (t.lines.length === 0) return bad("sold out");
  if (t.total === null || t.shipping === null) return bad("no delivery to this wilaya");

  const blocked = ((await db.getConfig(["blocked"]).catch(() => ({}))) as { blocked?: string[] }).blocked ?? [];
  const at = new Date().toISOString();
  const draft: NewOrder = {
    status: "new", source: "website", name, phone, wilaya, commune, delivery,
    address: clip(c.address, 200), note: clip(c.note, 300),
    items: toOrderLines(t), subtotal: t.subtotal, shipping: t.shipping, discount: t.discount, coupon: t.coupon?.code ?? "", total: t.total,
    attempts: 0, tracking: "", adminNote: "", flag: blocked.includes(phone) ? "blocked" : "",
    history: [{ at, text: "Placed on the website" }],
  };

  let order: Order;
  let saved = true;
  try {
    order = await db.createOrder(draft);
    if (t.coupon) db.redeemCoupon(t.coupon.code).catch(() => {});
  } catch (e) {
    saved = false;
    console.error("[order] not saved:", e instanceof Error ? e.message : e);
    order = { ...draft, id: Math.floor(Date.now() / 1000) % 1_000_000, createdAt: at, updatedAt: at };
  }

  const link = saved ? `${new URL(req.url).origin}/admin/orders/${order.id}` : undefined;
  const text = orderText(order, link);
  const sent = await notify(text, {
    id: orderRef(order.id), date: at, name, phone, wilaya, wilayaName: wilayaLabel(wilaya), commune, address: order.address, delivery, note: order.note,
    items: order.items.map((l) => `${l.qty}x ${l.name}${l.variantName ? ` (${l.variantName})` : ""}`).join(", "),
    subtotal: order.subtotal, shipping: order.shipping, discount: order.discount, coupon: order.coupon, total: order.total,
  });
  if (!saved && !sent) console.warn(`[order] ${orderRef(order.id)} reached nobody — connect Supabase or Telegram\n${text}`);

  return NextResponse.json({ ok: true, id: orderRef(order.id), delivered: saved || sent, total: order.total, text: orderText(order) });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
