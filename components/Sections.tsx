"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import Reveal from "./Reveal";
import { ArrowIcon, InstagramIcon, PinIcon } from "./Icons";
import { SITE } from "@/lib/site";
import { Handle } from "./Handle";
import { STYLES } from "@/lib/styles";
import { COLLECTIONS } from "@/lib/products";

// Muted background loop that only plays while on screen (and never with reduced motion).
function LoopVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-80" />;
}

export function SectionTitle({ children, sub, className = "" }: { children: React.ReactNode; sub?: string; className?: string }) {
  return (
    <Reveal className={`px-4 pb-6 text-center ${className}`}>
      <h2 className="h-section">{children}</h2>
      {sub && <p className="mx-auto mt-2.5 max-w-[19rem] text-[0.92rem] leading-snug text-mute">{sub}</p>}
    </Reveal>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 flex justify-center px-4">
      <Link href={href} className="pill pill-ghost">
        {children} <ArrowIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* Full-bleed image with centred type — Sunviya's "THE JOURNEY STARTS HERE." */
export function Banner() {
  const { book } = useStore();
  const steps = [
    ["01", "Pick your style", "Browse the menu, choose size & length."],
    ["02", "Send the DM", "Your request is written for you — just paste."],
    ["03", "We come to you", "Mobile service. Your place, your time."],
  ];
  return (
    <section className="relative overflow-hidden" aria-label="We come to you">
      <LoopVideo src="/media/braids-loop.mp4" poster="/media/braids-poster.jpg" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,8,0.6),rgba(26,6,48,0.55)_40%,rgba(7,6,8,0.92)_72%,#070608)]" />
      <div className="relative flex flex-col items-center px-5 pb-12 pt-20 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-lilac backdrop-blur"><PinIcon className="h-3.5 w-3.5" /> Déplacement</span>
          <h2 className="mt-4 font-display text-[3rem] uppercase leading-[0.92] text-bone drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]">We come<br />to you.</h2>
          <p className="mx-auto mt-4 max-w-[20rem] font-display text-[0.9rem] uppercase leading-snug text-bone/90">No salon, no waiting room. RAW brings the chair, the hands and the art to your door.</p>
        </Reveal>
        <ol className="mt-24 w-full space-y-2.5 text-left">
          {steps.map(([n, t, d], i) => (
            <Reveal as="li" key={n} delay={i * 90} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/45 p-4 backdrop-blur-md">
              <span className="w-9 font-sans text-[1.7rem] font-bold leading-none tracking-tight text-violet">{n}</span>
              <span>
                <span className="block font-display text-lg uppercase leading-tight">{t}</span>
                <span className="text-sm text-mute">{d}</span>
              </span>
            </Reveal>
          ))}
        </ol>
        <button className="pill pill-lilac mt-7 w-full" onClick={() => book(STYLES[0].slug)}>Book your slot</button>
      </div>
    </section>
  );
}

/* Lilac block with framed image + dark pill — Sunviya's "ESCAPE THE ORDINARY" */
export function Feature() {
  return (
    <section className="bg-lilac px-4 pb-12 pt-4 text-abyss" aria-label="About RAW">
      <Reveal className="relative overflow-hidden rounded-[22px] bg-black">
        <Image src="/brand/raw-logo-plate.jpg" alt="RAW — Royal Art Weaves logo: a crowned octopus" width={900} height={1000} sizes="(max-width: 560px) 100vw, 560px" className="h-auto w-full" />
      </Reveal>
      <Reveal className="px-2 pt-7 text-center">
        <h2 className="font-display text-[2.1rem] uppercase leading-[0.95]">Royal Art Weaves</h2>
        <p className="mx-auto mt-4 max-w-[21rem] text-[0.98rem] leading-relaxed text-abyss/80">
          Every head is a canvas. RAW turns braids, twists and barrel twists into wearable art — clean parts, sharp patterns, finished like a crown.
        </p>
        <p className="mx-auto mt-3 max-w-[21rem] text-[0.98rem] leading-relaxed text-abyss/80">
          Eight arms, one obsession: the details nobody else takes the time to get right.
        </p>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="pill pill-dark mt-7 px-8">
          <InstagramIcon className="h-5 w-5" /> See the work
        </a>
      </Reveal>
    </section>
  );
}

/* Tall rounded cards with the label on the image — Sunviya's "SHOP BY COLLECTION" */
export function Collections() {
  return (
    <section className="py-14" aria-label="Shop by collection">
      <SectionTitle>Shop by collection</SectionTitle>
      <div className="rail gap-3.5">
        {COLLECTIONS.map((c) => (
          <Link key={c.id} href={`/shop?c=${c.id}`} className="stage relative block aspect-[4/5] w-[52vw] max-w-[240px] shrink-0 overflow-hidden rounded-[24px]">
            <Image src={c.image} alt="" fill sizes="(max-width: 560px) 52vw, 240px" className="object-contain p-3 pb-12" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-4 pt-10 text-center">
              <span className="block font-display text-[1.25rem] uppercase leading-none">{c.name}</span>
              <span className="mt-1 block text-xs text-lilac">{c.line}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function InstagramStrip() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] px-4 py-14 text-center" aria-label="Instagram">
      <Reveal>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full.png" alt="" className="mx-auto h-36 w-auto opacity-95" />
        <p className="eyebrow mt-6">Follow the work</p>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="mt-2 block font-display text-[2.6rem] uppercase leading-none text-bone">
          <Handle />
        </a>
        <p className="mx-auto mt-3 max-w-[18rem] text-sm text-mute">Fresh sets, reels and open slots — posted first on Instagram.</p>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="pill pill-violet mt-6"><InstagramIcon /> Open Instagram</a>
      </Reveal>
    </section>
  );
}
