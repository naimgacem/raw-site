import type { Metadata } from "next";
import { Suspense } from "react";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Shop — durags, bonnets & hair care",
  description: "Silky and velvet durags, satin bonnets, Crown Oil, edge brushes and braid cuffs by RAW — Royal Art Weaves.",
};

export default function ShopPage() {
  return (
    <>
      <header className="relative overflow-hidden px-4 pb-6 pt-10 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(151,31,244,0.35),transparent)]" />
        <p className="eyebrow relative">Made to protect the work</p>
        <h1 className="relative mt-3 font-display text-[3rem] uppercase leading-[0.9]">The shop</h1>
      </header>
      <Suspense fallback={<div className="h-96" />}>
        <ShopGrid />
      </Suspense>
    </>
  );
}
