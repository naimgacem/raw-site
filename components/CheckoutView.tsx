"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lineInfo, useStore } from "./store";
import OrderForm from "./OrderForm";
import { price } from "@/lib/site";

export default function CheckoutView() {
  const { lines, clear } = useStore();
  const [ready, setReady] = useState(false); // the bag loads from storage after mount
  const [ordered, setOrdered] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return <div className="h-[60svh]" />;

  if (lines.length === 0 && !ordered) {
    return (
      <section className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-3xl uppercase">Your bag is empty</h1>
        <Link href="/shop" className="pill pill-lilac">Shop the drop</Link>
      </section>
    );
  }

  return (
    <div className="px-4 pb-14 pt-8">
      <h1 className="text-center font-display text-[2.4rem] uppercase leading-none">Checkout</h1>
      <p className="mt-2 text-center text-sm text-mute">Cash on delivery · 58 wilayas</p>

      {!ordered && (
        <ul className="mt-6 space-y-2">
          {lines.map((l) => {
            const { product: p, variant: v } = lineInfo(l);
            return (
              <li key={l.slug + l.variant} className="flex items-center gap-3 rounded-2xl bg-ink2 p-2 pr-4">
                <span className="stage relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Image src={v.image} alt="" fill sizes="64px" className="object-contain" /></span>
                <span className="flex-1">
                  <span className="block font-display text-[0.95rem] uppercase leading-tight">{p.name}</span>
                  <span className="text-xs text-mute">{p.variants.length > 1 ? `${v.name} · ` : ""}× {l.qty}</span>
                </span>
                <span className="font-semibold tabular-nums">{price(p.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        <OrderForm items={lines} onOrdered={() => { setOrdered(true); clear(); }} />
      </div>
    </div>
  );
}
