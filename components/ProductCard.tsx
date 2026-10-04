"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "./store";
import { PlusIcon } from "./Icons";
import type { Product } from "@/lib/types";
import { isAvailable } from "@/lib/products";
import { fit, price } from "@/lib/site";

// Sunviya product tile: rounded, tinted, "Sale" pill top-left, centred name + price (+ struck compare-at).
export default function ProductCard({ product: p, className = "" }: { product: Product; className?: string }) {
  const { add, open } = useStore();
  const v = p.variants.find((x) => !x.soldOut) ?? p.variants[0];
  const available = isAvailable(p, v);
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-[16px] bg-ink2 ${className}`}>
      <Link href={`/shop/${p.slug}`} className="stage relative block aspect-square w-full overflow-hidden" aria-label={p.name}>
        <Image src={v.image} alt={`${p.name}${p.variants.length > 1 ? ` — ${v.name}` : ""}`} fill sizes="(max-width: 560px) 50vw, 280px" className={`${fit(v.image)} ${available ? "" : "opacity-50"}`} />
        {!available ? <span className="absolute left-2 top-2 rounded-full bg-bone px-2 py-px font-sans text-[0.65rem] font-semibold text-abyss">Sold out</span> : p.tag && <span className={`absolute left-2 top-2 rounded-full px-2 py-px font-sans text-[0.65rem] font-semibold ${p.tag === "Sale" ? "bg-lilac text-abyss" : "bg-abyss/70 text-lilac backdrop-blur"}`}>{p.tag}</span>}
      </Link>
      {available && <button
        aria-label={`Add ${p.name} to bag`}
        onClick={() => { add(p.slug, v.id); open("cart"); }}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-bone text-abyss shadow-lg transition-transform active:scale-90"
      >
        <PlusIcon className="h-4 w-4" />
      </button>}
      <Link href={`/shop/${p.slug}`} className="flex flex-1 flex-col items-center px-2 pb-3 pt-2.5 text-center">
        <h3 className="font-display text-[0.9rem] uppercase leading-tight text-bone">{p.name}</h3>
        <p className="mt-1 whitespace-nowrap text-[0.8rem]">
          <span className="font-semibold text-bone">{price(p.price)}</span>
          {p.compareAt && <span className="ml-1.5 text-mute line-through">{price(p.compareAt)}</span>}
        </p>
        {p.variants.length > 1 && (
          <span className="mt-1.5 flex gap-1.5" aria-label={`${p.variants.length} colours`}>
            {p.variants.map((x) => <span key={x.id} className="h-3 w-3 rounded-full ring-1 ring-white/25" style={{ background: x.swatch }} />)}
          </span>
        )}
      </Link>
    </div>
  );
}
