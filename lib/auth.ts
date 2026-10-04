// Admin session cookie: "<expiry>.<password version>.<HMAC>". Uses Web Crypto so it also runs in middleware.

export const SESSION_COOKIE = "raw_admin";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

/** The signing key. Falls back to other server-only secrets so a fresh deploy needs one variable fewer. */
export function sessionSecret(): string | null {
  const s = process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.ADMIN_PASSWORD;
  if (s) return s;
  return process.env.NODE_ENV === "development" ? "raw-dev-only-secret" : null;
}

function b64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function createSession(ver: number) {
  const secret = sessionSecret();
  if (!secret) throw new Error("No session secret configured");
  const body = `${Date.now() + SESSION_DAYS * 864e5}.${ver}`;
  return `${body}.${await sign(body, secret)}`;
}

export async function readSession(token: string | undefined): Promise<{ exp: number; ver: number } | null> {
  const secret = sessionSecret();
  if (!token || !secret) return null;
  const [exp, ver, sig] = token.split(".");
  if (!exp || !ver || !sig || Number(exp) < Date.now()) return null;
  if (!same(sig, await sign(`${exp}.${ver}`, secret))) return null;
  return { exp: Number(exp), ver: Number(ver) };
}
