/**
 * Brand + contact settings. Edit here — every page reads from this file.
 */
export const SITE = {
  name: "RAW",
  fullName: "RAW — Royal Art Weaves",
  tagline: "Styled like royalty",
  url: "https://royalartweaves.com",

  instagram: "https://www.instagram.com/royal4rt",
  instagramHandle: "@royal4rt",
  /** Opens a DM thread with the account directly. */
  instagramDM: "https://ig.me/m/royal4rt",
  /** Optional: international number, digits only (e.g. "213555123456"). Empty = WhatsApp buttons hidden. */
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
};

/**
 * Discount codes for the order form. EXAMPLES — change or delete.
 * (They're visible in the page code, so keep them promotional, not secret.)
 */
export const COUPONS: Record<string, { type: "percent" | "fixed"; value: number }> = {
  RAW10: { type: "percent", value: 10 },
  ROYAL: { type: "fixed", value: 300 },
};

const NBSP = String.fromCharCode(0xa0); // keeps "1 400 DA" on one line

/** Algerian dinar: 1 400 DA */
export function price(n: number) {
  const v = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${v}${NBSP}DA`;
}

export function whatsappLink(text: string) {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : "";
}
