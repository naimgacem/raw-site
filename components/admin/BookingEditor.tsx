"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBooking } from "@/app/admin/actions";
import { price } from "@/lib/site";
import type { HairStyle } from "@/lib/types";
import { useDirty, useShell } from "./Shell";
import { BottomBar, Button, Card, Field, Input, MoneyInput, PageHeader, Section, Select, TextArea, cx } from "./ui";

const SLOTS = ["Morning", "Afternoon", "Evening"];

/** Adds an appointment taken by DM or phone. */
export default function BookingEditor({ styles }: { styles: HairStyle[] }) {
  const router = useRouter();
  const { toast } = useShell();
  const [busy, start] = useTransition();
  const [slug, setSlug] = useState(styles[0]?.slug ?? "");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [f, setF] = useState({ date: "", time: "", area: "", name: "", phone: "", instagram: "", note: "" });
  const [priceV, setPrice] = useState<number | null>(null);
  const [deposit, setDeposit] = useState(0);
  const style = styles.find((s) => s.slug === slug);
  useDirty(!busy && (Object.values(f).some(Boolean) || priceV !== null || deposit > 0));

  const chosen = Object.fromEntries((style?.options ?? []).map((o) => [o.label, o.choices[picks[o.label] ?? 0]]).filter(([, c]) => c)) as Record<string, { label: string; add: number }>;
  const estimate = (style?.from ?? 0) + Object.values(chosen).reduce((n, c) => n + c.add, 0);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = () =>
    start(async () => {
      if (!style) return toast("Pick a style", { tone: "error" });
      const r = await createBooking({
        style: style.slug, styleName: style.name, picks: Object.fromEntries(Object.entries(chosen).map(([k, c]) => [k, c.label])), estimate,
        date: f.date || null, time: f.time, area: f.area, name: f.name, phone: f.phone, instagram: f.instagram, price: priceV, deposit, note: "", adminNote: f.note,
        status: f.date ? "confirmed" : "new",
      });
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(f.date ? "Booking added to the agenda" : "Request saved");
      router.replace(`/admin/bookings/${r.id}`);
    });

  return (
    <>
      <PageHeader title="New booking" back="/admin/bookings" large={false} />
      <p className="mt-1 px-1 text-[0.92rem] text-mute">For appointments made by DM or phone.</p>

      <Section title="Style" className="mt-5">
        <Card className="space-y-4 p-4">
          <Select value={slug} onChange={(e) => { setSlug(e.target.value); setPicks({}); }} aria-label="Style">
            {styles.map((s) => <option key={s.slug} value={s.slug}>{s.name}{s.hidden ? " (hidden)" : ""}</option>)}
          </Select>
          {style?.options.map((o) => (
            <div key={o.label}>
              <p className="mb-2 text-[0.85rem] font-medium text-bone/80">{o.label}</p>
              <div className="flex flex-wrap gap-2">
                {o.choices.map((c, i) => (
                  <button key={c.label} type="button" aria-pressed={(picks[o.label] ?? 0) === i} onClick={() => setPicks((p) => ({ ...p, [o.label]: i }))} className={cx("h-10 rounded-full border px-4 text-[0.88rem] font-semibold", (picks[o.label] ?? 0) === i ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/80")}>
                    {c.label}{c.add > 0 && <span className="ml-1 font-normal opacity-70">+{price(c.add)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[0.88rem] text-mute">Menu estimate: <span className="font-semibold text-bone">from {price(estimate)}</span></p>
        </Card>
      </Section>

      <Section title="When & where">
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Time"><Input type="time" value={/^\d/.test(f.time) ? f.time : ""} onChange={(e) => set("time", e.target.value)} step={900} /></Field>
          </div>
          <div className="-mt-1 flex gap-2">
            {SLOTS.map((t) => (
              <button key={t} type="button" aria-pressed={f.time === t} onClick={() => set("time", f.time === t ? "" : t)} className={cx("h-9 flex-1 rounded-full border text-[0.85rem] font-semibold", f.time === t ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/75")}>{t}</button>
            ))}
          </div>
          <Field label="Area / address"><Input value={f.area} onChange={(e) => set("area", e.target.value)} dir="auto" /></Field>
        </Card>
      </Section>

      <Section title="Client">
        <Card className="space-y-4 p-4">
          <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} dir="auto" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" /></Field>
            <Field label="Instagram"><Input value={f.instagram} onChange={(e) => set("instagram", e.target.value.replace(/^@+/, ""))} placeholder="username" autoCapitalize="none" /></Field>
          </div>
        </Card>
      </Section>

      <Section title="Money">
        <Card className="grid grid-cols-2 gap-3 p-4">
          <Field label="Final price"><MoneyInput value={priceV} onChange={setPrice} optional placeholder={String(estimate)} /></Field>
          <Field label="Deposit received"><MoneyInput value={deposit} onChange={(v) => setDeposit(v ?? 0)} /></Field>
        </Card>
      </Section>

      <Section title="Private note">
        <TextArea value={f.note} onChange={(e) => set("note", e.target.value)} minRows={2} placeholder="Hair length, colours, gate code…" />
      </Section>

      <BottomBar>
        <p className="min-w-0 flex-1 text-[0.85rem] leading-snug text-mute">{f.date ? "Goes straight into your agenda." : "No date yet — saved as a request."}</p>
        <Button variant="primary" size="lg" loading={busy} onClick={save}>{f.date ? "Add booking" : "Save request"}</Button>
      </BottomBar>
    </>
  );
}
