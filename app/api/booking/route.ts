import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPublicCatalog } from "@/lib/catalog";
import { normalizePhone } from "@/lib/algeria";
import { price } from "@/lib/site";
import { clientIp, clip, notify } from "@/lib/server";
import type { NewBooking } from "@/lib/types";

/** Records a booking request when a visitor taps "Book via DM", so the artist sees it in the admin. */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (b.website) return NextResponse.json({ ok: true });

  const db = await getDb();
  if (!(await db.hit(`booking:${clientIp(req)}`, 12, 3600))) return NextResponse.json({ ok: false, error: "too many" }, { status: 429 });

  const cat = await getPublicCatalog();
  const style = cat.styles.find((s) => s.slug === b.style);
  if (!style) return NextResponse.json({ ok: false, error: "unknown style" }, { status: 400 });

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
  const rawPhone = clip(b.phone, 30);
  const booking: NewBooking = {
    status: "new", source: "website", style: style.slug, styleName: style.name, picks, estimate, date,
    time: clip(b.time, 20), area: clip(b.area, 80), name: clip(b.name, 80), phone: normalizePhone(rawPhone) ?? rawPhone,
    instagram: "", price: null, deposit: 0, note: "", adminNote: "",
    history: [{ at: new Date().toISOString(), text: "Requested on the website" }],
  };

  try {
    const saved = await db.createBooking(booking);
    await notify(
      [
        `📅 Booking request #${saved.id}`,
        `• ${style.name}`,
        ...Object.entries(picks).map(([k, v]) => `• ${k}: ${v}`),
        `• Estimate: from ${price(estimate)}`,
        date || booking.time ? `• When: ${[date, booking.time].filter(Boolean).join(" — ")}` : "",
        booking.area ? `• Area: ${booking.area}` : "",
        booking.name ? `👤 ${booking.name}` : "",
        booking.phone ? `📞 ${booking.phone}` : "",
        `\n${new URL(req.url).origin}/admin/bookings/${saved.id}`,
      ].filter(Boolean).join("\n")
    );
  } catch (e) {
    console.error("[booking] not saved:", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}
