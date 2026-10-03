"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { lineInfo, useStore } from "./store";
import { ArrowIcon, CheckIcon, CloseIcon, InstagramIcon, MinusIcon, PinIcon, PlusIcon, SearchIcon, WhatsAppIcon } from "./Icons";
import BookingSheet from "./BookingSheet";
import { Handle } from "./Handle";
import { SITE, price, whatsappLink } from "@/lib/site";
import { STYLES } from "@/lib/styles";
import { PRODUCTS, COLLECTIONS } from "@/lib/products";
import { orderMessage, sendViaInstagram } from "@/lib/messages";

const EASE = [0.22, 1, 0.36, 1] as const;

function Scrim({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );
}

export default function Overlays() {
  const { panel, close, booking, book, toast } = useStore();
  return (
    <>
      <AnimatePresence>
        {panel === "menu" && <MenuDrawer key="menu" onClose={close} />}
        {panel === "search" && <SearchPanel key="search" onClose={close} />}
        {panel === "cart" && <CartDrawer key="cart" onClose={close} />}
        {booking && <BookingSheet key={"b-" + booking} slug={booking} onClose={() => book(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed inset-x-0 top-[78px] z-[90] mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-bone px-5 py-3 text-sm font-semibold text-abyss shadow-2xl"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          >
            <CheckIcon className="h-4 w-4 text-royal" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* --------------------------------------------------------------- menu */
function MenuDrawer({ onClose }: { onClose: () => void }) {
  const { book } = useStore();
  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "The Menu" },
    { href: "/shop", label: "Shop all" },
    ...COLLECTIONS.map((c) => ({ href: `/shop?c=${c.id}`, label: c.name })),
  ];
  return (
    <>
      <Scrim onClick={onClose} />
      <motion.aside
        role="dialog" aria-modal="true" aria-label="Menu"
        className="fixed inset-y-0 left-0 z-[70] flex w-[86vw] max-w-[400px] flex-col overflow-y-auto bg-abyss"
        initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.45, ease: EASE }}
      >
        <div className="flex h-[68px] items-center justify-between px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-crown.png" alt="RAW" className="ml-2 h-9 w-auto" />
          <button className="grid h-11 w-11 place-items-center rounded-full" aria-label="Close menu" onClick={onClose}><CloseIcon /></button>
        </div>
        <nav className="flex flex-col px-6 pt-4">
          {links.map((l, i) => (
            <motion.div key={l.href} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.04, duration: 0.5, ease: EASE }}>
              <Link href={l.href} onClick={onClose} className="flex items-center justify-between border-b border-white/[0.07] py-4 font-display text-[1.65rem] uppercase leading-none text-bone">
                {l.label}
                <ArrowIcon className="h-5 w-5 text-lilac/70" />
              </Link>
            </motion.div>
          ))}
        </nav>
        <div className="mt-auto space-y-4 px-6 pb-8 pt-8">
          <button className="pill pill-lilac w-full" onClick={() => book(STYLES[0].slug)}>Book a style</button>
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-display text-lg uppercase text-bone">
            <InstagramIcon /> <Handle />
          </a>
          <p className="flex items-center gap-2 text-sm text-mute"><PinIcon /> {SITE.serviceArea}</p>
        </div>
      </motion.aside>
    </>
  );
}

/* ------------------------------------------------------------- search */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const { book } = useStore();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const styles = useMemo(() => STYLES.filter((s) => !query || `${s.name} ${s.category} ${s.blurb}`.toLowerCase().includes(query)), [query]);
  const products = useMemo(() => PRODUCTS.filter((p) => !query || `${p.name} ${p.collection} ${p.blurb} ${p.variants.map((v) => v.name).join(" ")}`.toLowerCase().includes(query)), [query]);

  return (
    <>
      <Scrim onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label="Search"
        className="fixed inset-x-0 top-0 z-[70] mx-auto max-h-[88vh] max-w-[560px] overflow-y-auto rounded-b-[28px] bg-abyss pb-6"
        initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-abyss px-3 pb-3 pt-3">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-full border border-bone/20 bg-ink2 px-4">
            <SearchIcon className="h-5 w-5 text-mute" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Knotless, durag, oil…" aria-label="Search styles and products"
              className="h-full flex-1 bg-transparent text-[16px] text-bone outline-none placeholder:text-mute/70"
            />
          </label>
          <button className="grid h-11 w-11 place-items-center" aria-label="Close search" onClick={onClose}><CloseIcon /></button>
        </div>
        {styles.length > 0 && (
          <section className="px-4 pt-2">
            <p className="eyebrow mb-2">Styles</p>
            {styles.map((s) => (
              <button key={s.slug} onClick={() => book(s.slug)} className="flex w-full items-center gap-3 border-b border-white/[0.06] py-2.5 text-left">
                <span className="stage relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><Image src={s.render} alt="" fill sizes="56px" className="object-contain" /></span>
                <span className="flex-1"><span className="block font-display text-base uppercase">{s.name}</span><span className="text-sm text-mute">from {price(s.from)} · {s.duration}</span></span>
                <ArrowIcon className="h-4 w-4 text-lilac" />
              </button>
            ))}
          </section>
        )}
        {products.length > 0 && (
          <section className="px-4 pt-5">
            <p className="eyebrow mb-2">Shop</p>
            {products.map((p) => (
              <Link key={p.slug} href={`/shop/${p.slug}`} onClick={onClose} className="flex items-center gap-3 border-b border-white/[0.06] py-2.5">
                <span className="stage relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><Image src={p.variants[0].image} alt="" fill sizes="56px" className="object-contain" /></span>
                <span className="flex-1"><span className="block font-display text-base uppercase">{p.name}</span><span className="text-sm text-mute">{price(p.price)}</span></span>
                <ArrowIcon className="h-4 w-4 text-lilac" />
              </Link>
            ))}
          </section>
        )}
        {styles.length + products.length === 0 && <p className="px-6 py-10 text-center text-mute">Nothing for “{q}”. Try “braids” or “durag”.</p>}
      </motion.div>
    </>
  );
}

