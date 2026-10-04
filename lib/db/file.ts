// Development storage: one JSON file + an uploads folder in .data/ (git-ignored).
import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_COUPONS } from "../site";
import type { Booking, Coupon, MediaItem, NewBooking, NewOrder, Order } from "../types";
import { DbError, safeName, type Db } from "./index";

type State = {
  config: Record<string, unknown>;
  orders: Order[];
  bookings: Booking[];
  coupons: Coupon[];
  seq: { orders: number; bookings: number };
  throttle: Record<string, { hits: number; reset: number }>;
};

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");
export const MEDIA_DIR = path.join(DIR, "media");

const fresh = (): State => ({
  config: {},
  orders: [],
  bookings: [],
  coupons: DEFAULT_COUPONS.map((c) => ({ ...c })),
  seq: { orders: 1000, bookings: 100 },
  throttle: {},
});

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<State> {
  try {
    return { ...fresh(), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return fresh();
  }
}

/** read-modify-write, one at a time */
function tx<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const s = await load();
    const out = await fn(s);
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE + ".tmp", JSON.stringify(s, null, 1));
    await fs.rename(FILE + ".tmp", FILE);
    return out;
  });
  queue = run.catch(() => {});
  return run;
}

const now = () => new Date().toISOString();
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

export function fileDb(): Db {
  return {
    kind: "file",

    async getConfig(keys) {
      const s = await load();
      return Object.fromEntries(keys.filter((k) => k in s.config).map((k) => [k, s.config[k]]));
    },
    setConfig: (key, value) => tx((s) => { s.config[key] = value; }),

    createOrder: (o) =>
      tx((s) => {
        const order: Order = { ...o, id: ++s.seq.orders, createdAt: now(), updatedAt: now() };
        s.orders.push(order);
        return order;
      }),
    getOrder: async (id) => (await load()).orders.find((o) => o.id === id) ?? null,
    listOrders: async () => (await load()).orders.sort(byNewest),
    updateOrder: (id, patch) =>
      tx((s) => {
        const i = s.orders.findIndex((o) => o.id === id);
        if (i < 0) throw new DbError("Order not found");
        s.orders[i] = { ...s.orders[i], ...patch, updatedAt: now() };
        return s.orders[i];
      }),
    deleteOrder: (id) => tx((s) => { s.orders = s.orders.filter((o) => o.id !== id); }),

    createBooking: (b) =>
      tx((s) => {
        const booking: Booking = { ...b, id: ++s.seq.bookings, createdAt: now(), updatedAt: now() };
        s.bookings.push(booking);
        return booking;
      }),
    getBooking: async (id) => (await load()).bookings.find((b) => b.id === id) ?? null,
    listBookings: async () => (await load()).bookings.sort(byNewest),
    updateBooking: (id, patch) =>
      tx((s) => {
        const i = s.bookings.findIndex((b) => b.id === id);
        if (i < 0) throw new DbError("Booking not found");
        s.bookings[i] = { ...s.bookings[i], ...patch, updatedAt: now() };
        return s.bookings[i];
      }),
    deleteBooking: (id) => tx((s) => { s.bookings = s.bookings.filter((b) => b.id !== id); }),

    async countNew() {
      const s = await load();
      return { orders: s.orders.filter((o) => o.status === "new").length, bookings: s.bookings.filter((b) => b.status === "new").length };
    },

    listCoupons: async () => (await load()).coupons,
    getCoupon: async (code) => (await load()).coupons.find((c) => c.code === code) ?? null,
    saveCoupon: (c, previous) =>
      tx((s) => {
        const key = previous ?? c.code;
        if (c.code !== key && s.coupons.some((x) => x.code === c.code)) throw new DbError(`${c.code} already exists`);
        const i = s.coupons.findIndex((x) => x.code === key);
        if (i < 0) s.coupons.unshift(c);
        else s.coupons[i] = c;
      }),
    deleteCoupon: (code) => tx((s) => { s.coupons = s.coupons.filter((c) => c.code !== code); }),
    redeemCoupon: (code) => tx((s) => { const c = s.coupons.find((x) => x.code === code); if (c) c.uses += 1; }),

    hit: (key, limit, windowSec) =>
      tx((s) => {
        const t = Date.now();
        for (const k of Object.keys(s.throttle)) if (s.throttle[k].reset < t) delete s.throttle[k];
        const e = (s.throttle[key] ??= { hits: 0, reset: t + windowSec * 1000 });
        e.hits += 1;
        return e.hits <= limit;
      }),

    async upload(name, data) {
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      const file = safeName(name);
      await fs.writeFile(path.join(MEDIA_DIR, file), data);
      return { url: `/media/${file}`, name: file, size: data.length, at: now() };
    },
    async listMedia(): Promise<MediaItem[]> {
      try {
        const files = await fs.readdir(MEDIA_DIR);
        const items = await Promise.all(
          files.map(async (f) => {
            const st = await fs.stat(path.join(MEDIA_DIR, f));
            return { url: `/media/${f}`, name: f, size: st.size, at: st.mtime.toISOString() };
          })
        );
        return items.sort((a, b) => b.at.localeCompare(a.at));
      } catch {
        return [];
      }
    },
    async deleteMedia(name) {
      await fs.rm(path.join(MEDIA_DIR, path.basename(name)), { force: true });
    },

    async ping() {},
  };
}
