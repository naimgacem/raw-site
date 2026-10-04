// Order maths shared by the order form (display), /api/order (source of truth) and the admin.
import { findVariant, isAvailable } from "./products";
import { wilayaLabel } from "./algeria";
import { price } from "./site";
import type { CouponInfo, DeliveryType, Order, OrderLine, Product, Wilaya } from "./types";

export type OrderItem = { slug: string; variant: string; qty: number };

type Priced = { products: Product[]; wilayas: Wilaya[]; freeOver: number };

export function couponDiscount(c: CouponInfo | null, subtotal: number) {
  if (!c || subtotal <= 0 || subtotal < c.minOrder) return 0;
  return Math.min(subtotal, c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value);
}

/** Delivery fee for a wilaya, or null when it isn't delivered there (or has no stop-desk). */
export function deliveryFee(wilayas: Wilaya[], code: string, type: DeliveryType): number | null {
  const w = wilayas.find((x) => x.code === code);
  if (!w) return null;
  return type === "desk" ? w.desk : w.home;
}

export function totals(cat: Priced, items: OrderItem[], wilaya: string, delivery: DeliveryType, coupon: CouponInfo | null) {
  const lines = items
    .map((i) => {
      const p = cat.products.find((x) => x.slug === i.slug && !x.hidden);
      if (!p) return null;
      const variant = findVariant(p, i.variant);
      if (!isAvailable(p, variant)) return null;
      const qty = Math.max(1, Math.min(20, Math.floor(i.qty) || 1));
      return { product: p, variant, qty, total: p.price * qty };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const discount = couponDiscount(coupon, subtotal);
  const fee = wilaya ? deliveryFee(cat.wilayas, wilaya, delivery) : null;
  const free = fee !== null && cat.freeOver > 0 && subtotal - discount >= cat.freeOver;
  const shipping = fee === null ? null : free ? 0 : fee;
  const total = shipping === null ? null : subtotal - discount + shipping;
  return { lines, subtotal, shipping, discount, coupon: discount ? coupon : null, total, free };
}

export const toOrderLines = (t: ReturnType<typeof totals>): OrderLine[] =>
  t.lines.map((l) => ({
    slug: l.product.slug, variant: l.variant.id, name: l.product.name,
    variantName: l.product.variants.length > 1 ? l.variant.name : "",
    image: l.variant.image, price: l.product.price, qty: l.qty,
  }));

export const orderRef = (id: number | string) => `#${id}`;

export const itemsSummary = (items: OrderLine[]) =>
  items.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ""}${l.name}${l.variantName ? ` (${l.variantName})` : ""}`).join(", ");

/** The message the artist receives on Telegram. */
export function orderText(o: Order, link?: string) {
  return [
    `${o.flag === "blocked" ? "⚠️ BLOCKED NUMBER\n" : ""}🛍 طلب جديد / Nouvelle commande — ${orderRef(o.id)}`,
    ``,
    ...o.items.map((l) => `• ${l.qty}× ${l.name}${l.variantName ? ` (${l.variantName})` : ""} — ${price(l.price * l.qty)}`),
    ``,
    `Produits: ${price(o.subtotal)}`,
    `Livraison (${o.delivery === "desk" ? "Stop desk" : "Domicile"}): ${o.shipping ? price(o.shipping) : "Gratuite"}`,
    o.discount ? `Remise${o.coupon ? ` (${o.coupon})` : ""}: −${price(o.discount)}` : "",
    `TOTAL: ${price(o.total)}`,
    ``,
    `👤 ${o.name}`,
    `📞 ${o.phone}`,
    `📍 ${wilayaLabel(o.wilaya)} — ${o.commune}`,
    o.address ? `🏠 ${o.address}` : "",
    o.note ? `📝 ${o.note}` : "",
    link ? `\n${link}` : "",
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
}

/** Plain text for the courier (Yalidine, ZR, Maystro…) or a DM. */
export function courierText(o: Order) {
  return [
    `${orderRef(o.id)} — ${o.name}`,
    `Tel: ${o.phone}`,
    `${wilayaLabel(o.wilaya)} — ${o.commune}`,
    o.address ? `Adresse: ${o.address}` : "",
    `Livraison: ${o.delivery === "desk" ? "Stop desk" : "Domicile"}`,
    `Produits: ${itemsSummary(o.items)}`,
    `Montant à encaisser: ${price(o.total)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
