"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteBooking, setBookingStatus, updateBooking } from "@/app/admin/actions";
import { dayLabel, stamp } from "@/lib/dates";
import { copyText } from "@/lib/messages";
import { price } from "@/lib/site";
import type { Booking, BookingStatus } from "@/lib/types";
import { prettyPhone, smsHref, telHref, waHref } from "./contact";
import { useDirty, useShell } from "./Shell";
import { BOOKING_STATUS, Button, Card, Field, IconButton, Input, MenuItem, MoneyInput, PageHeader, Pill, SaveBar, Section, Sheet, TextArea, Thumb, cx, same } from "./ui";
import { BlockI, CalendarI, CheckI, CloseI, CopyI, InstagramI, MessageI, MoreI, PhoneI, RefreshI, TrashI, WhatsAppI } from "./icons";

const SLOTS = ["Morning", "Afternoon", "Evening"];

export default function BookingDetail({ booking, image }: { booking: Booking; image?: string }) {
  const router = useRouter();
  const { toast, confirm } = useShell();
  const [busy, start] = useTransition();
  const [b, setB] = useState(booking);
  useEffect(() => setB(booking), [booking]);
  const initial = useMemo(() => pickForm(booking), [booking]);
  const [f, setF] = useState(initial);
  useEffect(() => setF(initial), [initial]);
  const [menu, setMenu] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  const dirty = !same(f, initial);
  useDirty(dirty);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = (then?: () => void) =>
    start(async () => {
      const r = await updateBooking(b.id, f);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast("Saved");
      then?.();
    });

  const status = (s: BookingStatus, msg: string) => {
    const go = () =>
      start(async () => {
        const before = b.status;
        setB((x) => ({ ...x, status: s }));
        const r = await setBookingStatus(b.id, s);
        if (!r.ok) { setB((x) => ({ ...x, status: before })); return toast(r.error, { tone: "error" }); }
        toast(msg, { action: { label: "Undo", run: () => start(async () => { await setBookingStatus(b.id, before); setB((x) => ({ ...x, status: before })); }) } });
      });
    if (s === "confirmed" && !f.date) return toast("Pick the date first", { tone: "error" });
    // saving the date/price and confirming in one tap
    if (dirty) save(go);
    else go();
  };

  const remove = async () => {
    setMenu(false);
    if (!(await confirm({ title: "Delete this booking?", body: "It disappears from your agenda. This can’t be undone.", confirm: "Delete", danger: true }))) return;
    start(async () => {
      const r = await deleteBooking(b.id);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast("Booking deleted");
      router.replace("/admin/bookings");
    });
  };

  const first = (b.name || "").split(" ")[0];
  const when = [f.date ? dayLabel(f.date) : "", f.time].filter(Boolean).join(" · ");
  const message = [`السلام عليكم ${first} 👑`, `RAW هنا — موعدك: ${b.styleName}`, when ? `📅 ${when}` : "", f.area ? `📍 ${f.area}` : "", f.price ? `💰 ${price(f.price)}` : "", `نشوفك قريباً ✨`].filter(Boolean).join("\n");
  const st = BOOKING_STATUS[b.status];
  const remaining = f.price !== null ? Math.max(0, f.price - f.deposit) : null;

  return (
    <>
      <PageHeader title={`Booking #${b.id}`} back="/admin/bookings" large={false} actions={<IconButton label="More actions" onClick={() => setMenu(true)}><MoreI className="h-6 w-6" /></IconButton>} />

      <Card className="mt-2 overflow-hidden">
        <div className="flex gap-4 p-4">
          <Thumb src={image} className="h-20 w-20 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <button onClick={() => setStatusSheet(true)} aria-label={`Status: ${st.label}. Change`}><Pill cls={st.cls}>{st.label}</Pill></button>
            <p className="mt-2 text-[1.3rem] font-semibold leading-tight">{b.styleName}</p>
            <p className="mt-0.5 text-[0.88rem] text-mute">Estimate from {price(b.estimate)}</p>
          </div>
        </div>
        {b.status !== "new" && b.date && (
          <div className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3">
            <CalendarI className="h-5 w-5 shrink-0 text-sky-300" />
            <p className="min-w-0 flex-1 font-semibold">{[dayLabel(b.date), b.time].filter(Boolean).join(" · ")}{b.area ? <span className="font-normal text-mute"> · {b.area}</span> : null}</p>
            {b.price !== null && <span className="shrink-0 font-semibold tabular-nums">{price(b.price)}</span>}
          </div>
        )}
        {Object.keys(b.picks).length > 0 && (
          <dl className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.06]">
            {Object.entries(b.picks).map(([k, v]) => (
              <div key={k} className="bg-ink2 px-4 py-2.5">
                <dt className="text-[0.75rem] text-mute">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {b.status === "new" && (b.date || b.time || b.area) && (
          <p className="border-t border-white/[0.06] px-4 py-3 text-[0.88rem] text-lilac">Asked for: {[b.date ? dayLabel(b.date) : "", b.time, b.area].filter(Boolean).join(" · ")}</p>
        )}
      </Card>

      <div className="mt-3 space-y-2">
        {b.status === "new" && (
          <>
            <Button variant="primary" size="lg" className="w-full" icon={<CheckI />} loading={busy} onClick={() => status("confirmed", "Booking confirmed")}>
              {f.date ? `Confirm for ${dayLabel(f.date)}` : "Confirm booking"}
            </Button>
            <Button variant="danger" size="lg" className="w-full" icon={<CloseI />} disabled={busy} onClick={() => status("cancelled", "Request declined")}>Decline</Button>
          </>
        )}
        {b.status === "confirmed" && (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="success" size="lg" className="px-2" icon={<CheckI />} disabled={busy} onClick={() => status("done", "Marked done ✨")}>Done</Button>
            <Button variant="danger" size="lg" className="px-2" icon={<BlockI />} disabled={busy} onClick={() => status("noshow", "Marked no-show")}>No-show</Button>
            <Button size="lg" className="px-2" icon={<CloseI />} disabled={busy} onClick={() => status("cancelled", "Booking cancelled")}>Cancel</Button>
          </div>
        )}
        {(b.status === "done" || b.status === "cancelled" || b.status === "noshow") && (
          <Button size="lg" className="w-full" onClick={() => setStatusSheet(true)}>Change status</Button>
        )}
      </div>

      <Section title="Appointment" className="mt-6">
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={f.date ?? ""} onChange={(e) => set("date", e.target.value || null)} /></Field>
            <Field label="Time"><Input type="time" value={/^\d/.test(f.time) ? f.time : ""} onChange={(e) => set("time", e.target.value)} step={900} /></Field>
          </div>
          <div className="-mt-1 flex gap-2">
            {SLOTS.map((t) => (
              <button key={t} type="button" aria-pressed={f.time === t} onClick={() => set("time", f.time === t ? "" : t)} className={cx("h-9 flex-1 rounded-full border text-[0.85rem] font-semibold", f.time === t ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/75")}>{t}</button>
            ))}
          </div>
          <Field label="Area / address"><Input value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="Where you’re going" dir="auto" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Final price"><MoneyInput value={f.price} onChange={(v) => set("price", v)} optional placeholder={String(b.estimate)} /></Field>
            <Field label="Deposit received"><MoneyInput value={f.deposit} onChange={(v) => set("deposit", v ?? 0)} /></Field>
          </div>
          {remaining !== null && <p className="text-[0.88rem] text-mute">Left to pay on the day: <span className="font-semibold text-bone">{price(remaining)}</span></p>}
        </Card>
      </Section>

      <Section title="Client">
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} dir="auto" /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" /></Field>
          </div>
          <Field label="Instagram"><Input value={f.instagram} onChange={(e) => set("instagram", e.target.value.replace(/^@+/, ""))} placeholder="username" autoCapitalize="none" /></Field>
          <div className="grid grid-cols-4 gap-2">
            <Contact href={f.phone ? telHref(f.phone) : undefined} icon={<PhoneI className="h-[22px] w-[22px]" />} label="Call" tone="bg-emerald-400/[0.12] text-emerald-300" />
            <Contact href={f.phone ? waHref(f.phone, message) : undefined} icon={<WhatsAppI className="h-[22px] w-[22px]" />} label="WhatsApp" external />
            <Contact href={f.phone ? smsHref(f.phone, message) : undefined} icon={<MessageI className="h-[22px] w-[22px]" />} label="SMS" />
            <Contact href={f.instagram ? `https://ig.me/m/${f.instagram}` : "https://www.instagram.com/direct/inbox/"} icon={<InstagramI className="h-[22px] w-[22px]" />} label={f.instagram ? "DM" : "Inbox"} external />
          </div>
          {f.phone && <p className="text-[0.84rem] text-mute">{prettyPhone(f.phone)}</p>}
          <Button className="w-full" icon={<CopyI />} onClick={async () => { await copyText(message); toast("Confirmation message copied"); }}>Copy confirmation message</Button>
        </Card>
      </Section>

      <Section title="Private note">
        <TextArea value={f.adminNote} onChange={(e) => set("adminNote", e.target.value)} minRows={2} placeholder="Hair length, colours to bring, gate code…" />
      </Section>

      <Section title="History">
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {[...b.history].reverse().map((h, i) => (
            <li key={i} className="relative">
              <span className={cx("absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-abyss", i === 0 ? "bg-lilac" : "bg-white/25")} />
              <p className="text-[0.92rem]">{h.text}</p>
              <p className="text-[0.78rem] text-mute" suppressHydrationWarning>{stamp(h.at)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <SaveBar dirty={dirty} saving={busy} onSave={() => save()} onDiscard={() => setF(initial)} />

      <Sheet open={menu} onClose={() => setMenu(false)} title={`Booking #${b.id}`}>
        <div className="-mx-2 flex flex-col">
          <MenuItem icon={<CopyI />} label="Copy confirmation message" onClick={async () => { setMenu(false); await copyText(message); toast("Copied"); }} />
          <MenuItem icon={<RefreshI />} label="Change status" onClick={() => { setMenu(false); setStatusSheet(true); }} />
          <MenuItem icon={<TrashI />} label="Delete booking" danger onClick={remove} />
        </div>
      </Sheet>

      <Sheet open={statusSheet} onClose={() => setStatusSheet(false)} title="Change status">
        <div className="-mx-2 flex flex-col" role="radiogroup">
          {(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((s) => (
            <button key={s} role="radio" aria-checked={b.status === s} onClick={() => { setStatusSheet(false); if (s !== b.status) status(s, `Marked ${BOOKING_STATUS[s].label.toLowerCase()}`); }} className="flex h-14 items-center gap-3 rounded-2xl px-3 text-left active:bg-white/[0.05]">
              <span className={cx("h-2.5 w-2.5 rounded-full", BOOKING_STATUS[s].dot)} />
              <span className="flex-1 font-medium">{BOOKING_STATUS[s].label}</span>
              {b.status === s && <CheckI className="h-5 w-5 text-lilac" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function pickForm(b: Booking) {
  return { date: b.date, time: b.time, area: b.area, price: b.price, deposit: b.deposit, name: b.name, phone: b.phone, instagram: b.instagram, adminNote: b.adminNote };
}

function Contact({ href, icon, label, tone = "bg-white/[0.06] text-bone/85", external }: { href?: string; icon: React.ReactNode; label: string; tone?: string; external?: boolean }) {
  const cls = cx("flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[0.75rem] font-medium", tone, !href && "pointer-events-none opacity-35");
  return href ? (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cls}>{icon} {label}</a>
  ) : (
    <span className={cls} aria-disabled>{icon} {label}</span>
  );
}
