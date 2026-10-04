import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { passwordSource } from "@/lib/admin-auth";
import { telegramReady } from "@/lib/server";
import SettingsView from "@/components/admin/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [cat, db, pw] = await Promise.all([getCatalogFresh(), getDb(), passwordSource()]);
  // a real round-trip, so "connected" also means the tables exist
  const dbError = await db.ping().then(() => "", (e: unknown) => (e instanceof Error ? e.message : "Database error"));
  return (
    <SettingsView
      settings={cat.settings}
      notes={cat.notes}
      status={{ db: db.kind, dbError, telegram: telegramReady(), webhook: Boolean(process.env.ORDER_WEBHOOK_URL), password: pw }}
    />
  );
}
