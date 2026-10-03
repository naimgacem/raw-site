"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { useStore } from "./store";
import { CheckIcon, ClockIcon, CloseIcon, InstagramIcon, PinIcon, WhatsAppIcon } from "./Icons";
import { getStyle } from "@/lib/styles";
import { SITE, price, whatsappLink } from "@/lib/site";
import { bookingMessage, sendViaInstagram } from "@/lib/messages";

const TIMES = ["Morning", "Afternoon", "Evening"];

// Bottom sheet: pick a style's options, see the live estimate, send a ready-made DM.
export default function BookingSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const style = getStyle(slug);
  const { notify } = useStore();
  const drag = useDragControls();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [area, setArea] = useState("");
  if (!style) return null;

  const chosen = Object.fromEntries(style.options.map((o) => [o.label, o.choices[picks[o.label] ?? 0]]));
  const total = style.from + Object.values(chosen).reduce((n, c) => n + c.add, 0);
  const pickLabels = Object.fromEntries(Object.entries(chosen).map(([k, c]) => [k, c.label]));
  const when = date ? new Date(date + "T12:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "";
  const msg = bookingMessage(style, pickLabels, total, { date: when, time, area });
  const wa = whatsappLink(msg);

  return (
    <>
      <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={`Book ${style.name}`}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[92svh] max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-abyss"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
        drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}
      >
        {/* hero: the 3D render on its glow, grab handle on top */}
        <div className="stage relative h-[38svh] max-h-[340px] shrink-0 touch-none" onPointerDown={(e) => drag.start(e)}>
          <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/30" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur"><CloseIcon className="h-5 w-5" /></button>
          <Image src={style.render} alt={`${style.name} — 3D illustration`} fill sizes="(max-width: 560px) 100vw, 560px" className="animate-float object-contain p-2" priority />
          {style.tag && <span className="absolute left-4 top-4 rounded-full bg-lilac px-3 py-1 font-display text-xs uppercase text-abyss">{style.tag}</span>}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5">
          <p className="eyebrow">{style.category}</p>
          <h2 className="mt-1 font-display text-[2rem] uppercase leading-none">{style.name}</h2>
          <div className="mt-3 flex items-center gap-4 text-sm text-mute">
            <span className="flex items-center gap-1.5"><ClockIcon /> {style.duration}</span>
            <span className="flex items-center gap-1.5"><PinIcon /> We come to you</span>
          </div>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-bone/85">{style.description}</p>

          {style.options.map((o) => (
            <fieldset key={o.label} className="mt-6">
              <legend className="mb-2.5 font-display text-sm uppercase text-lilac">{o.label}</legend>
              <div className="flex flex-wrap gap-2">
                {o.choices.map((c, i) => (
                  <button
                    key={c.label} type="button" aria-pressed={(picks[o.label] ?? 0) === i}
                    onClick={() => setPicks((p) => ({ ...p, [o.label]: i }))}
                    className="chip h-10 gap-1.5 normal-case"
                  >
                    {c.label}
                    {c.add > 0 && <span className="font-sans text-xs opacity-70">+{price(c.add)}</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset className="mt-6">
            <legend className="mb-2.5 font-display text-sm uppercase text-lilac">When & where</legend>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Preferred date"
                min={new Date().toISOString().slice(0, 10)}
                className="h-12 rounded-2xl border border-bone/15 bg-ink2 px-3 text-[16px] text-bone [color-scheme:dark]"
              />
              <input
                value={area} onChange={(e) => setArea(e.target.value)} placeholder="Your area" aria-label="Your area"
                className="h-12 rounded-2xl border border-bone/15 bg-ink2 px-3 text-[16px] text-bone placeholder:text-mute/70"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {TIMES.map((t) => (
                <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(time === t ? "" : t)} className="chip h-10 flex-1 justify-center">{t}</button>
              ))}
            </div>
          </fieldset>

          <ul className="mt-6 space-y-1.5 text-sm text-mute">
            {style.includes.map((x) => <li key={x} className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-lilac" /> {x}</li>)}
          </ul>
        </div>

        {/* sticky footer: live estimate + send */}
        <div className="safe-b shrink-0 border-t border-white/[0.07] bg-ink px-5 pt-3">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm text-mute">Estimate</span>
            <span className="text-2xl font-bold leading-none tabular-nums"><span className="mr-1.5 text-base font-medium text-mute">from</span>{price(total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="pill pill-lilac flex-1"
              onClick={async () => { await sendViaInstagram(msg); notify("Request copied — paste it in the DM"); }}
            >
              <InstagramIcon /> Book via DM
            </button>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Book on WhatsApp" className="pill pill-ghost w-14 px-0"><WhatsAppIcon /></a>}
          </div>
          <p className="mt-2 text-center text-[0.7rem] text-mute">We copy your request — just paste it in {SITE.instagramHandle}’s DMs.</p>
        </div>
      </motion.div>
    </>
  );
}
