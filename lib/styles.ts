/**
 * The starting service menu — edited from /admin → Catalog → Styles once the site is live.
 * `from` is the starting price; each option choice adds `add` to it.
 * `render` is a file in /public/renders (made by `npm run render`) or an uploaded photo.
 */
import type { Category, HairStyle, Note, StyleOption } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "braids", label: "Braids" },
  { id: "twists", label: "Twists" },
  { id: "art", label: "Art" },
];

const LENGTH: StyleOption = {
  label: "Length",
  choices: [
    { label: "Shoulder", add: 0 },
    { label: "Mid-back", add: 1000 },
    { label: "Waist", add: 2000 },
  ],
};
const SIZE: StyleOption = {
  label: "Size",
  choices: [
    { label: "Large", add: 0 },
    { label: "Medium", add: 1000 },
    { label: "Small", add: 2500 },
  ],
};

export const DEFAULT_STYLES: HairStyle[] = [
  {
    slug: "art",
    name: "Custom Art",
    category: "art",
    render: "/renders/art.webp",
    from: 4000,
    duration: "3–4h",
    tag: "Signature",
    blurb: "One-of-one patterns. Zigzags, curves, colour.",
    description:
      "The RAW signature. Bring an idea or let the artist design it on the spot — geometric parts, zigzags, curves and colour braids woven into a style nobody else is wearing.",
    options: [
      { label: "Design", choices: [{ label: "Clean", add: 0 }, { label: "Detailed", add: 1000 }, { label: "Masterpiece", add: 2000 }] },
      { label: "Colour braids", choices: [{ label: "None", add: 0 }, { label: "Add colour", add: 800 }] },
    ],
    includes: ["Design consultation", "Edges laid", "Shine & hold spray"],
  },
  {
    slug: "knotless",
    name: "Knotless Braids",
    category: "braids",
    render: "/renders/knotless.webp",
    from: 7000,
    duration: "4–6h",
    tag: "Popular",
    blurb: "Light, flat roots. No tension, all crown.",
    description:
      "Feed-in knotless braids that start with your own hair for a flat, natural root — lighter on the scalp and longer lasting. Peekaboo colour on request.",
    options: [SIZE, LENGTH],
    includes: ["Braiding hair", "Hot-water sealed ends", "Edges laid"],
  },
  {
    slug: "cornrows",
    name: "Cornrows",
    category: "braids",
    render: "/renders/cornrows.webp",
    from: 2000,
    duration: "1–2h",
    blurb: "Clean straight-backs, sharp parts.",
    description:
      "Classic straight-back cornrows with razor-clean parts. On your natural hair or with extensions for length and volume.",
    options: [
      { label: "Rows", choices: [{ label: "6–8", add: 0 }, { label: "10–12", add: 500 }, { label: "14+", add: 1000 }] },
      { label: "Hair", choices: [{ label: "Natural", add: 0 }, { label: "Extensions", add: 1500 }] },
    ],
    includes: ["Edges laid", "Shine spray"],
  },
  {
    slug: "barrel",
    name: "Barrel Twists",
    category: "twists",
    render: "/renders/barrel.webp",
    from: 3000,
    duration: "2–3h",
    tag: "Signature",
    blurb: "Chunky rope twists on locs.",
    description:
      "Locs twisted together into thick, rope-like barrels — clean, bold and built to last. Worn down or styled up.",
    options: [
      { label: "Size", choices: [{ label: "Chunky", add: 0 }, { label: "Medium", add: 800 }] },
      { label: "Finish", choices: [{ label: "Down", add: 0 }, { label: "Styled up", add: 500 }] },
    ],
    includes: ["Retwist", "Scalp oil", "Edges laid"],
  },
  {
    slug: "box",
    name: "Box Braids",
    category: "braids",
    render: "/renders/box.webp",
    from: 6000,
    duration: "4–6h",
    blurb: "Defined square parts, timeless swing.",
    description: "Classic box braids with crisp square parts. Pick your size and length — sealed ends, clean finish.",
    options: [SIZE, LENGTH],
    includes: ["Braiding hair", "Sealed ends"],
  },
  {
    slug: "fulani",
    name: "Fulani Braids",
    category: "braids",
    render: "/renders/fulani.webp",
    from: 6500,
    duration: "4–5h",
    blurb: "Cornrows into braids, finished with gold.",
    description:
      "Tribal-inspired cornrows flowing into long braids, finished with gold beads and cuffs. Statement, heritage, crown.",
    options: [LENGTH, { label: "Beads", choices: [{ label: "None", add: 0 }, { label: "Gold beads", add: 500 }] }],
    includes: ["Braiding hair", "Beads on request"],
  },
  {
    slug: "twists",
    name: "Two-Strand Twists",
    category: "twists",
    render: "/renders/twists.webp",
    from: 3500,
    duration: "2–4h",
    blurb: "Soft, defined, low-maintenance.",
    description: "Two-strand twists on natural hair or with extensions. Defined, soft and easy to live in.",
    options: [
      { label: "Hair", choices: [{ label: "Natural", add: 0 }, { label: "Extensions", add: 2000 }] },
      SIZE,
    ],
    includes: ["Twisting cream", "Edges laid"],
  },
  {
    slug: "freestyle",
    name: "Freestyle Cornrows",
    category: "art",
    render: "/renders/freestyle.webp",
    from: 3000,
    duration: "2–3h",
    tag: "New",
    blurb: "Waves and curves — no two the same.",
    description: "Flowing, curved cornrows freestyled to your head shape. Pure movement, zero templates.",
    options: [
      { label: "Design", choices: [{ label: "Simple", add: 0 }, { label: "Detailed", add: 1000 }] },
      { label: "Hair", choices: [{ label: "Natural", add: 0 }, { label: "Extensions", add: 1500 }] },
    ],
    includes: ["Edges laid", "Shine spray"],
  },
];

export const DEFAULT_NOTES: Note[] = [
  { title: "Mobile service", text: "RAW travels to you. A small travel fee may apply depending on your area." },
  { title: "Come ready", text: "Hair washed, fully dry and detangled. Extra time for detangling may be charged." },
  { title: "Deposit", text: "A deposit secures your slot and goes toward the final price." },
  { title: "Prices", text: "Prices are starting points — the final quote depends on size, length and design." },
];
