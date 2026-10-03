"use client";

import Image from "next/image";
import { useStore } from "./store";
import { ClockIcon } from "./Icons";
import type { HairStyle } from "@/lib/styles";
import { price } from "@/lib/site";

// Sunviya product-card shape (tinted tile, pill tag, centred title + price) for a menu style.
export default function StyleCard({ style, className = "" }: { style: HairStyle; className?: string }) {
  const { book } = useStore();
  return (
    <button
      onClick={() => book(style.slug)}
      className={`group flex flex-col overflow-hidden rounded-[16px] bg-ink2 text-left transition-transform duration-300 active:scale-[0.98] ${className}`}
      aria-label={`${style.name}, from ${price(style.from)}. Open booking`}
    >
      <div className="stage relative aspect-square w-full overflow-hidden">
        <Image src={style.render} alt="" fill sizes="(max-width: 560px) 42vw, 190px" className="object-contain transition-transform duration-700 ease-out group-active:scale-105" />
        {style.tag && <span className="absolute left-2 top-2 rounded-full bg-lilac px-2 py-px font-sans text-[0.65rem] font-semibold text-abyss">{style.tag}</span>}
      </div>
      <div className="flex flex-1 flex-col items-center px-2 pb-3 pt-2.5 text-center">
        <h3 className="font-display text-[0.9rem] uppercase leading-tight text-bone">{style.name}</h3>
        <p className="mt-1 whitespace-nowrap text-[0.8rem] font-semibold text-bone"><span className="font-normal text-mute">from </span>{price(style.from)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.72rem] text-mute"><ClockIcon className="h-3 w-3" />{style.duration}</p>
      </div>
    </button>
  );
}
