"use server";

// Every change the admin can make. Each action re-checks the session, validates, saves, and refreshes
// the admin pages (and the public site when the catalog changed).
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, DbError } from "@/lib/db";
import { getCatalogFresh, saveCatalog } from "@/lib/catalog";
import { assertAdmin, checkPassword, passwordSource, setPassword } from "@/lib/admin-auth";
import { createSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { normalizePhone, WILAYA_LIST } from "@/lib/algeria";
import { notify, telegramReady } from "@/lib/server";
import { slugify } from "@/lib/site";
import type {
  Booking, BookingStatus, Category, Collection, Coupon, Delivery, HairStyle, MediaItem, NewBooking, NewOrder, Note, Order, OrderLine, OrderStatus, Product, Settings,
} from "@/lib/types";

type Ok<T> = { ok: true } & T;
export type Result<T extends object = object> = Ok<T> | { ok: false; error: string };

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg);
};

async function run<T extends object>(fn: () => Promise<T | void>): Promise<Result<T>> {
  try {
    await assertAdmin();
    const out = (await fn()) ?? ({} as T);
    revalidatePath("/admin", "layout");
    return { ok: true, ...out };
  } catch (e) {
    const msg = e instanceof Invalid || e instanceof DbError ? e.message : e instanceof Error ? e.message : "Something went wrong";
    if (!(e instanceof Invalid)) console.error("[admin]", e);
    return { ok: false, error: msg };
  }
}

const now = () => new Date().toISOString();
const log = (text: string) => ({ at: now(), text });
const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, min = 0, max = 99_999_999) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

/* ================================================================ auth */
export async function login(_: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const pw = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const ip = headers().get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const db = await getDb();
  if (!(await db.hit(`login:${ip}`, 8, 900))) return { error: "Too many tries. Wait 15 minutes, then try again." };
  if ((await passwordSource()) === "none") return { error: "Login isn’t set up yet — add ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy." };
  const { ok, ver } = await checkPassword(pw);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: "That password isn’t right." };
  }
  await startSession(ver);
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

