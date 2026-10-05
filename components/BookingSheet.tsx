"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { useCatalog } from "./catalog";
import { CheckIcon, ClockIcon, CloseIcon, InstagramIcon, PinIcon, SpinnerIcon, WhatsAppIcon } from "./Icons";
import { fit, igHandle, price, whatsappLink } from "@/lib/site";
import { bookingMessage, copyText, instagramDMWithText } from "@/lib/messages";

const TIMES = ["Morning", "Afternoon", "Evening"];
type View = "form" | "sent" | "dm";

/**
 * Bottom sheet: pick a style's options, see the live estimate, send the request.
 * "Send booking request" goes straight to the artist (dashboard + Telegram) — nothing to copy.
 * Instagram stays as an option: copy (with a visible confirmation) then open the chat.
 */
export default function BookingSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { styles, settings } = useCatalog();
  const style = styles.find((s) => s.slug === slug);
  const drag = useDragControls();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [view, setView] = useState<View>("form");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);
  const you = useRef<HTMLFieldSetElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const noted = useRef(""); // a DM-only request is noted once
  if (!style) return null;

  const chosen: Record<string, { label: string; add: number }> = {};
  for (const o of style.options) {
    const c = o.choices[picks[o.label] ?? 0];
    if (c) chosen[o.label] = c;
  }
  const total = style.from + Object.values(chosen).reduce((n, c) => n + c.add, 0);
  const pickLabels = Object.fromEntries(Object.entries(chosen).map(([k, c]) => [k, c.label]));
  const when = date ? new Date(date + "T12:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "";
  const msg = bookingMessage(style, pickLabels, total, { date: when, time, area, name });
  const wa = whatsappLink(settings.whatsapp, msg);
  const handle = igHandle(settings.instagramHandle);
  const payload = (via?: "dm") => JSON.stringify({ style: style.slug, picks: pickLabels, date, time, area, name, phone, website: hp, via });
  const show = (v: View) => { setView(v); setCopied(null); body.current?.scrollTo({ top: 0 }); };

  const send = async () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Add your name";
    if (phone.replace(/\D/g, "").length < 9) e.phone = "Add a number we can call or WhatsApp";
    setErrors(e);
    if (e.name || e.phone) {
      you.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload() });
      const j = await r.json();
      if (j.ok && (j.saved || j.sent)) { setSentOk(true); show("sent"); }
      else { setFailed(true); show("dm"); }
    } catch {
      setFailed(true);
      show("dm");
    } finally {
      setBusy(false);
    }
  };

  // a DM-only booking still lands in the artist's dashboard (best effort, never blocks)
  const note = () => {
    if (!settings.bookingsOpen || view === "sent" || noted.current === msg) return;
    noted.current = msg;
    fetch("/api/booking", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: payload("dm") }).catch(() => {});
  };

  const field = "h-12 w-full rounded-2xl border bg-ink2 px-3 text-[16px] text-bone placeholder:text-mute/70";

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
        {/* hero: the render on its glow, grab handle on top */}
        <div className={`stage relative shrink-0 touch-none transition-[height] duration-500 ${view === "form" ? "h-[34svh] max-h-[320px]" : "h-28"}`} onPointerDown={(e) => drag.start(e)}>
          <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/30" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur"><CloseIcon className="h-5 w-5" /></button>
          <Image src={style.render} alt={`${style.name} — illustration`} fill sizes="(max-width: 560px) 100vw, 560px" className={fit(style.render) === "object-contain" ? "animate-float object-contain p-2" : "object-cover"} priority />
          {style.tag && view === "form" && <span className="absolute left-4 top-4 rounded-full bg-lilac px-3 py-1 font-display text-xs uppercase text-abyss">{style.tag}</span>}
        </div>

        <div ref={body} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5">
          {view === "form" && (
            <>
              <p className="eyebrow">{style.category}</p>
              <h2 className="mt-1 font-display text-[2rem] uppercase leading-none">{style.name}</h2>
              <div className="mt-3 flex items-center gap-4 text-sm text-mute">
                <span className="flex items-center gap-1.5"><ClockIcon /> {style.duration}</span>
                <span className="flex items-center gap-1.5"><PinIcon /> We come to you</span>
              </div>
              {!settings.bookingsOpen && (
                <p className="mt-4 rounded-2xl border border-lilac/25 bg-lilac/10 p-3 text-sm text-lilac">The diary is full right now — send a DM to join the waiting list.</p>
              )}
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
                    className={`${field} border-bone/15 [color-scheme:dark]`}
                  />
                  <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Your area" aria-label="Your area" className={`${field} border-bone/15`} />
                </div>
                <div className="mt-2 flex gap-2">
                  {TIMES.map((t) => (
                    <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(time === t ? "" : t)} className="chip h-10 flex-1 justify-center">{t}</button>
                  ))}
                </div>
              </fieldset>

              <fieldset ref={you} className="mt-6 scroll-mt-6">
                <legend className="mb-2.5 font-display text-sm uppercase text-lilac">You</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} placeholder="Your name" aria-label="Your name" autoComplete="given-name" aria-invalid={!!errors.name} className={`${field} ${errors.name ? "border-rose-400/70" : "border-bone/15"}`} />
                    {errors.name && <p className="mt-1 text-[0.78rem] text-rose-300">{errors.name}</p>}
                  </div>
                  <div>
                    <input value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })); }} placeholder="Phone / WhatsApp" aria-label="Phone or WhatsApp number" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} className={`${field} ${errors.phone ? "border-rose-400/70" : "border-bone/15"}`} />
                    {errors.phone && <p className="mt-1 text-[0.78rem] text-rose-300">{errors.phone}</p>}
                  </div>
                </div>
                <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              </fieldset>

              <ul className="mt-6 space-y-1.5 text-sm text-mute">
                {style.includes.map((x) => <li key={x} className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-lilac" /> {x}</li>)}
              </ul>
            </>
          )}

          {view === "sent" && (
            <div className="pb-2 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet to-royal shadow-[0_0_40px_rgba(151,31,244,0.6)]"><CheckIcon className="h-8 w-8 text-white" /></span>
              <h2 className="mt-4 font-display text-[1.9rem] uppercase leading-none">Request sent</h2>
              <p className="mx-auto mt-3 max-w-[20rem] text-[0.95rem] leading-relaxed text-bone/85">
                RAW will call or WhatsApp you on <span className="whitespace-nowrap font-semibold text-bone">{phone}</span> to confirm the date and the price.
              </p>
              <dl className="mt-5 space-y-1.5 rounded-2xl bg-ink2 p-4 text-left text-[0.9rem]">
                <Row k="Style" v={style.name} />
                {Object.entries(pickLabels).map(([k, v]) => <Row key={k} k={k} v={v} />)}
                {(when || time) && <Row k="When" v={[when, time].filter(Boolean).join(" · ")} />}
                {area && <Row k="Where" v={area} />}
                <Row k="Estimate" v={`from ${price(total)}`} />
              </dl>
              <button className="mt-5 inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-lilac underline-offset-4 hover:underline" onClick={() => show("dm")}>
                <InstagramIcon className="h-4 w-4" /> Want to chat now? Message on Instagram
              </button>
            </div>
          )}

          {view === "dm" && (
            <div className="pb-2">
              <h2 className="font-display text-[1.7rem] uppercase leading-none">Message on Instagram</h2>
              {failed ? (
                <p className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-[0.9rem] text-rose-100">We couldn’t send your request automatically — send it by DM instead, it only takes a second.</p>
              ) : (
                <p className="mt-2 text-[0.92rem] text-mute">Instagram doesn’t let websites type a message for you — so copy it here, then paste it in the chat.</p>
              )}
              <ol className="mt-5 space-y-4">
                <li>
                  <p className="mb-2 flex items-center gap-2 text-[0.85rem] font-semibold text-lilac"><Step n={1} /> Copy your request</p>
                  <pre className="max-h-40 select-all overflow-auto whitespace-pre-wrap rounded-2xl border border-white/[0.08] bg-ink2 p-3 font-sans text-[0.85rem] leading-relaxed text-bone/85">{msg}</pre>
                  <button
                    className={`pill mt-2 w-full ${copied ? "border border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "pill-lilac"}`}
                    onClick={async () => setCopied(await copyText(msg))}
                  >
                    {copied ? <><CheckIcon /> Copied</> : "Copy message"}
                  </button>
                  {copied === false && <p className="mt-1.5 text-center text-[0.8rem] text-mute">Your phone blocked copying — press and hold the text above, then Copy.</p>}
                </li>
                <li>
                  <p className="mb-2 flex items-center gap-2 text-[0.85rem] font-semibold text-lilac"><Step n={2} /> Open Instagram and paste it</p>
                  <a href={instagramDMWithText(handle, msg)} target="_blank" rel="noopener noreferrer" onClick={note} className={`pill w-full ${copied ? "pill-lilac" : "pill-ghost"}`}>
                    <InstagramIcon /> Open @{handle}
                  </a>
                </li>
              </ol>
              {wa && (
                <a href={wa} onClick={note} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 text-[0.9rem] font-semibold text-bone/80">
                  <WhatsAppIcon className="h-4 w-4" /> Or WhatsApp — the message is filled in for you
                </a>
              )}
            </div>
          )}
        </div>

        {/* sticky footer */}
        <div className="safe-b shrink-0 border-t border-white/[0.07] bg-ink px-5 pt-3">
          {view === "form" ? (
            <>
              <div className="mb-3 flex items-end justify-between">
                <span className="text-sm text-mute">Estimate</span>
                <span className="text-2xl font-bold leading-none tabular-nums"><span className="mr-1.5 text-base font-medium text-mute">from</span>{price(total)}</span>
              </div>
              {settings.bookingsOpen ? (
                <button className="pill pill-lilac w-full" onClick={send} disabled={busy}>
                  {busy ? <SpinnerIcon /> : <CheckIcon />} {busy ? "Sending…" : "Send booking request"}
                </button>
              ) : (
                <button className="pill pill-lilac w-full" onClick={() => show("dm")}><InstagramIcon /> Message on Instagram</button>
              )}
              <div className="flex items-center justify-center gap-4 py-2 text-[0.82rem] text-mute">
                {settings.bookingsOpen && <button className="flex items-center gap-1.5 font-semibold text-bone/80" onClick={() => show("dm")}><InstagramIcon className="h-4 w-4" /> DM instead</button>}
                {wa && <a href={wa} onClick={note} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold text-bone/80"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
                {settings.bookingsOpen && !wa && <span>No payment now</span>}
              </div>
            </>
          ) : view === "sent" ? (
            <button className="pill pill-lilac mb-1 w-full" onClick={onClose}>Done</button>
          ) : sentOk ? (
            <button className="pill pill-ghost mb-1 w-full" onClick={onClose}>Done</button>
          ) : (
            <button className="pill pill-ghost mb-1 w-full" onClick={() => { setFailed(false); show("form"); }}>Back to booking</button>
          )}
        </div>
      </motion.div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium text-bone">{v}</dd>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid h-6 w-6 place-items-center rounded-full border border-lilac/60 text-[0.75rem] font-bold">{n}</span>;
}
