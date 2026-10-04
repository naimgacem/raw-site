// Small server helpers shared by the public API routes and the admin. Server-only.
import { todayKey } from "./dates";
import type { Coupon, CouponInfo } from "./types";

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export type CouponCheck = { ok: true; coupon: CouponInfo } | { ok: false; reason: "invalid" | "expired" | "used" };

export function checkCoupon(c: Coupon | null): CouponCheck {
  if (!c || !c.active) return { ok: false, reason: "invalid" };
  if (c.expires && c.expires < todayKey()) return { ok: false, reason: "expired" };
  if (c.maxUses !== null && c.uses >= c.maxUses) return { ok: false, reason: "used" };
  return { ok: true, coupon: { code: c.code, type: c.type, value: c.value, minOrder: c.minOrder } };
}

export const telegramReady = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/** Sends a message to the artist's Telegram (and the JSON webhook if given). True if anything got through. */
export async function notify(text: string, webhook?: Record<string, unknown>) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ORDER_WEBHOOK_URL } = process.env;
  const jobs: Promise<boolean>[] = [];
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
        cache: "no-store",
      }).then((r) => r.ok, () => false)
    );
  }
  if (ORDER_WEBHOOK_URL && webhook) {
    jobs.push(
      fetch(ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhook),
        cache: "no-store",
      }).then((r) => r.ok, () => false)
    );
  }
  return (await Promise.all(jobs)).some(Boolean);
}

export const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
