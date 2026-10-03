// Order maths shared by the order form (display) and /api/order (source of truth).
import { getProduct, getVariant } from "./products";
import { deliveryFee, getWilaya, type DeliveryType } from "./algeria";
import { COUPONS, price } from "./site";

export type OrderItem = { slug: string; variant: string; qty: number };

export type OrderCustomer = {
  name: string;
  phone: string;
  wilaya: string; // code "16"
  commune: string;
  address: string;
  delivery: DeliveryType;
  note?: string;
};

export function findCoupon(code: string) {
  const key = code.trim().toUpperCase();
  return key && COUPONS[key] ? { code: key, ...COUPONS[key] } : null;
}

export function totals(items: OrderItem[], wilaya: string, delivery: DeliveryType, coupon: string) {
  const lines = items
    .map((i) => {
      const p = getProduct(i.slug);
      if (!p) return null;
      const qty = Math.max(1, Math.min(20, Math.floor(i.qty)));
      return { product: p, variant: getVariant(p, i.variant), qty, total: p.price * qty };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const shipping = wilaya ? deliveryFee(wilaya, delivery) : null;
  const c = findCoupon(coupon);
  const discount = c ? Math.min(subtotal, c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value) : 0;
  const total = shipping === null ? null : subtotal - discount + shipping;
  return { lines, subtotal, shipping, discount, coupon: c, total };
}

export function orderText(id: string, c: OrderCustomer, t: ReturnType<typeof totals>) {
  const w = getWilaya(c.wilaya);
  return [
    `🛍 طلب جديد / Nouvelle commande — ${id}`,
    ``,
    ...t.lines.map((l) => `• ${l.qty}× ${l.product.name}${l.product.variants.length > 1 ? ` (${l.variant.name})` : ""} — ${price(l.total)}`),
    ``,
    `Produits: ${price(t.subtotal)}`,
    `Livraison (${c.delivery === "desk" ? "Stop desk" : "Domicile"}): ${t.shipping === null ? "—" : price(t.shipping)}`,
    t.discount ? `Remise${t.coupon ? ` (${t.coupon.code})` : ""}: −${price(t.discount)}` : "",
    `TOTAL: ${t.total === null ? "—" : price(t.total)}`,
    ``,
    `👤 ${c.name}`,
    `📞 ${c.phone}`,
    `📍 ${w ? `${w.code} ${w.fr} / ${w.ar}` : c.wilaya} — ${c.commune}`,
    c.address ? `🏠 ${c.address}` : "",
    c.note ? `📝 ${c.note}` : "",
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
}
