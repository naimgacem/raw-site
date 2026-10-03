"use client";

import Image from "next/image";
import { useStore } from "./store";
import Reveal from "./Reveal";
import { ArrowIcon, ClockIcon } from "./Icons";
import { CATEGORIES, STYLES } from "@/lib/styles";
import { price } from "@/lib/site";

// The full price list, grouped by category with a sticky jump bar.
export default function MenuList() {
  const { book } = useStore();
  return (
    <>
      <nav className="sticky top-[68px] z-30 flex gap-2 border-y border-white/[0.06] bg-abyss/90 px-4 py-2.5 backdrop-blur-xl" aria-label="Menu categories">
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="chip flex-1 justify-center">{c.label}</a>
        ))}
      </nav>

      {CATEGORIES.map((c) => (
        <section key={c.id} id={c.id} className="scroll-mt-[124px] px-4 pt-10" aria-label={c.label}>
          <h2 className="mb-4 flex items-baseline justify-between font-display text-[2rem] uppercase leading-none">
            {c.label}
            <span className="font-sans text-xs font-semibold tracking-[0.2em] text-mute">{STYLES.filter((s) => s.category === c.id).length} STYLES</span>
          </h2>
          <ul className="space-y-2.5">
            {STYLES.filter((s) => s.category === c.id).map((s) => (
              <Reveal as="li" key={s.slug}>
                <button onClick={() => book(s.slug)} className="flex w-full items-center gap-3.5 rounded-[20px] bg-ink2 p-2.5 pr-4 text-left transition-transform active:scale-[0.98]">
                  <span className="stage relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl">
                    <Image src={s.render} alt="" fill sizes="104px" className="object-contain" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-[1.15rem] uppercase leading-tight">{s.name}</span>
                    </span>
                    <span className="mt-1 block text-[0.83rem] leading-snug text-mute">{s.blurb}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem]">
                      <span className="whitespace-nowrap font-semibold text-bone">from {price(s.from)}</span>
                      <span className="flex items-center gap-1 whitespace-nowrap text-mute"><ClockIcon className="h-3.5 w-3.5" />{s.duration}</span>
                      {s.tag && <span className="rounded-full bg-lilac/15 px-2 py-0.5 text-[0.7rem] font-semibold text-lilac">{s.tag}</span>}
                    </span>
                  </span>
                  <ArrowIcon className="h-5 w-5 shrink-0 text-lilac" />
                </button>
              </Reveal>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
