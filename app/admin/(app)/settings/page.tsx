import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { passwordSource } from "@/lib/admin-auth";
import { telegramConfig, telegramStored } from "@/lib/server";
import SettingsView from "@/components/admin/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [cat, db, pw] = await Promise.all([getCatalogFresh(), getDb(), passwordSource()]);
  // a real round-trip, so "connected" also means the tables exist
  const dbError = await db.ping().then(() => "", (e: unknown) => (e instanceof Error ? e.message : "Database error"));
  const [tg, tgStored] = await Promise.all([telegramConfig(), telegramStored()]);
  // never send the token to the page — only what the setup needs to show
  const telegram = { source: tg?.source ?? null, bot: tgStored?.bot ?? "", chat: tgStored?.chat ?? "" };
  return (
    <SettingsView
      settings={cat.settings}
      notes={cat.notes}
      status={{ db: db.kind, dbError, telegram, webhook: Boolean(process.env.ORDER_WEBHOOK_URL), password: pw }}
    />
  );
}
