// The live catalog: what the admin saved, falling back to the starting data in lib/*.ts. Server-only.
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb, DbError } from "./db";
import { DEFAULT_SETTINGS } from "./site";
import { DEFAULT_CATEGORIES, DEFAULT_NOTES, DEFAULT_STYLES } from "./styles";
import { DEFAULT_COLLECTIONS, DEFAULT_PRODUCTS } from "./products";
import { DEFAULT_DELIVERY, resolveWilayas } from "./algeria";
import type { Catalog, PublicCatalog } from "./types";

export const CATALOG_KEYS = ["settings", "styles", "categories", "products", "collections", "notes", "delivery"] as const;
export type CatalogKey = (typeof CATALOG_KEYS)[number];

export const SEED: Catalog = {
  settings: DEFAULT_SETTINGS,
  styles: DEFAULT_STYLES,
  categories: DEFAULT_CATEGORIES,
  products: DEFAULT_PRODUCTS,
  collections: DEFAULT_COLLECTIONS,
  notes: DEFAULT_NOTES,
  delivery: DEFAULT_DELIVERY,
};

async function read(): Promise<Catalog> {
  const db = await getDb();
  let s: Partial<Catalog> = {};
  try {
    s = (await db.getConfig([...CATALOG_KEYS])) as Partial<Catalog>;
  } catch (e) {
    // tables not created yet → starting data; a real outage throws so a stale page is kept instead
    if (!(e instanceof DbError && /tables are missing/.test(e.message))) throw e;
    console.warn("[catalog]", e.message);
  }
  return {
    settings: { ...SEED.settings, ...(s.settings ?? {}) },
    styles: s.styles ?? SEED.styles,
    categories: s.categories ?? SEED.categories,
    products: s.products ?? SEED.products,
    collections: s.collections ?? SEED.collections,
    notes: s.notes ?? SEED.notes,
    delivery: { ...SEED.delivery, ...(s.delivery ?? {}) },
  };
}

/** cached for the public site; every admin save refreshes it */
export const getCatalog = unstable_cache(read, ["catalog-v1"], { tags: ["catalog"], revalidate: 600 });
/** always straight from the database (admin) */
export const getCatalogFresh = read;

export function toPublic(c: Catalog): PublicCatalog {
  const products = c.products.filter((p) => !p.hidden && p.variants.length > 0);
  const collections = c.collections.filter((x) => products.some((p) => p.collection === x.id));
  const styles = c.styles.filter((x) => !x.hidden);
  const categories = c.categories.filter((x) => styles.some((s) => s.category === x.id));
  return {
    settings: c.settings,
    styles,
    categories,
    products,
    collections,
    notes: c.notes,
    wilayas: resolveWilayas(c.delivery)
      .filter((w) => !w.off)
      .map(({ code, fr, ar, home, desk }) => ({ code, fr, ar, home, desk })),
    freeOver: c.delivery.freeOver,
  };
}

export const getPublicCatalog = async () => toPublic(await getCatalog());

export async function saveCatalog<K extends CatalogKey>(key: K, value: Catalog[K]) {
  const db = await getDb();
  await db.setConfig(key, value);
  revalidateTag("catalog");
}
