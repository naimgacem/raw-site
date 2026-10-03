"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import {
  BagIcon, BuildingIcon, CartIcon, CheckIcon, ChevronIcon, HomeIcon, InstagramIcon, MapPinIcon, PhoneIcon,
  ReceiptIcon, SignIcon, SpinnerIcon, StoreIcon, TagIcon, TruckIcon, UserIcon, WhatsAppIcon,
} from "./Icons";
import { WILAYAS, getWilaya, normalizePhone, type DeliveryType } from "@/lib/algeria";
import { findCoupon, totals, type OrderItem } from "@/lib/order";
import { price, whatsappLink } from "@/lib/site";
import { sendViaInstagram } from "@/lib/messages";

// communes are fetched once, only when a form is on screen
let communesCache: Promise<Record<string, [string, string][]>> | null = null;
const loadCommunes = () => (communesCache ??= fetch("/data/communes.json").then((r) => r.json()));

const SAVED = "raw-order-contact-v1";
type Fields = { name: string; phone: string; wilaya: string; commune: string; address: string; delivery: DeliveryType };
const EMPTY: Fields = { name: "", phone: "", wilaya: "", commune: "", address: "", delivery: "home" };

type Done = { id: string; delivered: boolean; text: string; total: number };

/**
 * Cash-on-delivery order form ("استمارة الطلب"), modelled on the Algerian checkout pattern:
 * coupon → live summary → name / phone / wilaya / commune / address → order.
 */
