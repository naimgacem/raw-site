import { NextResponse } from "next/server";
import { totals, orderText, type OrderCustomer, type OrderItem } from "@/lib/order";
import { getWilaya, normalizePhone } from "@/lib/algeria";

/**
 * Receives cash-on-delivery orders. Prices are recomputed here — never trusted from the browser.
 * Delivers each order to whatever is configured (see .env.example):
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  → message on the artist's phone
 *   ORDER_WEBHOOK_URL                      → JSON POST (e.g. Google Sheets via Apps Script)
 */
export const runtime = "nodejs";

type Body = { items?: OrderItem[]; customer?: Partial<OrderCustomer>; coupon?: string; website?: string };

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return bad("invalid json"); }

  // honeypot: real people never fill the hidden "website" field
  if (body.website) return NextResponse.json({ ok: true, id: "RAW-0", delivered: false });

  const c = body.customer ?? {};
  const phone = normalizePhone(String(c.phone ?? ""));
  const name = String(c.name ?? "").trim().slice(0, 80);
  const wilaya = String(c.wilaya ?? "");
  const commune = String(c.commune ?? "").trim().slice(0, 80);
  const delivery = c.delivery === "desk" ? "desk" : "home";
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (name.length < 3 || !phone || !getWilaya(wilaya) || !commune || items.length === 0) return bad("missing fields");

  const t = totals(items, wilaya, delivery, String(body.coupon ?? ""));
  if (t.lines.length === 0 || t.total === null) return bad("nothing to order");

  const customer: OrderCustomer = {
    name, phone, wilaya, commune, delivery,
    address: String(c.address ?? "").trim().slice(0, 200),
    note: String(c.note ?? "").trim().slice(0, 300),
  };
  const now = new Date();
  const id = `RAW-${now.toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const text = orderText(id, customer, t);

  const jobs: Promise<boolean>[] = [];
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ORDER_WEBHOOK_URL } = process.env;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }).then((r) => r.ok, () => false)
    );
  }
  if (ORDER_WEBHOOK_URL) {
    const w = getWilaya(wilaya)!;
    jobs.push(
      fetch(ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, date: now.toISOString(), ...customer, wilayaName: `${w.code} ${w.fr}`,
          items: t.lines.map((l) => `${l.qty}x ${l.product.name} (${l.variant.name})`).join(", "),
          subtotal: t.subtotal, shipping: t.shipping, discount: t.discount, coupon: t.coupon?.code ?? "", total: t.total,
        }),
      }).then((r) => r.ok, () => false)
    );
  }
  const results = await Promise.all(jobs);
  const delivered = results.some(Boolean);
  if (!delivered) console.warn(`[order] ${id} not delivered anywhere — configure TELEGRAM_* or ORDER_WEBHOOK_URL\n${text}`);

  return NextResponse.json({ ok: true, id, delivered, total: t.total, text });
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
