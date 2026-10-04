// Storage for everything the admin edits. Server-only.
//
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set  → Supabase (production)
//   otherwise, on your computer                   → JSON file in .data/ (development)
//   otherwise, on Vercel                          → read-only: the site runs on its starting data
import type { Booking, Coupon, MediaItem, NewBooking, NewOrder, Order } from "../types";

export interface Db {
  kind: "supabase" | "file" | "none";

  getConfig(keys: string[]): Promise<Record<string, unknown>>;
  setConfig(key: string, value: unknown): Promise<void>;

  createOrder(o: NewOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | null>;
  /** newest first */
  listOrders(): Promise<Order[]>;
  updateOrder(id: number, patch: Partial<NewOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  createBooking(b: NewBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | null>;
  /** newest first */
  listBookings(): Promise<Booking[]>;
  updateBooking(id: number, patch: Partial<NewBooking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;

  countNew(): Promise<{ orders: number; bookings: number }>;

  listCoupons(): Promise<Coupon[]>;
  getCoupon(code: string): Promise<Coupon | null>;
  /** insert or update; `previous` renames an existing code */
  saveCoupon(c: Coupon, previous?: string): Promise<void>;
  deleteCoupon(code: string): Promise<void>;
  redeemCoupon(code: string): Promise<void>;

  /** rate limit: true while `key` has been hit at most `limit` times in the last `windowSec` */
  hit(key: string, limit: number, windowSec: number): Promise<boolean>;

  upload(name: string, data: Buffer, contentType: string): Promise<MediaItem>;
  listMedia(): Promise<MediaItem[]>;
  deleteMedia(name: string): Promise<void>;

  ping(): Promise<void>;
}

export class DbError extends Error {}

export const NOT_CONNECTED = "The database isn't connected yet — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel (see README → Admin setup).";

let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERCEL } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseDb } = await import("./supabase");
    db = supabaseDb(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } else if (VERCEL) {
    const { noneDb } = await import("./none");
    db = noneDb();
  } else {
    const { fileDb } = await import("./file");
    db = fileDb();
  }
  return db;
}

/** "a-b" → "aB" and back, for Postgres column names */
export const toCamel = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v]));
export const toSnake = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]));

export function safeName(original: string) {
  const ext = (original.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "jpg").toLowerCase();
  const base = original
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "image";
  return `${Date.now().toString(36)}-${base}.${ext}`;
}
