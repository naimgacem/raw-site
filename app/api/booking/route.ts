import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPublicCatalog } from "@/lib/catalog";
import { normalizePhone } from "@/lib/algeria";
import { price } from "@/lib/site";
import { clientIp, clip, notify } from "@/lib/server";
import type { NewBooking } from "@/lib/types";

/**
 * Booking requests from the menu's sheet. "Send booking request" needs a name and phone; a request
 * noted on the way to an Instagram DM (via: "dm") doesn't. Answers whether it was saved / delivered,
 * so the sheet can fall back to the DM when neither worked.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (b.website) return NextResponse.json({ ok: true, saved: true, sent: true });

  const db = await getDb();
  if (!(await db.hit(`booking:${clientIp(req)}`, 12, 3600))) return NextResponse.json({ ok: false, error: "too many" }, { status: 429 });

  const cat = await getPublicCatalog();
  const style = cat.styles.find((s) => s.slug === b.style);
  if (!style) return NextResponse.json({ ok: false, error: "unknown style" }, { status: 400 });

  const viaDm = b.via === "dm";
  const name = clip(b.name, 80);
  const rawPhone = clip(b.phone, 30);
  if (!viaDm && (name.length < 2 || rawPhone.replace(/\D/g, "").length < 9)) {
    return NextResponse.json({ ok: false, error: "name and phone needed" }, { status: 400 });
  }

  // only keep options that exist, and price them here
  const sent = (b.picks ?? {}) as Record<string, unknown>;
  const picks: Record<string, string> = {};
  let estimate = style.from;
  for (const o of style.options) {
    const c = o.choices.find((x) => x.label === sent[o.label]) ?? o.choices[0];
    if (!c) continue;
    picks[o.label] = c.label;
    estimate += c.add;
  }

  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null;
  const booking: NewBooking = {
    status: "new", source: "website", style: style.slug, styleName: style.name, picks, estimate, date,
    time: clip(b.time, 20), area: clip(b.area, 80), name, phone: normalizePhone(rawPhone) ?? rawPhone,
    instagram: "", price: null, deposit: 0, note: "", adminNote: "",
    history: [{ at: new Date().toISOString(), text: viaDm ? "Requested on the website (sending a DM too)" : "Requested on the website" }],
  };

  let id: number | null = null;
  try {
    id = (await db.createBooking(booking)).id;
  } catch (e) {
    console.error("[booking] not saved:", e instanceof Error ? e.message : e);
  }

  const delivered = await notify(
    [
      `📅 Booking request${id ? ` #${id}` : ""}${viaDm ? " (also coming by Instagram DM)" : ""}`,
      `• ${style.name}`,
      ...Object.entries(picks).map(([k, v]) => `• ${k}: ${v}`),
      `• Estimate: from ${price(estimate)}`,
      date || booking.time ? `• When: ${[date, booking.time].filter(Boolean).join(" — ")}` : "",
      booking.area ? `• Area: ${booking.area}` : "",
      name ? `👤 ${name}` : "",
      booking.phone ? `📞 ${booking.phone}` : "",
      id ? `\n${new URL(req.url).origin}/admin/bookings/${id}` : "",
    ].filter(Boolean).join("\n")
  );
  if (id === null && !delivered) console.warn("[booking] request reached nobody — connect Supabase or Telegram");

  return NextResponse.json({ ok: true, id, saved: id !== null, sent: delivered });
}