async function startSession(ver: number) {
  cookies().set(SESSION_COOKIE, await createSession(ver), {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86400,
  });
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function changePassword(current: string, next: string) {
  return run(async () => {
    if (!(await checkPassword(current)).ok) fail("Your current password isn’t right.");
    if (next.length < 8) fail("Use at least 8 characters.");
    const ver = await setPassword(next);
    await startSession(ver); // this phone stays signed in, every other device is signed out
  });
}

/* ============================================================== orders */
const ORDER_LABEL: Record<OrderStatus, string> = { new: "New", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", returned: "Returned", cancelled: "Cancelled" };

async function order(id: number) {
  const db = await getDb();
  return (await db.getOrder(id)) ?? fail("This order no longer exists.");
}

export async function setOrderStatus(id: number, status: OrderStatus, tracking?: string) {
  return run(async () => {
    if (!(status in ORDER_LABEL)) fail("Unknown status");
    const o = await order(id);
    const db = await getDb();
    const patch: Partial<NewOrder> = { status, history: [...o.history, log(`Marked ${ORDER_LABEL[status].toLowerCase()}`)] };
    if (tracking !== undefined) patch.tracking = str(tracking, 80);
    await db.updateOrder(id, patch);
  });
}

export async function orderNoAnswer(id: number) {
  return run(async () => {
    const o = await order(id);
    const db = await getDb();
    const n = o.attempts + 1;
    await db.updateOrder(id, { attempts: n, history: [...o.history, log(`Called — no answer (${n})`)] });
    return { attempts: n };
  });
}

export async function updateOrderInfo(id: number, patch: { adminNote?: string; tracking?: string }) {
  return run(async () => {
    const db = await getDb();
    const clean: Partial<NewOrder> = {};
    if (patch.adminNote !== undefined) clean.adminNote = str(patch.adminNote, 2000);
    if (patch.tracking !== undefined) clean.tracking = str(patch.tracking, 80);
    await db.updateOrder(id, clean);
  });
}

export type OrderInput = {
  name: string; phone: string; wilaya: string; commune: string; address: string; delivery: "home" | "desk"; note: string;
  items: OrderLine[]; shipping: number; discount: number; status: OrderStatus; source: string;
};

export async function saveOrder(input: OrderInput, id?: number) {
  return run(async () => {
    const name = str(input.name, 80);
    if (name.length < 2) fail("Add the customer’s name.");
    const phone = normalizePhone(input.phone) ?? str(input.phone, 20);
    if (phone.replace(/\D/g, "").length < 6) fail("Add a phone number.");
    if (!WILAYA_LIST.some((w) => w.code === input.wilaya)) fail("Pick a wilaya.");
    const items = (input.items ?? [])
      .filter((l) => l.name && l.qty > 0)
      .slice(0, 40)
      .map((l) => ({ slug: str(l.slug, 80), variant: str(l.variant, 80), name: str(l.name, 120), variantName: str(l.variantName, 80), image: str(l.image, 500), price: int(l.price), qty: int(l.qty, 1, 99) }));
    if (items.length === 0) fail("Add at least one product.");
    const subtotal = items.reduce((n, l) => n + l.price * l.qty, 0);
    const discount = Math.min(subtotal, int(input.discount));
    const shipping = int(input.shipping);
    const fields = {
      name, phone, wilaya: input.wilaya, commune: str(input.commune, 80), address: str(input.address, 200), delivery: input.delivery === "desk" ? ("desk" as const) : ("home" as const),
      note: str(input.note, 300), items, subtotal, shipping, discount, total: subtotal - discount + shipping,
    };
    const db = await getDb();
    if (id) {
      const o = await order(id);
      await db.updateOrder(id, { ...fields, history: [...o.history, log("Order edited")] });
      return { id };
    }
    const status = input.status in ORDER_LABEL ? input.status : "confirmed";
    const created = await db.createOrder({
      ...fields, status, source: str(input.source, 20) || "instagram", coupon: "", attempts: 0, tracking: "", adminNote: "", flag: "",
      history: [log(`Added by you (${str(input.source, 20) || "instagram"})`)],
    });
    return { id: created.id };
  });
}

export async function deleteOrder(id: number) {
  return run(async () => {
    const db = await getDb();
    await db.deleteOrder(id);
  });
}

/* ============================================================ bookings */
const BOOKING_LABEL: Record<BookingStatus, string> = { new: "Request", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled", noshow: "No-show" };

async function booking(id: number) {
  const db = await getDb();
  return (await db.getBooking(id)) ?? fail("This booking no longer exists.");
}

export async function setBookingStatus(id: number, status: BookingStatus) {
  return run(async () => {
    if (!(status in BOOKING_LABEL)) fail("Unknown status");
    const b = await booking(id);
    if (status === "confirmed" && !b.date) fail("Set the date first.");
    const db = await getDb();
    await db.updateBooking(id, { status, history: [...b.history, log(`Marked ${BOOKING_LABEL[status].toLowerCase()}`)] });
  });
}

export type BookingInput = {
  style: string; styleName: string; picks: Record<string, string>; estimate: number; date: string | null; time: string; area: string;
  name: string; phone: string; instagram: string; price: number | null; deposit: number; note: string; adminNote: string; status: BookingStatus;
};

function cleanBooking(input: Partial<BookingInput>): Partial<NewBooking> {
  const out: Partial<NewBooking> = {};
  if (input.style !== undefined) out.style = str(input.style, 80);
  if (input.styleName !== undefined) out.styleName = str(input.styleName, 120);
  if (input.picks !== undefined) out.picks = Object.fromEntries(Object.entries(input.picks).slice(0, 12).map(([k, v]) => [str(k, 60), str(v, 80)]));
  if (input.estimate !== undefined) out.estimate = int(input.estimate);
  if (input.date !== undefined) out.date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  if (input.time !== undefined) out.time = str(input.time, 20);
  if (input.area !== undefined) out.area = str(input.area, 80);
  if (input.name !== undefined) out.name = str(input.name, 80);
  if (input.phone !== undefined) out.phone = normalizePhone(input.phone) ?? str(input.phone, 20);
  if (input.instagram !== undefined) out.instagram = str(input.instagram, 40).replace(/^@+/, "");
  if (input.price !== undefined) out.price = input.price === null ? null : int(input.price);
  if (input.deposit !== undefined) out.deposit = int(input.deposit);
  if (input.note !== undefined) out.note = str(input.note, 500);
  if (input.adminNote !== undefined) out.adminNote = str(input.adminNote, 2000);
  return out;
}

export async function updateBooking(id: number, patch: Partial<BookingInput>) {
  return run(async () => {
    const b = await booking(id);
    const db = await getDb();
    const clean = cleanBooking(patch);
    const moved = clean.date !== undefined && (clean.date !== b.date || (clean.time ?? b.time) !== b.time) && b.status === "confirmed";
    await db.updateBooking(id, moved ? { ...clean, history: [...b.history, log(`Moved to ${clean.date ?? "no date"} ${clean.time ?? b.time}`.trim())] } : clean);
  });
}

export async function createBooking(input: BookingInput) {
  return run(async () => {
    const clean = cleanBooking(input);
    if (!clean.styleName) fail("Pick a style.");
    if (!clean.name && !clean.phone && !clean.instagram) fail("Add the client’s name, phone or Instagram.");
    const status: BookingStatus = input.status === "new" ? "new" : clean.date ? "confirmed" : "new";
    const db = await getDb();
    const b = await db.createBooking({
      status, source: "manual", style: "", styleName: "", picks: {}, estimate: 0, date: null, time: "", area: "", name: "", phone: "", instagram: "",
      price: null, deposit: 0, note: "", adminNote: "", ...clean, history: [log("Added by you")],
    } as NewBooking);
    return { id: b.id };
  });
}

export async function deleteBooking(id: number) {
  return run(async () => {
    const db = await getDb();
    await db.deleteBooking(id);
  });
}

/* ============================================================= catalog */
const TAGS_P = ["", "New", "Sale", "Bestseller"];
const TAGS_S = ["", "Signature", "Popular", "New"];

function cleanProduct(p: Product, collections: Collection[]): Product {
  const name = str(p.name, 80);
  if (!name) fail("Give the product a name.");
  const slug = slugify(p.slug || name) || fail("The web address can’t be empty.");
  if (!collections.some((c) => c.id === p.collection)) fail("Pick a collection.");
  const price = int(p.price);
  if (price <= 0) fail("Set a price.");
  const compareAt = p.compareAt ? int(p.compareAt) : 0;
  const ids = new Set<string>();
  const variants = (p.variants ?? []).slice(0, 20).map((v, i) => {
    let id = slugify(v.id || v.name) || `v${i + 1}`;
    while (ids.has(id)) id += "-2";
    ids.add(id);
    return { id, name: str(v.name, 60) || `Option ${i + 1}`, swatch: /^#[0-9a-f]{6}$/i.test(v.swatch) ? v.swatch : "#6a14d0", image: str(v.image, 600), soldOut: !!v.soldOut };
  });
  if (variants.length === 0) fail("Add at least one photo / colour.");
  if (variants.some((v) => !v.image)) fail("Every colour needs a photo.");
  return {
    slug, name, collection: p.collection, price, ...(compareAt > price ? { compareAt } : {}),
    tag: TAGS_P.includes(p.tag ?? "") ? p.tag || undefined : undefined,
    blurb: str(p.blurb, 120), description: str(p.description, 2000),
    details: (p.details ?? []).map((x) => str(x, 160)).filter(Boolean).slice(0, 20),
    care: (p.care ?? []).map((x) => str(x, 160)).filter(Boolean).slice(0, 20),
    variants, hidden: !!p.hidden, soldOut: !!p.soldOut,
  };
}

export async function saveProduct(input: Product, original?: string) {
  return run(async () => {
    const cat = await getCatalogFresh();
    const p = cleanProduct(input, cat.collections);
    if (cat.products.some((x) => x.slug === p.slug && x.slug !== original)) fail(`Another product already uses “${p.slug}”. Change the name or web address.`);
    const list = original && cat.products.some((x) => x.slug === original) ? cat.products.map((x) => (x.slug === original ? p : x)) : [p, ...cat.products];
    await saveCatalog("products", list);
    return { slug: p.slug, product: p };
  });
}

export async function patchProduct(slug: string, patch: { hidden?: boolean; soldOut?: boolean }) {
  return run(async () => {
    const cat = await getCatalogFresh();
    await saveCatalog("products", cat.products.map((p) => (p.slug === slug ? { ...p, ...(patch.hidden !== undefined && { hidden: patch.hidden }), ...(patch.soldOut !== undefined && { soldOut: patch.soldOut }) } : p)));
  });
}

export async function deleteProduct(slug: string) {
  return run(async () => {
    const cat = await getCatalogFresh();
    await saveCatalog("products", cat.products.filter((p) => p.slug !== slug));
  });
}

export async function reorderProducts(slugs: string[]) {
  return run(async () => {
    const cat = await getCatalogFresh();
    const pos = new Map(slugs.map((s, i) => [s, i]));
    await saveCatalog("products", [...cat.products].sort((a, b) => (pos.get(a.slug) ?? 999) - (pos.get(b.slug) ?? 999)));
  });
}

function cleanStyle(s: HairStyle, categories: Category[]): HairStyle {
  const name = str(s.name, 80);
  if (!name) fail("Give the style a name.");
  const slug = slugify(s.slug || name) || fail("The web address can’t be empty.");
  if (!categories.some((c) => c.id === s.category)) fail("Pick a category.");
  if (!s.render) fail("Add a photo.");
  const options = (s.options ?? [])
    .map((o) => ({
      label: str(o.label, 40),
      choices: (o.choices ?? []).map((c) => ({ label: str(c.label, 40), add: int(c.add) })).filter((c) => c.label).slice(0, 12),
    }))
    .filter((o) => o.label && o.choices.length > 0)
    .slice(0, 8);
  return {
    slug, name, category: s.category, render: str(s.render, 600), from: int(s.from), duration: str(s.duration, 30),
    tag: TAGS_S.includes(s.tag ?? "") ? s.tag || undefined : undefined,
    blurb: str(s.blurb, 120), description: str(s.description, 2000), options,
    includes: (s.includes ?? []).map((x) => str(x, 120)).filter(Boolean).slice(0, 20),
    hidden: !!s.hidden,
  };
}

export async function saveStyle(input: HairStyle, original?: string) {
  return run(async () => {
    const cat = await getCatalogFresh();
    const s = cleanStyle(input, cat.categories);
    if (cat.styles.some((x) => x.slug === s.slug && x.slug !== original)) fail(`Another style already uses “${s.slug}”.`);
    const list = original && cat.styles.some((x) => x.slug === original) ? cat.styles.map((x) => (x.slug === original ? s : x)) : [...cat.styles, s];
    await saveCatalog("styles", list);
    return { slug: s.slug, style: s };
  });
}

export async function patchStyle(slug: string, patch: { hidden?: boolean }) {
  return run(async () => {
    const cat = await getCatalogFresh();
    await saveCatalog("styles", cat.styles.map((s) => (s.slug === slug ? { ...s, hidden: !!patch.hidden } : s)));
  });
}

export async function deleteStyle(slug: string) {
  return run(async () => {
    const cat = await getCatalogFresh();
    await saveCatalog("styles", cat.styles.filter((s) => s.slug !== slug));
  });
}

export async function reorderStyles(slugs: string[]) {
  return run(async () => {
    const cat = await getCatalogFresh();
    const pos = new Map(slugs.map((s, i) => [s, i]));
    await saveCatalog("styles", [...cat.styles].sort((a, b) => (pos.get(a.slug) ?? 999) - (pos.get(b.slug) ?? 999)));
  });
}

export async function saveGroups(collections: Collection[], categories: Category[]) {
  return run(async () => {
    const cat = await getCatalogFresh();
    const cols = collections.map((c) => ({ id: c.id || slugify(c.name), name: str(c.name, 40), line: str(c.line, 60), image: str(c.image, 600) }));
    const cats = categories.map((c) => ({ id: c.id || slugify(c.label), label: str(c.label, 40) }));
    if (cols.some((c) => !c.name || !c.id) || cats.some((c) => !c.label || !c.id)) fail("Every group needs a name.");
    if (new Set(cols.map((c) => c.id)).size !== cols.length || new Set(cats.map((c) => c.id)).size !== cats.length) fail("Two groups have the same name.");
    if (cols.some((c) => !c.image)) fail("Every collection needs a cover photo.");
    const orphanP = cat.products.filter((p) => !cols.some((c) => c.id === p.collection));
    if (orphanP.length) fail(`Move ${orphanP.map((p) => p.name).join(", ")} to another collection first.`);
    const orphanS = cat.styles.filter((s) => !cats.some((c) => c.id === s.category));
    if (orphanS.length) fail(`Move ${orphanS.map((s) => s.name).join(", ")} to another category first.`);
    await saveCatalog("collections", cols);
    await saveCatalog("categories", cats);
  });
}

/* ============================================================ delivery */
export async function saveDelivery(d: Delivery) {
  return run(async () => {
    const zones = d.zones.map((z) => ({ id: z.id || slugify(z.name), name: str(z.name, 30), home: int(z.home), desk: z.desk === null ? null : int(z.desk) }));
    if (zones.length === 0) fail("Keep at least one zone.");
    if (zones.some((z) => !z.name)) fail("Every zone needs a name.");
    const rules = Object.fromEntries(
      WILAYA_LIST.map((w) => {
        const r = d.rules[w.code] ?? { zone: zones[0].id };
        const zone = zones.some((z) => z.id === r.zone) ? r.zone : zones[0].id;
        return [w.code, { zone, ...(r.custom ? { custom: { home: int(r.custom.home), desk: r.custom.desk === null ? null : int(r.custom.desk) } } : {}), ...(r.off ? { off: true } : {}) }];
      })
    );
    await saveCatalog("delivery", { zones, rules, freeOver: int(d.freeOver) });
  });
}

/* ============================================================ settings */
export async function saveSettings(s: Settings, notes: Note[]) {
  return run(async () => {
    const clean: Settings = {
      tagline: str(s.tagline, 80),
      instagramHandle: str(s.instagramHandle, 40).replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""),
      whatsapp: str(s.whatsapp, 20).replace(/\D/g, "").replace(/^0(?=[567])/, "213"),
      email: str(s.email, 120),
      serviceArea: str(s.serviceArea, 80),
      newsletterEndpoint: str(s.newsletterEndpoint, 300),
      announcements: (s.announcements ?? []).map((x) => str(x, 60)).filter(Boolean).slice(0, 12),
      ordersOpen: !!s.ordersOpen,
      closedMessage: str(s.closedMessage, 240),
      bookingsOpen: !!s.bookingsOpen,
    };
    if (!clean.instagramHandle) fail("Add your Instagram username.");
    if (clean.email && !/^\S+@\S+\.\S+$/.test(clean.email)) fail("That email address doesn’t look right.");
    await saveCatalog("settings", clean);
    await saveCatalog("notes", (notes ?? []).map((n) => ({ title: str(n.title, 40), text: str(n.text, 240) })).filter((n) => n.title || n.text).slice(0, 8));
  });
}

/** quick switches from the home screen */
export async function setShopOpen(patch: { ordersOpen?: boolean; bookingsOpen?: boolean }) {
  return run(async () => {
    const cat = await getCatalogFresh();
    await saveCatalog("settings", { ...cat.settings, ...patch });
  });
}

export async function sendTestMessage() {
  return run(async () => {
    if (!telegramReady()) fail("Telegram isn’t set up yet — add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel.");
    if (!(await notify("✅ RAW admin — Telegram works. New orders and booking requests will arrive here."))) fail("Telegram refused the message — check the token and chat id.");
  });
}

/* ============================================================= coupons */
export async function saveCoupon(c: Coupon, previous?: string) {
  return run(async () => {
    const code = str(c.code, 30).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) fail("Codes use letters and numbers only (2–30).");
    const value = int(c.value);
    if (value <= 0) fail("Set the discount.");
    if (c.type === "percent" && value > 100) fail("A percentage can’t be over 100.");
    const db = await getDb();
    const existing = previous ? await db.getCoupon(previous) : await db.getCoupon(code);
    if (!previous && existing) fail(`${code} already exists.`);
    await db.saveCoupon(
      {
        code, type: c.type === "fixed" ? "fixed" : "percent", value, active: !!c.active, minOrder: int(c.minOrder),
        maxUses: c.maxUses === null || c.maxUses === undefined || Number(c.maxUses) <= 0 ? null : int(c.maxUses, 1),
        uses: existing?.uses ?? 0, expires: c.expires && /^\d{4}-\d{2}-\d{2}$/.test(c.expires) ? c.expires : null,
      },
      previous
    );
  });
}

export async function setCouponActive(code: string, active: boolean) {
  return run(async () => {
    const db = await getDb();
    const c = (await db.getCoupon(code)) ?? fail("This code no longer exists.");
    await db.saveCoupon({ ...c, active }, code);
  });
}

export async function deleteCoupon(code: string) {
  return run(async () => {
    const db = await getDb();
    await db.deleteCoupon(code);
  });
}

/* =========================================================== customers */
export async function setBlocked(phone: string, blocked: boolean) {
  return run(async () => {
    const db = await getDb();
    const list = (((await db.getConfig(["blocked"])).blocked as string[] | undefined) ?? []).filter((p) => p !== phone);
    await db.setConfig("blocked", blocked ? [...list, phone] : list);
  });
}

/* =============================================================== media */
export async function listMedia() {
  return run(async () => {
    const db = await getDb();
    return { items: (await db.listMedia()) as MediaItem[] };
  });
}

export async function deleteMedia(name: string) {
  return run(async () => {
    const db = await getDb();
    await db.deleteMedia(name);
  });
}

export type { Order, Booking };
