/**
 * The shop. Prices (DA) are PLACEHOLDERS until the artist confirms them.
 * Images are 3D renders in /public/renders — swap for product photos any time.
 */
export type Variant = { id: string; name: string; swatch: string; image: string };

export type Product = {
  slug: string;
  name: string;
  collection: CollectionId;
  price: number;
  compareAt?: number;
  tag?: "New" | "Sale" | "Bestseller";
  blurb: string;
  description: string;
  details: string[];
  care: string[];
  variants: Variant[];
};

export type CollectionId = "durags" | "bonnets" | "hair-care" | "accessories";

export const COLLECTIONS: { id: CollectionId; name: string; image: string; line: string }[] = [
  { id: "durags", name: "Durags", image: "/renders/durag-royal.webp", line: "Silk & velvet" },
  { id: "bonnets", name: "Bonnets", image: "/renders/bonnet.webp", line: "Protect the work" },
  { id: "hair-care", name: "Hair Care", image: "/renders/crown-oil.webp", line: "Oils & tools" },
  { id: "accessories", name: "Accessories", image: "/renders/cuffs.webp", line: "Cuffs & beads" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "silky-durag",
    name: "Silky Durag",
    collection: "durags",
    price: 1400,
    compareAt: 1900,
    tag: "Sale",
    blurb: "Long tails, centre seam, zero frizz.",
    description:
      "A high-shine silky durag cut for braids, waves and twists. Extra-long tails, outside centre seam so your pattern stays clean, and a soft band that won't leave a line.",
    details: ["Silky satin weave", "Outside centre seam", "Extra-long tails", "One size fits most"],
    care: ["Hand wash cold", "Lay flat to dry", "Cool iron, inside out"],
    variants: [
      { id: "royal", name: "Royal Purple", swatch: "#6a14d0", image: "/renders/durag-royal.webp" },
      { id: "obsidian", name: "Obsidian", swatch: "#121016", image: "/renders/durag-obsidian.webp" },
      { id: "pearl", name: "Pearl", swatch: "#e9e3f2", image: "/renders/durag-pearl.webp" },
    ],
  },
  {
    slug: "velvet-durag",
    name: "Velvet Durag",
    collection: "durags",
    price: 1900,
    tag: "New",
    blurb: "Deep violet velvet. Night-out ready.",
    description:
      "Plush stretch velvet with a satin-lined cap — warm, rich and made to be seen. The RAW midnight colourway.",
    details: ["Stretch velvet outer", "Satin lined", "Extra-long tails"],
    care: ["Hand wash cold", "Do not wring", "Air dry"],
    variants: [{ id: "midnight", name: "Midnight Violet", swatch: "#2c0a5c", image: "/renders/durag-velvet.webp" }],
  },
  {
    slug: "satin-bonnet",
    name: "Satin Bonnet",
    collection: "bonnets",
    price: 1500,
    tag: "Bestseller",
    blurb: "Roomy enough for long braids.",
    description:
      "An oversized satin bonnet that fits knotless, box braids and locs without crushing them. Wide, soft band that stays put all night.",
    details: ["Double-layer satin", "Wide soft band", "Fits long braids & locs"],
    care: ["Hand wash cold", "Air dry"],
    variants: [{ id: "royal", name: "Royal Purple", swatch: "#6a14d0", image: "/renders/bonnet.webp" }],
  },
  {
    slug: "crown-oil",
    name: "Crown Oil",
    collection: "hair-care",
    price: 1800,
    blurb: "Scalp + braid elixir, 50 ml.",
    description:
      "A light scalp oil for braids, twists and locs. Soothes itch, adds shine and keeps your style fresh between appointments.",
    details: ["50 ml dropper bottle", "Lightweight, non-greasy", "For scalp and lengths"],
    care: ["Apply 2–3 drops along parts", "Massage in", "Use 2–3× a week"],
    variants: [{ id: "50ml", name: "50 ml", swatch: "#4c0fa8", image: "/renders/crown-oil.webp" }],
  },
  {
    slug: "edge-brush",
    name: "Edge Brush",
    collection: "hair-care",
    price: 700,
    compareAt: 900,
    tag: "Sale",
    blurb: "Brush one end, comb the other.",
    description: "The tool behind clean edges. Firm bristles to lay, fine-tooth comb to shape. RAW purple, obviously.",
    details: ["Dual-sided", "Firm boar-style bristles", "Fine-tooth comb"],
    care: ["Rinse with warm water", "Air dry bristles down"],
    variants: [{ id: "royal", name: "Royal Purple", swatch: "#6a12c9", image: "/renders/edge-brush.webp" }],
  },
  {
    slug: "crown-cuffs",
    name: "Crown Cuffs",
    collection: "accessories",
    price: 1200,
    blurb: "Set of 7 braid & loc cuffs.",
    description: "Seven adjustable cuffs in gold, violet and silver. Slide onto braids, twists or locs to finish the look.",
    details: ["Set of 7", "Adjustable open cuff", "Gold, violet & silver tones"],
    care: ["Wipe with a dry cloth", "Remove before swimming"],
    variants: [{ id: "mixed", name: "Mixed set", swatch: "#e0b45a", image: "/renders/cuffs.webp" }],
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const getVariant = (p: Product, id?: string) => p.variants.find((v) => v.id === id) ?? p.variants[0];