/* --------------------------------------------------------------- cart */
function CartDrawer({ onClose }: { onClose: () => void }) {
  const { lines, subtotal, setQty, count, notify } = useStore();
  const msg = orderMessage(lines, subtotal);
  const wa = whatsappLink(msg);

  return (
    <>
      <Scrim onClick={onClose} />
      <motion.aside
        role="dialog" aria-modal="true" aria-label="Your bag"
        className="fixed inset-y-0 right-0 z-[70] flex w-[92vw] max-w-[440px] flex-col bg-abyss"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.45, ease: EASE }}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-white/[0.07] pl-5 pr-2">
          <h2 className="font-display text-2xl uppercase">Your bag {count > 0 && <span className="text-lilac">({count})</span>}</h2>
          <button className="grid h-11 w-11 place-items-center" aria-label="Close bag" onClick={onClose}><CloseIcon /></button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="stage relative h-40 w-40 overflow-hidden rounded-full"><Image src="/renders/durag-royal.webp" alt="" fill sizes="160px" className="object-contain" /></div>
            <p className="font-display text-2xl uppercase">Your bag is empty</p>
            <p className="text-sm text-mute">Silky durags, bonnets and hair care — made for the work.</p>
            <Link href="/shop" onClick={onClose} className="pill pill-lilac">Shop the drop</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4">
              {lines.map((l) => {
                const { product: p, variant: v } = lineInfo(l);
                return (
                  <li key={l.slug + l.variant} className="flex gap-3 border-b border-white/[0.06] py-4">
                    <Link href={`/shop/${p.slug}?v=${v.id}`} onClick={onClose} className="stage relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                      <Image src={v.image} alt={p.name} fill sizes="96px" className="object-contain" />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <p className="font-display text-base uppercase leading-tight">{p.name}</p>
                      {p.variants.length > 1 && <p className="text-sm text-mute">{v.name}</p>}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-bone/20">
                          <button className="grid h-9 w-9 place-items-center" aria-label="Decrease" onClick={() => setQty(l.slug, l.variant, l.qty - 1)}><MinusIcon className="h-4 w-4" /></button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                          <button className="grid h-9 w-9 place-items-center" aria-label="Increase" onClick={() => setQty(l.slug, l.variant, l.qty + 1)}><PlusIcon className="h-4 w-4" /></button>
                        </div>
                        <span className="font-semibold tabular-nums">{price(p.price * l.qty)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="safe-b space-y-3 border-t border-white/[0.07] bg-ink px-5 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl uppercase">Subtotal</span>
                <span className="text-xl font-semibold tabular-nums">{price(subtotal)}</span>
              </div>
              <p className="text-xs leading-relaxed text-mute">Cash on delivery to all 58 wilayas — delivery fee calculated at checkout.</p>
              <Link href="/checkout" onClick={onClose} className="pill pill-lilac w-full">
                Checkout <ArrowIcon className="h-4 w-4" />
              </Link>
              <div className="flex items-center justify-center gap-4 pb-1 text-sm text-mute">
                <button className="flex items-center gap-1.5 underline-offset-4 hover:underline" onClick={async () => { await sendViaInstagram(msg); notify("Order copied — paste it in the DM"); }}>
                  <InstagramIcon className="h-4 w-4" /> Order by DM
                </button>
                {wa && <a className="flex items-center gap-1.5" href={wa} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
              </div>
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}
