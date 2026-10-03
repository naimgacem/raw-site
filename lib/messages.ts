// Builds the ready-to-send DM text for bookings and orders.
import { SITE, price } from "./site";
import type { HairStyle } from "./styles";
import { getProduct, getVariant } from "./products";

export function bookingMessage(style: HairStyle, picks: Record<string, string>, total: number, extra: { date?: string; time?: string; area?: string; name?: string }) {
  const lines = [
    `Hi RAW 👑 I'd like to book:`,
    `• ${style.name}`,
    ...Object.entries(picks).map(([k, v]) => `• ${k}: ${v}`),
    `• Estimate: from ${price(total)}`,
  ];
  if (extra.date || extra.time) lines.push(`• When: ${[extra.date, extra.time].filter(Boolean).join(" — ")}`);
  if (extra.area) lines.push(`• Area: ${extra.area}`);
  if (extra.name) lines.push(`• Name: ${extra.name}`);
  lines.push(`(sent from ${SITE.url.replace("https://", "")})`);
  return lines.join("\n");
}

export function orderMessage(lines: { slug: string; variant: string; qty: number }[], subtotal: number) {
  const out = [`Hi RAW 👑 I'd like to order:`];
  for (const l of lines) {
    const p = getProduct(l.slug);
    if (!p) continue;
    const v = getVariant(p, l.variant);
    out.push(`• ${l.qty}× ${p.name}${p.variants.length > 1 ? ` (${v.name})` : ""} — ${price(p.price * l.qty)}`);
  }
  out.push(`Subtotal: ${price(subtotal)}`, `Delivery / pick-up: `);
  return out.join("\n");
}

/** Copies text, then opens the Instagram DM thread (Instagram links can't pre-fill text). */
export async function sendViaInstagram(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
  window.open(SITE.instagramDM, "_blank", "noopener");
}
