import type { Metadata } from "next";
import MenuList from "@/components/MenuList";
import { BOOKING_NOTES } from "@/lib/styles";

export const metadata: Metadata = {
  title: "The Menu — styles & prices",
  description: "Knotless, box braids, cornrows, Fulani, two-strand twists, barrel twists and custom hair art. Starting prices, durations and booking by DM.",
};

export default function MenuPage() {
  return (
    <>
      <header className="relative overflow-hidden px-4 pb-8 pt-10 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(151,31,244,0.35),transparent)]" />
        <p className="eyebrow relative">Braids · Twists · Barrel twists · Art</p>
        <h1 className="relative mt-3 font-display text-[3rem] uppercase leading-[0.9]">The menu</h1>
        <p className="relative mx-auto mt-4 max-w-[20rem] text-[0.95rem] leading-relaxed text-mute">
          Starting prices — your final quote depends on size, length and design. Tap any style to build your booking.
        </p>
      </header>

      <MenuList />

      <section id="good-to-know" className="scroll-mt-20 px-4 pb-14 pt-6">
        <h2 className="h-section mb-6">Good to know</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {BOOKING_NOTES.map((n) => (
            <div key={n.title} className="rounded-2xl border border-white/[0.07] bg-ink2 p-4">
              <h3 className="font-display text-base uppercase leading-tight text-lilac">{n.title}</h3>
              <p className="mt-2 text-[0.85rem] leading-snug text-mute">{n.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
