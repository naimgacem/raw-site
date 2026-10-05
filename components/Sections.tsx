"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { useCatalog } from "./catalog";
import Reveal from "./Reveal";
import ProductCard from "./ProductCard";
import { ArrowIcon, InstagramIcon, PinIcon } from "./Icons";
import { instagramUrl } from "@/lib/site";
import { Handle } from "./Handle";

// Muted background loop that only plays while on screen (and never with reduced motion).
function LoopVideo({ src, poster, className = "" }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}

/** Section header: small label + title on the left, "See all" on the right — no extra button row below. */
export function SectionHead({ eyebrow, title, href, link = "See all" }: { eyebrow?: string; title: string; href?: string; link?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 px-4 pb-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-[2rem] uppercase leading-[0.95] text-bone">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="-mr-1 flex shrink-0 items-center gap-1 rounded-full px-1 py-1 font-display text-[0.85rem] uppercase text-lilac">
          {link} <ArrowIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* How booking works. Behind it, "The Weave": the octopus's arms plaiting a braid and curling free
   (tools/weave-video.mjs). The arms live on the right; the words sit on the dark water to their left. */
export function HowItWorks() {
  const { book } = useStore();
  const { styles } = useCatalog();
  const steps = ["Pick a style", "Send the DM", "Get styled"];
  return (
    <section className="cv relative overflow-hidden bg-abyss" aria-label="How booking works">
      <LoopVideo src="/media/weave-loop.mp4" poster="/media/weave-poster.jpg" className="object-[62%_50%]" />
      {/* legibility: the water darkens toward the words, and fades into the sections above and below */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,6,8,0.88)_0%,rgba(7,6,8,0.55)_36%,rgba(7,6,8,0)_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#070608_0%,rgba(7,6,8,0)_14%,rgba(7,6,8,0)_86%,#070608_100%)]" />
      <div className="relative flex min-h-[33rem] flex-col px-5 pb-10 pt-14">
        <Reveal className="max-w-[14rem]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-lilac backdrop-blur"><PinIcon className="h-3.5 w-3.5" /> Déplacement</span>
          <h2 className="mt-4 font-display text-[2.6rem] uppercase leading-[0.92] text-bone drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">We come<br />to you.</h2>
          <p className="mt-3 text-[0.95rem] leading-snug text-bone/80">No salon, no waiting room — the chair, the hands and the art, at your door.</p>
        </Reveal>
        <ol className="mt-auto space-y-2.5 pt-8">
          {steps.map((t, i) => (
            <Reveal as="li" key={t} delay={i * 80} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-violet/50 bg-black/50 font-sans text-[0.85rem] font-bold text-lilac backdrop-blur">0{i + 1}</span>
              <span className="font-display text-[1rem] uppercase leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">{t}</span>
            </Reveal>
          ))}
        </ol>
        {styles[0] && <button className="pill pill-lilac mt-7 self-start px-8" onClick={() => book(styles[0].slug)}>Book your slot</button>}
      </div>
    </section>
  );
}

/* The shop on one row: collection chips filter the products in place. */
export function ShopRail() {
  const { products, collections } = useCatalog();
  const [c, setC] = useState("all");
  const rail = useRef<HTMLDivElement>(null);
  if (products.length === 0) return null;
  const list = c === "all" ? products : products.filter((p) => p.collection === c);
  const pick = (id: string) => {
    setC(id);
    rail.current?.scrollTo({ left: 0, behavior: "smooth" });
  };
  return (
    <section className="cv py-10" aria-label="Shop">
      <SectionHead eyebrow="Cash on delivery · 58 wilayas" title="Shop the drop" href={c === "all" ? "/shop" : `/shop?c=${c}`} link="Shop all" />
      {collections.length > 1 && (
        <div className="rail mb-4 gap-2" role="toolbar" aria-label="Collections">
          <button className="chip" aria-pressed={c === "all"} onClick={() => pick("all")}>All</button>
          {collections.map((x) => (
            <button key={x.id} className="chip" aria-pressed={c === x.id} onClick={() => pick(x.id)}>{x.name}</button>
          ))}
        </div>
      )}
      <div ref={rail} className="rail">
        {list.map((p) => <ProductCard key={p.slug} product={p} className="w-[40vw] max-w-[180px] shrink-0" />)}
      </div>
    </section>
  );
}

/* Who RAW is + the one Instagram call to action. */
export function About() {
  const { settings } = useCatalog();
  return (
    <section className="cv relative overflow-hidden border-t border-white/[0.06] px-5 py-12 text-center" aria-label="About RAW">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(151,31,244,0.28),transparent)]" />
      <Reveal className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full-sm.webp" alt="RAW — a crowned octopus" width={86} height={112} loading="lazy" decoding="async" className="mx-auto h-28 w-[86px]" />
        <h2 className="mt-5 font-display text-[2rem] uppercase leading-[0.95]">Royal Art Weaves</h2>
        <p className="mx-auto mt-3 max-w-[21rem] text-[0.95rem] leading-relaxed text-bone/75">
          Every head is a canvas. Braids, twists and barrel twists turned into wearable art — clean parts, sharp patterns, finished like a crown.
        </p>
        <a href={instagramUrl(settings.instagramHandle)} target="_blank" rel="noopener noreferrer" className="pill pill-violet mt-6">
          <InstagramIcon /> <Handle />
        </a>
        <p className="mt-3 text-[0.8rem] text-mute">New sets and open slots are posted there first.</p>
      </Reveal>
    </section>
  );
}
