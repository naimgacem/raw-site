// Builds the ready-to-send DM text for bookings and orders.
import { SITE, instagramDM, price } from "./site";
import { findVariant } from "./products";
import type { HairStyle, Product } from "./types";

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

export function orderMessage(products: Product[], lines: { slug: string; variant: string; qty: number }[], subtotal: number) {
  const out = [`Hi RAW 👑 I'd like to order:`];
  for (const l of lines) {
    const p = products.find((x) => x.slug === l.slug);
    if (!p) continue;
    const v = findVariant(p, l.variant);
    out.push(`• ${l.qty}× ${p.name}${p.variants.length > 1 ? ` (${v.name})` : ""} — ${price(p.price * l.qty)}`);
  }
  out.push(`Subtotal: ${price(subtotal)}`, `Delivery / pick-up: `);
  return out.join("\n");
}

/**
 * Copies text on every phone. The Clipboard API needs HTTPS and a fresh tap; the fallback selects a
 * hidden text box the way iOS Safari requires (an editable box + a selection range), then copies.
 */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.contentEditable = "true";
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
  document.body.appendChild(ta);
  const range = document.createRange();
  range.selectNodeContents(ta);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  sel?.removeAllRanges();
  ta.remove();
  return ok;
}

/**
 * Instagram DM link. Instagram has no official way to pre-type a message, but some app versions
 * accept ?text= — it's ignored where it isn't supported, so it costs nothing to try.
 */
export const instagramDMWithText = (handle: string, text: string) => `${instagramDM(handle)}?text=${encodeURIComponent(text)}`;

/**
 * Copies the text and opens the Instagram DM thread — both started inside the same tap, so iOS
 * neither blocks the new window nor refuses the copy. Resolves to whether the copy worked.
 */
export function sendViaInstagram(text: string, handle: string) {
  const copied = copyText(text);
  window.open(instagramDMWithText(handle, text), "_blank", "noopener");
  return copied;
}
