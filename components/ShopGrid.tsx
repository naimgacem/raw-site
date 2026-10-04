"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { useCatalog } from "./catalog";

export default function ShopGrid() {
  const { products, collections } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const c = params.get("c");
  const active = collections.some((x) => x.id === c) ? c : null;
  const list = active ? products.filter((p) => p.collection === active) : products;
  const go = (id: string | null) => router.replace(id ? `/shop?c=${id}` : "/shop", { scroll: false });

  return (
    <>
      <div className="rail sticky top-[68px] z-30 mb-4 gap-2 bg-abyss/90 py-2.5 backdrop-blur-xl" role="toolbar" aria-label="Collections">
        <button className="chip" aria-pressed={!active} onClick={() => go(null)}>All</button>
        {collections.map((x) => (
          <button key={x.id} className="chip" aria-pressed={active === x.id} onClick={() => go(x.id)}>{x.name}</button>
        ))}
      </div>
      <p className="px-4 pb-3 text-sm text-mute">{list.length} product{list.length === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-16">
        {list.map((p) => <ProductCard key={p.slug} product={p} />)}
      </div>
    </>
  );
}
