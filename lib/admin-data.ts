// Numbers and groupings for the admin screens. Pure functions over orders/bookings.
import { addDays, dayKey, todayKey } from "./dates";
import { itemsSummary } from "./order";
import type { Booking, Order } from "./types";

/** what an order list row needs — keeps page payloads small */
export type OrderRow = Pick<Order, "id" | "createdAt" | "status" | "name" | "phone" | "wilaya" | "commune" | "delivery" | "total" | "flag" | "attempts" | "source"> & { summary: string; count: number };

export const toRow = (o: Order): OrderRow => ({
  id: o.id, createdAt: o.createdAt, status: o.status, name: o.name, phone: o.phone, wilaya: o.wilaya, commune: o.commune, delivery: o.delivery,
  total: o.total, flag: o.flag, attempts: o.attempts, source: o.source, summary: itemsSummary(o.items), count: o.items.reduce((n, l) => n + l.qty, 0),
});

/** products value of an order (delivery fees go to the courier) */
export const sales = (o: Order) => o.subtotal - o.discount;

export function dashboard(orders: Order[], bookings: Booking[]) {
  const today = todayKey();
  const month = today.slice(0, 7);
  const prevMonth = addDays(`${month}-01`, -1).slice(0, 7);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const perDay = new Map(days.map((d) => [d, { orders: 0, value: 0 }]));
  let monthSales = 0, prevSales = 0, monthDelivered = 0;
  for (const o of orders) {
    const k = dayKey(o.createdAt);
    const d = perDay.get(k);
    if (d && o.status !== "cancelled") { d.orders += 1; d.value += o.total; }
    if (o.status === "delivered") {
      if (k.startsWith(month)) { monthSales += sales(o); monthDelivered += 1; }
      // same days of last month, so the 3rd isn't compared with a whole month
      else if (k.startsWith(prevMonth) && k.slice(8) <= today.slice(8)) prevSales += sales(o);
    }
  }
  const shipped = orders.filter((o) => o.status === "shipped");
  const done = orders.filter((o) => o.status === "delivered" || o.status === "returned");
  return {
    toConfirm: orders.filter((o) => o.status === "new").length,
    toShip: orders.filter((o) => o.status === "confirmed").length,
    onRoad: shipped.length,
    toCollect: shipped.reduce((n, o) => n + o.total, 0),
    monthSales, prevSales, monthDelivered,
    returnRate: done.length >= 5 ? Math.round((done.filter((o) => o.status === "returned").length / done.length) * 100) : null,
    requests: bookings.filter((b) => b.status === "new").length,
    upcoming: bookings
      .filter((b) => b.status === "confirmed" && b.date && b.date >= today)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 4),
    chart: days.map((d) => ({ day: d, ...perDay.get(d)! })),
    latestNew: orders.filter((o) => o.status === "new").slice(0, 5).map(toRow),
  };
}

export type Customer = {
  phone: string; name: string; wilaya: string; orders: number; delivered: number; returned: number; cancelled: number; spent: number; last: string; blocked: boolean;
};

export function customers(orders: Order[], blocked: string[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const o of [...orders].reverse()) { // oldest → newest so the latest name wins
    const c = map.get(o.phone) ?? { phone: o.phone, name: o.name, wilaya: o.wilaya, orders: 0, delivered: 0, returned: 0, cancelled: 0, spent: 0, last: o.createdAt, blocked: blocked.includes(o.phone) };
    c.name = o.name;
    c.wilaya = o.wilaya;
    c.orders += 1;
    if (o.status === "delivered") { c.delivered += 1; c.spent += sales(o); }
    if (o.status === "returned") c.returned += 1;
    if (o.status === "cancelled") c.cancelled += 1;
    if (o.createdAt > c.last) c.last = o.createdAt;
    map.set(o.phone, c);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

/** how this phone number behaved before — shown on an order so risky COD orders stand out */
export function history(orders: Order[], phone: string, exceptId: number) {
  const past = orders.filter((o) => o.phone === phone && o.id !== exceptId);
  return {
    count: past.length,
    delivered: past.filter((o) => o.status === "delivered").length,
    returned: past.filter((o) => o.status === "returned").length,
    cancelled: past.filter((o) => o.status === "cancelled").length,
    recent: past.slice(0, 5).map(toRow),
  };
}
