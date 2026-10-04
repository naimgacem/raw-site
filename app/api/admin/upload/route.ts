import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin } from "@/lib/admin-auth";

/** Photo upload from the admin. The phone shrinks photos before sending, so they arrive well under the limit. */
export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024;
const OK = ["image/webp", "image/jpeg", "image/png", "image/avif", "image/gif"];

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Your session has expired — log in again." }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No photo received." }, { status: 400 });
  if (!OK.includes(file.type)) return NextResponse.json({ ok: false, error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "That photo is too big (max 4 MB)." }, { status: 413 });
  try {
    const db = await getDb();
    const item = await db.upload(file.name || "photo.webp", Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
