"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { useCatalog } from "./catalog";
import ProductCard from "./ProductCard";
import OrderForm from "./OrderForm";
import { BagIcon, ChevronIcon, InstagramIcon, MinusIcon, PlusIcon } from "./Icons";
import { isAvailable } from "@/lib/products";
import { fit, igHandle, instagramDM, price } from "@/lib/site";

export default function ProductView({ slug }: { slug: string }) {
  const { products, settings } = useCatalog();
  const p = products.find((x) => x.slug === slug)!;
  const { add, open } = useStore();
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  const [acc, setAcc] = useState<string | null>("Details");
  const gallery = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const v = p.variants[vi] ?? p.variants[0];
  const available = isAvailable(p, v);
  const items = useMemo(() => [{ slug: p.slug, variant: v.id, qty }], [p.slug, v.id, qty]);
  // the sticky bar steps aside while the order form itself is on screen
  const [formVisible, setFormVisible] = useState(false);
  const [ordered, setOrdered] = useState(false); // after ordering, the buy bar has nothing left to do
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ?v=<variant> deep-links a colour (used by the bag)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v");
    // a ?v= colour, else the first one still in stock
    const i = id ? p.variants.findIndex((x) => x.id === id) : p.variants.findIndex((x) => !x.soldOut);
    if (i > 0) { setVi(i); requestAnimationFrame(() => scrollTo(i, "instant")); }
  }, [p]);

  const scrollTo = (i: number, behavior: ScrollBehavior = "smooth") => {
    const g = gallery.current;
    if (g) g.scrollTo({ left: i * g.clientWidth, behavior });
  };
  const onScroll = () => {
    const g = gallery.current;
    if (!g) return;
    const i = Math.round(g.scrollLeft / g.clientWidth);
    if (i !== vi && i >= 0 && i < p.variants.length) setVi(i);
  };

  const related = products.filter((x) => x.slug !== p.slug).sort((a, b) => Number(b.collection === p.collection) - Number(a.collection === p.collection));
  const sections = [
    { title: "Details", body: p.details },
    { title: "Care", body: p.care },
    { title: "Delivery", body: ["Cash on delivery to all 58 wilayas", "Home delivery or stop desk", "We call you to confirm before shipping", `Questions? Message @${igHandle(settings.instagramHandle)}`] },
  ];

  return (
    <div className="pb-28">
      {/* swipeable gallery: one slide per colour */}
      <div className="relative">
        <div ref={gallery} onScroll={onScroll} className="rail stage gap-0 px-0 pb-0" aria-label="Product images">
          {p.variants.map((x, i) => (
            <div key={x.id} className="relative aspect-square w-full shrink-0">
              <Image src={x.image} alt={`${p.name} — ${x.name}`} fill priority={i === 0} sizes="(max-width: 560px) 100vw, 560px" className={fit(x.image)} />
            </div>
          ))}
        </div>
        {!available ? <span className="absolute left-4 top-4 rounded-full bg-bone px-3 py-1 font-sans text-xs font-semibold text-abyss">Sold out</span> : p.tag && <span className={`absolute left-4 top-4 rounded-full px-3 py-1 font-sans text-xs font-semibold ${p.tag === "Sale" ? "bg-lilac text-abyss" : "bg-abyss/70 text-lilac"}`}>{p.tag}</span>}
        {p.variants.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {p.variants.map((x, i) => (
              <button key={x.id} aria-label={`Show ${x.name}`} onClick={() => scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === vi ? "w-6 bg-bone" : "w-1.5 bg-bone/40"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-6">
        <h1 className="font-display text-[2.3rem] uppercase leading-[0.95]">{p.name}</h1>
        <p className="mt-2 flex items-baseline gap-2 text-lg">
          <span className="font-semibold">{price(p.price)}</span>
          {p.compareAt && <span className="text-mute line-through">{price(p.compareAt)}</span>}
          {p.compareAt && <span className="rounded-full bg-lilac/15 px-2 py-0.5 text-xs font-semibold text-lilac">−{Math.round((1 - p.price / p.compareAt) * 100)}%</span>}
        </p>
        <p className="mt-4 text-[0.98rem] leading-relaxed text-bone/85">{p.description}</p>

        {p.variants.length > 1 && (
          <fieldset className="mt-6">
            <legend className="mb-3 text-sm text-mute">Colour: <span className="font-display uppercase text-bone">{v.name}</span></legend>
            <div className="flex gap-3">
              {p.variants.map((x, i) => (
                <button
                  key={x.id} aria-label={x.name} aria-pressed={i === vi}
                  onClick={() => { setVi(i); scrollTo(i); }}
                  className={`relative h-11 w-11 overflow-hidden rounded-full ring-offset-2 ring-offset-abyss transition ${i === vi ? "ring-2 ring-lilac" : "ring-1 ring-white/25"}`}
                  style={{ background: x.swatch }}
                >
                  {x.soldOut && <span className="absolute left-1/2 top-1/2 h-[2px] w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-bone/90 shadow" aria-hidden />}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {available && <div className="mt-6 flex items-center gap-4">
          <span className="text-sm text-mute">Quantity</span>
          <div className="flex items-center rounded-full border border-bone/20">
            <button className="grid h-11 w-11 place-items-center" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}><MinusIcon className="h-4 w-4" /></button>
            <span className="w-7 text-center font-semibold tabular-nums">{qty}</span>
            <button className="grid h-11 w-11 place-items-center" aria-label="Increase quantity" onClick={() => setQty(Math.min(20, qty + 1))}><PlusIcon className="h-4 w-4" /></button>
          </div>
        </div>}

        {/* cash-on-delivery order form, right on the product page */}
        <div className="mt-7">
          {available ? (
            <OrderForm ref={form} items={items} onOrdered={() => setOrdered(true)} />
          ) : (
            <div className="rounded-[24px] border border-white/[0.08] bg-ink2 p-6 text-center">
              <p className="font-display text-2xl uppercase">Sold out</p>
              <p className="mt-2 text-[0.95rem] text-mute">{p.variants.length > 1 && !p.soldOut ? `${v.name} is gone for now — pick another colour, or` : "Gone for now —"} DM us to hear when it’s back.</p>
              <a href={instagramDM(settings.instagramHandle)} target="_blank" rel="noopener noreferrer" className="pill pill-lilac mt-5 w-full"><InstagramIcon /> Notify me</a>
            </div>
          )}
        </div>

        <div className="mt-8">
          {sections.map((s) => (
            <div key={s.title} className="border-t border-white/[0.08]">
              <button className="flex w-full items-center justify-between py-4 font-display text-lg uppercase" aria-expanded={acc === s.title} onClick={() => setAcc(acc === s.title ? null : s.title)}>
                {s.title}
                <ChevronIcon className={`h-5 w-5 transition-transform duration-300 ${acc === s.title ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ${acc === s.title ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <ul className="overflow-hidden text-[0.92rem] text-mute">
                  {s.body.map((b) => <li key={b} className="pb-2 pl-4 before:-ml-4 before:mr-2 before:text-lilac before:content-['✦']">{b}</li>)}
                  <li className="h-2" />
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="pt-12" aria-label="You may also like">
        <h2 className="h-section mb-6 text-[1.8rem]">You may also like</h2>
        <div className="rail">
          {related.map((x) => <ProductCard key={x.slug} product={x} className="w-[40vw] max-w-[180px] shrink-0" />)}
        </div>
      </section>

      {/* sticky buy bar: add to bag, or jump to the order form */}
      <div className={`safe-b fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[560px] gap-2 border-t border-white/[0.08] bg-abyss/90 px-4 pt-3 backdrop-blur-xl transition-transform duration-300 ${formVisible || ordered ? "translate-y-full" : ""}`} aria-hidden={ordered || undefined}>
        <button
          aria-label="Add to bag" disabled={!available}
          className="pill pill-ghost w-14 shrink-0 px-0 disabled:opacity-40"
          onClick={() => { add(p.slug, v.id, qty); open("cart"); }}
        >
          <BagIcon />
        </button>
        <button
          className="pill pill-lilac flex-1 justify-between px-6 disabled:opacity-60" disabled={!available}
          onClick={() => { form.current?.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => form.current?.querySelector<HTMLInputElement>('input[autocomplete="name"]')?.focus({ preventScroll: true }), 650); }}
        >
          <span className="font-ar text-[1.05rem] font-extrabold normal-case">{available ? "اطلب الآن" : "نفدت الكمية"}</span>
          <span className="font-sans text-base font-semibold">{price(p.price * qty)}</span>
        </button>
      </div>
    </div>
  );
}
