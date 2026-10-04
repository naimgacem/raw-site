"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useCatalog } from "./catalog";
import { findVariant } from "@/lib/products";
import type { Product } from "@/lib/types";

export type CartLine = { slug: string; variant: string; qty: number };
type Panel = null | "menu" | "search" | "cart";

type Store = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (slug: string, variant: string, qty?: number) => void;
  setQty: (slug: string, variant: string, qty: number) => void;
  clear: () => void;
  panel: Panel;
  open: (p: Panel) => void;
  close: () => void;
  booking: string | null; // slug of the style being booked
  book: (slug: string | null) => void;
  toast: string | null;
  notify: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = "raw-bag-v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { products } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // the bag survives reloads on this device (products removed since then drop out)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw).filter((l: CartLine) => products.some((p) => p.slug === l.slug)));
    } catch {}
  }, [products]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines]);

  // lock page scroll while any overlay is open
  const locked = panel !== null || booking !== null;
  useEffect(() => {
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }, [locked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanel(null); setBooking(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const add = useCallback((slug: string, variant: string, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.slug === slug && l.variant === variant);
      if (i < 0) return [...ls, { slug, variant, qty }];
      const next = [...ls];
      next[i] = { ...next[i], qty: Math.min(next[i].qty + qty, 20) };
      return next;
    });
  }, []);

  const setQty = useCallback((slug: string, variant: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => !(l.slug === slug && l.variant === variant)) : ls.map((l) => (l.slug === slug && l.variant === variant ? { ...l, qty: Math.min(qty, 20) } : l))));
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const value = useMemo<Store>(() => {
    const live = lines.filter((l) => products.some((p) => p.slug === l.slug));
    const count = live.reduce((n, l) => n + l.qty, 0);
    const subtotal = live.reduce((n, l) => n + (products.find((p) => p.slug === l.slug)?.price ?? 0) * l.qty, 0);
    return {
      lines: live, count, subtotal, add, setQty, clear: () => setLines([]),
      panel, open: (p) => { setBooking(null); setPanel(p); }, close: () => setPanel(null),
      booking, book: (slug) => { setPanel(null); setBooking(slug); },
      toast, notify,
    };
  }, [lines, products, panel, booking, toast, add, setQty, notify]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

export function lineInfo(products: Product[], l: CartLine) {
  const p = products.find((x) => x.slug === l.slug)!;
  return { product: p, variant: findVariant(p, l.variant) };
}
