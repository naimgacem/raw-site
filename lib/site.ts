import type { Coupon, Settings } from "./types";

/**
 * Fixed brand facts. Everything the artist may want to change (contact, announcements,
 * prices, products…) lives in the admin at /admin — these are only the starting values.
 */
export const SITE = {
  name: "RAW",
  fullName: "RAW — Royal Art Weaves",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://royalartweaves.com",
};

export const DEFAULT_SETTINGS: Settings = {
  tagline: "Styled like royalty",
  instagramHandle: "royal4rt",
  whatsapp: "",
  email: "",
  /** "Déplacement" — the artist travels to the client. */
  serviceArea: "Mobile service — we come to you",
  /** Optional newsletter endpoint (Formspree, Mailchimp form action…). Empty = local confirmation only. */
  newsletterEndpoint: "",
  announcements: [
    "Styled like royalty",
    "Mobile braider — we come to you",
    "Silky durags just dropped",
    "Cash on delivery — 58 wilayas",
    "DM to book your slot",
  ],
  ordersOpen: true,
  closedMessage: "Orders are paused for a few days — follow us on Instagram for the next drop.",
  bookingsOpen: true,
};

/** Example discount codes, used until the admin saves its own. */
export const DEFAULT_COUPONS: Coupon[] = [
  { code: "RAW10", type: "percent", value: 10, active: true, minOrder: 0, maxUses: null, uses: 0, expires: null },
  { code: "ROYAL", type: "fixed", value: 300, active: true, minOrder: 0, maxUses: null, uses: 0, expires: null },
];

const NBSP = String.fromCharCode(0xa0); // keeps "1 400 DA" on one line

/** Algerian dinar: 1 400 DA */
export function price(n: number) {
  const v = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${v}${NBSP}DA`;
}

export const igHandle = (h: string) => h.replace(/^@+/, "").trim();
export const instagramUrl = (h: string) => `https://www.instagram.com/${igHandle(h)}`;
/** Opens a DM thread with the account directly. */
export const instagramDM = (h: string) => `https://ig.me/m/${igHandle(h)}`;

export function whatsappLink(number: string, text: string) {
  const n = number.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : "";
}

/** Uploaded photos fill their frame; the 3D renders are cut-outs that sit inside it. */
export const fit = (src: string) => (src.startsWith("/renders/") || src.startsWith("/brand/") ? "object-contain" : "object-cover");

/** "Silky Durag!" → "silky-durag" */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
