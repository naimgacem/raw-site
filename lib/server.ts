// Small server helpers shared by the public API routes and the admin. Server-only.
import { getDb } from "./db";
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

/* ------------------------------------------------------------ Telegram */
// Either set in Vercel (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID), or connected from Admin → Settings,
// which keeps the token in the locked database.
export type TelegramStored = { token: string; chatId: string; bot: string; chat: string };

export async function telegramStored(): Promise<TelegramStored | null> {
  try {
    const db = await getDb();
    const t = (await db.getConfig(["telegram"])).telegram as TelegramStored | undefined;
    return t?.token ? t : null;
  } catch {
    return null;
  }
}

export async function telegramConfig(): Promise<{ token: string; chatId: string; source: "env" | "admin" } | null> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) return { token: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID, source: "env" };
  const t = await telegramStored();
  return t?.chatId ? { token: t.token, chatId: t.chatId, source: "admin" } : null;
}

/** Calls the Telegram Bot API. Returns the result, or null on any failure. */
export async function telegram<T = unknown>(token: string, method: string, body?: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}), cache: "no-store",
    });
    const j = await r.json();
    return j.ok ? (j.result as T) : null;
  } catch {
    return null;
  }
}

/** Sends a message to the artist's Telegram (and the JSON webhook if given). True if anything got through. */
export async function notify(text: string, webhook?: Record<string, unknown>) {
  const jobs: Promise<boolean>[] = [];
  const tg = await telegramConfig();
  if (tg) jobs.push(telegram(tg.token, "sendMessage", { chat_id: tg.chatId, text, disable_web_page_preview: true }).then((r) => r !== null));
  const { ORDER_WEBHOOK_URL } = process.env;
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