const OrderForm = forwardRef<HTMLFormElement, { items: OrderItem[]; onOrdered?: () => void; title?: string }>(function OrderForm(
  { items, onOrdered, title = "استمارة الطلب" },
  ref
) {
  const { notify } = useStore();
  const [f, setF] = useState<Fields>(EMPTY);
  const [communes, setCommunes] = useState<Record<string, [string, string][]> | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [failed, setFailed] = useState(false);
  const [hp, setHp] = useState(""); // honeypot

  // remember contact details on this device
  useEffect(() => {
    try { const s = localStorage.getItem(SAVED); if (s) setF((x) => ({ ...x, ...JSON.parse(s) })); } catch {}
    loadCommunes().then(setCommunes).catch(() => {});
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SAVED, JSON.stringify(f)); } catch {}
  }, [f]);

  const w = getWilaya(f.wilaya);
  useEffect(() => { if (w && w.desk === null && f.delivery === "desk") setF((x) => ({ ...x, delivery: "home" })); }, [w, f.delivery]);

  const t = useMemo(() => totals(items, f.wilaya, f.delivery, coupon), [items, f.wilaya, f.delivery, coupon]);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === "wilaya" ? { commune: "" } : {}) }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const applyCoupon = () => {
    const c = findCoupon(couponInput);
    if (!couponInput.trim()) return;
    if (c) { setCoupon(c.code); setCouponMsg({ ok: true, text: `تم تطبيق الكود ${c.code} ✓` }); }
    else { setCoupon(""); setCouponMsg({ ok: false, text: "كود التخفيض غير صالح" }); }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (f.name.trim().length < 3) e.name = "الرجاء إدخال الإسم الكامل";
    if (!normalizePhone(f.phone)) e.phone = `رقم الهاتف غير صحيح — مثال: ${ltr("0555 12 34 56")}`;
    if (!f.wilaya) e.wilaya = "الرجاء اختيار الولاية";
    if (!f.commune) e.commune = "الرجاء اختيار البلدية";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;
    setBusy(true); setFailed(false);
    try {
      const r = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, coupon, website: hp, customer: { ...f, phone: normalizePhone(f.phone) } }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "failed");
      setDone({ id: j.id, delivered: j.delivered, text: j.text, total: j.total });
      onOrdered?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Confirmation done={done} />;

  const fallbackText = () => `${items.map((i) => `${i.qty}× ${i.slug} (${i.variant})`).join(", ")} — ${f.name} ${f.phone} ${w ? w.fr : ""} ${f.commune}`;

  return (
    <form ref={ref} onSubmit={submit} noValidate dir="rtl" lang="ar" className="scroll-mt-24 rounded-[24px] border border-white/[0.08] bg-ink2 p-4 font-ar shadow-[0_30px_80px_-40px_rgba(151,31,244,0.6)]">
      <div className="text-center">
        <h2 className="text-[1.45rem] font-extrabold leading-tight text-bone">{title}</h2>
        <p className="mt-1 text-[0.95rem] text-mute">المرجو إدخال معلوماتك الخاصة بك</p>
      </div>

      {/* coupon */}
      <div className="mt-4 flex gap-2" dir="ltr">
        <input
          value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
          placeholder="Enter coupon code" aria-label="Coupon code" autoCapitalize="characters"
          className="h-12 min-w-0 flex-1 rounded-xl border border-bone/15 bg-abyss px-4 font-sans text-[16px] uppercase text-bone placeholder:normal-case placeholder:text-mute/60"
        />
        <button type="button" onClick={applyCoupon} className="h-12 shrink-0 rounded-xl bg-gradient-to-l from-violet to-royal px-5 font-sans text-[0.95rem] font-bold text-white active:scale-[0.97]">
          Apply
        </button>
      </div>
      {couponMsg && <p className={`mt-1.5 text-sm ${couponMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{couponMsg.text}</p>}

      {/* live summary */}
      <div className="mt-3 rounded-2xl border border-white/[0.06] bg-ink3/70 p-4 text-[0.92rem]">
        <Row icon={<CartIcon />} label="سعر المنتج" value={price(t.subtotal)} />
        <Row icon={<TruckIcon />} label="سعر التوصيل" value={t.shipping === null ? "--" : price(t.shipping)} tone={t.shipping === null ? "text-rose-400" : "text-bone"} />
        <Row icon={<TagIcon />} label="الخصم" value={t.discount ? `−${price(t.discount)}` : price(0)} tone="text-emerald-400" />
        <div className="my-3 h-px bg-bone/25" />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[1.05rem] font-extrabold text-bone"><ReceiptIcon className="h-[18px] w-[18px]" /> المجموع</span>
          <span dir="ltr" className="font-sans text-[1.15rem] font-bold text-bone">{t.total === null ? "--" : price(t.total)}</span>
        </div>
      </div>

      {/* delivery type */}
      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة التوصيل">
        {([["home", "توصيل للمنزل", "À domicile", <HomeIcon key="h" />], ["desk", "مكتب التوصيل", "Stop desk", <StoreIcon key="s" />]] as const).map(([id, ar, fr, icon]) => {
          const disabled = id === "desk" && !!w && w.desk === null;
          const fee = w ? (id === "desk" ? w.desk : w.home) : null;
          return (
            <button
              key={id} type="button" role="radio" aria-checked={f.delivery === id} disabled={disabled}
              onClick={() => setF((x) => ({ ...x, delivery: id }))}
              className={`flex flex-col items-center rounded-xl border px-2 py-2.5 transition-colors disabled:opacity-35 ${f.delivery === id ? "border-lilac bg-lilac/10 text-bone" : "border-bone/15 text-mute"}`}
            >
              <span className="flex items-center gap-1.5 text-[0.95rem] font-bold">{icon}{ar}</span>
              <span className="font-sans text-[0.72rem] opacity-80">{fr}{fee !== null && fee !== undefined ? ` · ${price(fee)}` : ""}</span>
            </button>
          );
        })}
      </div>

      <Field label="الإسم الكامل" required error={errors.name} icon={<UserIcon />}>
        <input value={f.name} onChange={set("name")} placeholder="Nom complet" autoComplete="name" dir="auto" className={input} />
      </Field>
      <Field label="الهاتف" required error={errors.phone} icon={<PhoneIcon />}>
        <input value={f.phone} onChange={set("phone")} placeholder="Numéro de téléphone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={input} />
      </Field>
      <Field label="الولاية" required error={errors.wilaya} icon={<SignIcon />} select>
        <select value={f.wilaya} onChange={set("wilaya")} className={`${input} appearance-none pl-9`} dir="ltr">
          <option value="">Wilaya</option>
          {WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.fr} - {x.ar}</option>)}
        </select>
      </Field>
      <Field label="البلدية" required error={errors.commune} icon={<BuildingIcon />} select>
        <select value={f.commune} onChange={set("commune")} disabled={!f.wilaya} className={`${input} appearance-none pl-9 disabled:opacity-50`} dir="ltr">
          <option value="">{f.wilaya && !communes ? "…" : "Baladiya"}</option>
          {(communes?.[f.wilaya] ?? []).map(([fr, ar]) => <option key={fr} value={`${fr} / ${ar}`}>{fr} - {ar}</option>)}
        </select>
      </Field>
      <Field label="العنوان" icon={<MapPinIcon />}>
        <input value={f.address} onChange={set("address")} placeholder="Adresse de livraison" autoComplete="street-address" dir="auto" className={input} />
      </Field>

      {/* honeypot — hidden from people */}
      <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {failed && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          تعذر إرسال الطلب. حاول مرة أخرى أو أرسله عبر إنستغرام.
          <button type="button" className="mt-2 flex items-center gap-1.5 font-bold text-bone underline" onClick={async () => { await sendViaInstagram(fallbackText()); notify("Copied — paste it in the DM"); }}>
            <InstagramIcon className="h-4 w-4" /> Instagram DM
          </button>
        </div>
      )}

      <button
        type="submit" disabled={busy || t.lines.length === 0}
        className="mt-5 flex h-[3.6rem] w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-violet via-[#8419e0] to-royal text-[1.35rem] font-extrabold text-white shadow-[0_14px_40px_-12px_rgba(151,31,244,0.9)] transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <SpinnerIcon /> : <BagIcon className="h-6 w-6" />}
        {busy ? "جاري الإرسال…" : "اطلب الآن"}
      </button>
      <p className="mt-3 text-center text-[0.8rem] text-mute">
        💵 الدفع عند الاستلام · <span className="font-sans">Paiement à la livraison</span>
      </p>
    </form>
  );
});
export default OrderForm;

// keep numbers left-to-right inside Arabic sentences
const ltr = (s: string) => `${String.fromCharCode(0x2066)}${s}${String.fromCharCode(0x2069)}`;

const input = "h-12 w-full min-w-0 bg-transparent px-3 font-sans text-[16px] text-bone outline-none placeholder:text-mute/60 [color-scheme:dark] text-left";

function Row({ icon, label, value, tone = "text-bone" }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-mute">{icon} {label}</span>
      <span dir="ltr" className={`font-sans font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function Field({ label, required, error, icon, select, children }: { label: string; required?: boolean; error?: string; icon: React.ReactNode; select?: boolean; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-[0.95rem] font-medium text-lilac">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <span className={`relative flex items-stretch overflow-hidden rounded-xl border bg-abyss transition-colors focus-within:border-lilac ${error ? "border-rose-400/70" : "border-bone/15"}`}>
        <span className="grid w-12 shrink-0 place-items-center border-l border-bone/10 text-bone/85">{icon}</span>
        {children}
        {select && <ChevronIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />}
      </span>
      {error && <span className="mt-1 block text-[0.8rem] text-rose-400">{error}</span>}
    </label>
  );
}

function Confirmation({ done }: { done: Done }) {
  const { notify } = useStore();
  const wa = whatsappLink(done.text);
  return (
    <div dir="rtl" lang="ar" className="rounded-[24px] border border-lilac/30 bg-ink2 p-6 text-center font-ar">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet to-royal shadow-[0_0_40px_rgba(151,31,244,0.7)]"><CheckIcon className="h-8 w-8 text-white" /></span>
      <h2 className="mt-4 text-[1.5rem] font-extrabold">شكراً! تم استلام طلبك</h2>
      <p className="mt-1 font-sans text-sm text-mute" dir="ltr">Commande {done.id}</p>
      <p className="mt-3 text-bone/85">سنتصل بك قريباً لتأكيد الطلب. الدفع عند الاستلام.</p>
      <p className="mt-3 font-sans text-2xl font-bold" dir="ltr">{price(done.total)}</p>
      {!done.delivered && (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-mute">لتسريع التأكيد، أرسل الطلب في رسالة:</p>
          <button className="pill pill-lilac w-full font-sans" onClick={async () => { await sendViaInstagram(done.text); notify("Order copied — paste it in the DM"); }}>
            <InstagramIcon /> Instagram DM
          </button>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="pill pill-ghost w-full font-sans"><WhatsAppIcon /> WhatsApp</a>}
        </div>
      )}
    </div>
  );
}
