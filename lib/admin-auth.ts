// Server-side half of admin auth: the password and the per-request session check.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { readSession, sessionSecret, SESSION_COOKIE } from "./auth";

type Stored = { hash: string; salt: string; ver: number };

async function stored(): Promise<Stored | null> {
  try {
    const db = await getDb();
    return ((await db.getConfig(["admin"])).admin as Stored | undefined) ?? null;
  } catch {
    return null;
  }
}

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Where the password comes from: set in the admin, ADMIN_PASSWORD, or "admin" in local development. */
export async function passwordSource(): Promise<"stored" | "env" | "dev" | "none"> {
  if (!sessionSecret()) return "none";
  if (await stored()) return "stored";
  if (process.env.ADMIN_PASSWORD) return "env";
  return process.env.NODE_ENV === "development" ? "dev" : "none";
}

export async function checkPassword(pw: string): Promise<{ ok: boolean; ver: number }> {
  const s = await stored();
  if (s) {
    const h = scryptSync(pw, Buffer.from(s.salt, "hex"), 32);
    return { ok: timingSafeEqual(h, Buffer.from(s.hash, "hex")), ver: s.ver };
  }
  const expected = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "development" ? "admin" : "");
  if (!expected) return { ok: false, ver: 0 };
  return { ok: timingSafeEqual(sha(pw), sha(expected)), ver: 0 };
}

/** Saves a new password; bumping the version signs out every other device. */
export async function setPassword(pw: string) {
  const s = await stored();
  const salt = randomBytes(16);
  const next: Stored = { hash: scryptSync(pw, salt, 32).toString("hex"), salt: salt.toString("hex"), ver: (s?.ver ?? 0) + 1 };
  const db = await getDb();
  await db.setConfig("admin", next);
  return next.ver;
}

export async function isAdmin() {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return false;
  return session.ver === ((await stored())?.ver ?? 0);
}

/** For pages: bounce to the login screen. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** For server actions and API routes. */
export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Your session has expired — log in again.");
}
