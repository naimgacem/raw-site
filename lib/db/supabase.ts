// Production storage: Supabase (Postgres + Storage). Tables come from supabase/schema.sql.
// Uses the service-role key, so it must only ever run on the server.
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type { Booking, Coupon, MediaItem, Order } from "../types";
import { DbError, safeName, toCamel, toSnake, type Db } from "./index";

const BUCKET = "media";

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) {
    const e = res.error;
    if (e.code === "42P01" || e.code === "PGRST205" || /does not exist|Could not find the (table|function)/i.test(e.message)) {
      throw new DbError("Supabase is connected but the tables are missing — run supabase/schema.sql in Supabase → SQL Editor.");
    }
    throw new DbError(e.message);
  }
  return res.data;
}

const now = () => new Date().toISOString();

export function supabaseDb(url: string, key: string): Db {
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // never let Next's data cache keep a stale copy of a query
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });

  const order = (row: unknown) => toCamel(row as Record<string, unknown>) as unknown as Order;
  const booking = (row: unknown) => toCamel(row as Record<string, unknown>) as unknown as Booking;
  const coupon = (row: unknown) => toCamel(row as Record<string, unknown>) as unknown as Coupon;

  /** newest first; Supabase returns at most 1000 rows per request, so read in pages */
  async function all(table: "orders" | "bookings") {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const page = check(await sb.from(table).select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + 999)) ?? [];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows;
  }

  return {
    kind: "supabase",

    async getConfig(keys) {
      const rows = check(await sb.from("config").select("key,value").in("key", keys));
      return Object.fromEntries((rows ?? []).map((r) => [r.key as string, r.value]));
    },
    async setConfig(key, value) {
      check(await sb.from("config").upsert({ key, value, updated_at: now() }));
    },

    async createOrder(o) {
      return order(check(await sb.from("orders").insert(toSnake(o)).select().single()));
    },
    async getOrder(id) {
      const row = check(await sb.from("orders").select("*").eq("id", id).maybeSingle());
      return row ? order(row) : null;
    },
    async listOrders() {
      return (await all("orders")).map(order);
    },
    async updateOrder(id, patch) {
      return order(check(await sb.from("orders").update({ ...toSnake(patch), updated_at: now() }).eq("id", id).select().single()));
    },
    async deleteOrder(id) {
      check(await sb.from("orders").delete().eq("id", id));
    },

    async createBooking(b) {
      return booking(check(await sb.from("bookings").insert(toSnake(b)).select().single()));
    },
    async getBooking(id) {
      const row = check(await sb.from("bookings").select("*").eq("id", id).maybeSingle());
      return row ? booking(row) : null;
    },
    async listBookings() {
      return (await all("bookings")).map(booking);
    },
    async updateBooking(id, patch) {
      return booking(check(await sb.from("bookings").update({ ...toSnake(patch), updated_at: now() }).eq("id", id).select().single()));
    },
    async deleteBooking(id) {
      check(await sb.from("bookings").delete().eq("id", id));
    },

    async countNew() {
      const [o, b] = await Promise.all([
        sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      check(o);
      check(b);
      return { orders: o.count ?? 0, bookings: b.count ?? 0 };
    },

    async listCoupons() {
      return (check(await sb.from("coupons").select("*").order("created_at", { ascending: false })) ?? []).map(coupon);
    },
    async getCoupon(code) {
      const row = check(await sb.from("coupons").select("*").eq("code", code).maybeSingle());
      return row ? coupon(row) : null;
    },
    async saveCoupon(c, previous) {
      const row = toSnake(c);
      if (previous && previous !== c.code) {
        const taken = check(await sb.from("coupons").select("code").eq("code", c.code).maybeSingle());
        if (taken) throw new DbError(`${c.code} already exists`);
        check(await sb.from("coupons").update(row).eq("code", previous));
      } else {
        check(await sb.from("coupons").upsert(row));
      }
    },
    async deleteCoupon(code) {
      check(await sb.from("coupons").delete().eq("code", code));
    },
    async redeemCoupon(code) {
      check(await sb.rpc("coupon_redeem", { p_code: code }));
    },

    async hit(key, limit, windowSec) {
      try {
        return Boolean(check(await sb.rpc("throttle_hit", { p_key: key, p_limit: limit, p_window: windowSec })));
      } catch {
        return true; // never lock people out because the limiter itself failed
      }
    },

    async upload(name, data, contentType) {
      const file = safeName(name);
      const res = await sb.storage.from(BUCKET).upload(file, data, { contentType, cacheControl: "31536000", upsert: false });
      if (res.error) throw new DbError(/bucket not found/i.test(res.error.message) ? "The “media” storage bucket is missing — run supabase/schema.sql." : res.error.message);
      const { publicUrl } = sb.storage.from(BUCKET).getPublicUrl(file).data;
      return { url: publicUrl, name: file, size: data.length, at: now() };
    },
    async listMedia(): Promise<MediaItem[]> {
      const res = await sb.storage.from(BUCKET).list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
      if (res.error) return [];
      return res.data
        .filter((f) => f.id && !f.name.startsWith("."))
        .map((f) => ({
          url: sb.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
          name: f.name,
          size: Number((f.metadata as { size?: number } | null)?.size ?? 0),
          at: f.created_at ?? now(),
        }));
    },
    async deleteMedia(name) {
      const res = await sb.storage.from(BUCKET).remove([name]);
      if (res.error) throw new DbError(res.error.message);
    },

    async ping() {
      check(await sb.from("config").select("key").limit(1));
    },
  };
}
