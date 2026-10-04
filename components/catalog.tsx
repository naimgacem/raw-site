"use client";

import { createContext, useContext } from "react";
import type { PublicCatalog } from "@/lib/types";

// The live catalog (styles, products, prices, settings) handed down from the server layout.
const Ctx = createContext<PublicCatalog | null>(null);

export function CatalogProvider({ value, children }: { value: PublicCatalog; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return c;
}
