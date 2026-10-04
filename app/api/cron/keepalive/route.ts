import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Called once a day by Vercel Cron (vercel.json). Free Supabase projects pause after a week
 * without activity; this tiny query keeps the shop's database awake.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const db = await getDb();
    await db.ping();
    return NextResponse.json({ ok: true, db: db.kind });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
