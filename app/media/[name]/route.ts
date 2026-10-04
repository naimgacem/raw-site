import fs from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "@/lib/db/file";

/** Serves photos uploaded in local development (.data/media). In production they live on Supabase Storage. */
export const runtime = "nodejs";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".avif": "image/avif" };

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = path.basename(params.name);
  try {
    const data = await fs.readFile(path.join(MEDIA_DIR, name));
    return new Response(data, {
      headers: { "Content-Type": TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
