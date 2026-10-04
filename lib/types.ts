// Shapes shared by the site, the API and the admin. Everything here is plain JSON.

export type DeliveryType = "home" | "desk";

/* ------------------------------------------------------------ catalog */
export type StyleOption = { label: string; choices: { label: string; add: number }[] };

export type HairStyle = {
  slug: string;
  name: string;
  category: string;
  /** image shown on the menu: a /renders/*.webp illustration or an uploaded photo */
  render: string;
  from: number;
  duration: string;
  tag?: string; // "Signature" | "Popular" | "New"
  blurb: string;
  description: string;
  options: StyleOption[];
  includes: string[];
  hidden?: boolean;
};

export type Category = { id: string; label: string };

export type Variant = { id: string; name: string; swatch: string; image: string; soldOut?: boolean };

export type Product = {
  slug: string;
  name: string;
  collection: string;
  price: number;
  compareAt?: number;
  tag?: string; // "New" | "Sale" | "Bestseller"
  blurb: string;
  description: string;
  details: string[];
  care: string[];
  variants: Variant[];
  hidden?: boolean;
  soldOut?: boolean;
};

export type Collection = { id: string; name: string; image: string; line: string };

export type Note = { title: string; text: string };

export type Settings = {
  tagline: string;
  /** without the @ */
  instagramHandle: string;
  /** international, digits only (213…). Empty hides WhatsApp buttons. */
  whatsapp: string;
  email: string;
  serviceArea: string;
  newsletterEndpoint: string;
  announcements: string[];
  ordersOpen: boolean;
  closedMessage: string;
  bookingsOpen: boolean;
};

export type Zone = { id: string; name: string; home: number; desk: number | null };
export type WilayaRule = { zone: string; custom?: { home: number; desk: number | null } | null; off?: boolean };
export type Delivery = { zones: Zone[]; rules: Record<string, WilayaRule>; freeOver: number };
/** a wilaya with its final delivery prices */
export type Wilaya = { code: string; fr: string; ar: string; home: number; desk: number | null };

export type Catalog = {
  settings: Settings;
  styles: HairStyle[];
  categories: Category[];
  products: Product[];
  collections: Collection[];
  notes: Note[];
  delivery: Delivery;
};

/** What the public site receives: hidden items removed, delivery prices resolved. No coupons. */
export type PublicCatalog = {
  settings: Settings;
  styles: HairStyle[];
  categories: Category[];
  products: Product[];
  collections: Collection[];
  notes: Note[];
  wilayas: Wilaya[];
  freeOver: number;
};

/* ------------------------------------------------------------ coupons */
export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  minOrder: number;
  maxUses: number | null;
  uses: number;
  /** YYYY-MM-DD, last valid day */
  expires: string | null;
};
export type CouponInfo = Pick<Coupon, "code" | "type" | "value" | "minOrder">;

/* ------------------------------------------------------------- orders */
export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

/** a snapshot of what was bought, so later catalog edits never change past orders */
export type OrderLine = { slug: string; variant: string; name: string; variantName: string; image: string; price: number; qty: number };

export type HistoryEntry = { at: string; text: string };

export type Order = {
  id: number;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  source: string; // "website" | "instagram" | "phone" | "other"
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  delivery: DeliveryType;
  note: string;
  items: OrderLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  coupon: string;
  total: number;
  attempts: number;
  tracking: string;
  adminNote: string;
  flag: string; // "blocked" when the number is on the block list
  history: HistoryEntry[];
};
export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;

/* ----------------------------------------------------------- bookings */
export type BookingStatus = "new" | "confirmed" | "done" | "cancelled" | "noshow";

export type Booking = {
  id: number;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  source: string;
  style: string;
  styleName: string;
  picks: Record<string, string>;
  estimate: number;
  /** YYYY-MM-DD */
  date: string | null;
  /** "Morning" | "Afternoon" | "Evening" or "14:30" */
  time: string;
  area: string;
  name: string;
  phone: string;
  instagram: string;
  price: number | null;
  deposit: number;
  note: string;
  adminNote: string;
  history: HistoryEntry[];
};
export type NewBooking = Omit<Booking, "id" | "createdAt" | "updatedAt">;

export type MediaItem = { url: string; name: string; size: number; at: string };
