"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveOrder } from "@/app/admin/actions";
import type { ResolvedWilaya } from "@/lib/algeria";
import { price } from "@/lib/site";
import type { DeliveryType, Order, OrderLine, OrderStatus, Product } from "@/lib/types";
import { useDirty, useShell } from "./Shell";
import { BottomBar, Button, Card, Empty, Field, IconButton, Input, MoneyInput, PageHeader, SearchInput, Section, Segmented, Select, Sheet, Stepper, TextArea, Thumb, cx, same } from "./ui";
import { OrdersI, PlusI, TrashI } from "./icons";

let communesCache: Promise<Record<string, [string, string][]>> | null = null;
const loadCommunes = () => (communesCache ??= fetch("/data/communes.json").then((r) => r.json()));

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "in person", label: "In person" },
];

export default function OrderEditor({ order, products, wilayas, freeOver }: { order?: Order; products: Product[]; wilayas: ResolvedWilaya[]; freeOver: number }) {
  const router = useRouter();
  const { toast } = useShell();
  const [busy, start] = useTransition();
  const [lines, setLines] = useState<OrderLine[]>(order?.items ?? []);
  const [f, setF] = useState({
    name: order?.name ?? "", phone: order?.phone ?? "", wilaya: order?.wilaya ?? "", commune: order?.commune ?? "",
    address: order?.address ?? "", delivery: (order?.delivery ?? "home") as DeliveryType, note: order?.note ?? "",
  });
  const [shipping, setShipping] = useState<number | null>(order ? order.shipping : null); // null = automatic
  const [discount, setDiscount] = useState(order?.discount ?? 0);
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [source, setSource] = useState("instagram");
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [communes, setCommunes] = useState<Record<string, [string, string][]> | null>(null);
  useEffect(() => { loadCommunes().then(setCommunes).catch(() => {}); }, []);

  const w = wilayas.find((x) => x.code === f.wilaya);
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const autoFee = w ? (f.delivery === "desk" ? w.desk ?? w.home : w.home) : 0;
  const auto = freeOver > 0 && subtotal - discount >= freeOver ? 0 : autoFee;
  const fee = shipping ?? auto;
  const total = Math.max(0, subtotal - Math.min(discount, subtotal)) + fee;

  const dirty = useMemo(() => !same([lines, f, shipping, discount], [order?.items ?? [], {
    name: order?.name ?? "", phone: order?.phone ?? "", wilaya: order?.wilaya ?? "", commune: order?.commune ?? "",
    address: order?.address ?? "", delivery: order?.delivery ?? "home", note: order?.note ?? "",
  }, order ? order.shipping : null, order?.discount ?? 0]), [lines, f, shipping, discount, order]);
  useDirty(dirty && !busy);

  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v, ...(k === "wilaya" ? { commune: "" } : {}) }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const add = (p: Product, vi: number) => {
    const v = p.variants[vi];
    setLines((ls) => {
      const i = ls.findIndex((l) => l.slug === p.slug && l.variant === v.id);
      if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, qty: Math.min(99, l.qty + 1) } : l));
      return [...ls, { slug: p.slug, variant: v.id, name: p.name, variantName: p.variants.length > 1 ? v.name : "", image: v.image, price: p.price, qty: 1 }];
    });
    setErrors((e) => ({ ...e, items: "" }));
    setPicker(false);
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (lines.length === 0) e.items = "Add at least one product.";
    if (f.name.trim().length < 2) e.name = "Add the customer’s name.";
    if (f.phone.replace(/\D/g, "").length < 9) e.phone = "Add a phone number.";
    if (!f.wilaya) e.wilaya = "Pick a wilaya.";
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast("Some details are missing", { tone: "error" });
      return;
    }
    start(async () => {
      const r = await saveOrder({ ...f, items: lines, shipping: fee, discount, status, source }, order?.id);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(order ? "Order updated" : `Order #${r.id} created`);
      router.replace(`/admin/orders/${r.id}`);
    });
  };

  return (
    <>
      <PageHeader title={order ? `Edit #${order.id}` : "New order"} back={order ? `/admin/orders/${order.id}` : "/admin/orders"} large={false} />
      {!order && <p className="mt-1 px-1 text-[0.92rem] text-mute">For orders taken by DM, phone or in person — they’ll appear with the website orders.</p>}

      <Section title="Products" className="mt-5">
        <Card className={cx("p-2", errors.items && "border-rose-400/50")}>
          {lines.length === 0 ? (
            <p className="px-3 py-4 text-center text-[0.92rem] text-mute">No products yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {lines.map((l, i) => (
                <li key={`${l.slug}-${l.variant}`} className="flex items-center gap-3 p-2">
                  <Thumb src={l.image} className="h-14 w-14 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-[0.84rem] text-mute">{l.variantName ? `${l.variantName} · ` : ""}{price(l.price)}</p>
                    <div className="mt-1.5"><Stepper value={l.qty} onChange={(q) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, qty: q } : x)))} /></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{price(l.price * l.qty)}</span>
                    <IconButton label={`Remove ${l.name}`} className="-mr-2 h-10 w-10 text-mute" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><TrashI className="h-[18px] w-[18px]" /></IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button className="mt-1 w-full" icon={<PlusI className="h-4 w-4" />} onClick={() => setPicker(true)}>Add product</Button>
        </Card>
        {errors.items && <p className="mt-1.5 px-1 text-[0.8rem] text-rose-300">{errors.items}</p>}
      </Section>

      <Section title="Customer">
        <Card className="space-y-4 p-4">
          <Field label="Full name" error={errors.name}><Input value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" dir="auto" placeholder="Nom complet" /></Field>
          <Field label="Phone" error={errors.phone}><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="off" placeholder="0555 12 34 56" /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Wilaya" error={errors.wilaya}>
              <Select value={f.wilaya} onChange={(e) => set("wilaya", e.target.value)}>
                <option value="">Choose…</option>
                {wilayas.map((x) => <option key={x.code} value={x.code}>{x.code} – {x.fr}{x.off ? " (no delivery)" : ""}</option>)}
              </Select>
            </Field>
            <Field label="Commune">
              <Select value={f.commune} onChange={(e) => set("commune", e.target.value)} disabled={!f.wilaya}>
                <option value="">{f.wilaya && !communes ? "Loading…" : "Choose…"}</option>
                {f.commune && !(communes?.[f.wilaya] ?? []).some(([fr, ar]) => `${fr} / ${ar}` === f.commune) && <option value={f.commune}>{f.commune}</option>}
                {(communes?.[f.wilaya] ?? []).map(([fr, ar]) => <option key={fr} value={`${fr} / ${ar}`}>{fr}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Address (optional)"><Input value={f.address} onChange={(e) => set("address", e.target.value)} autoComplete="off" dir="auto" placeholder="Street, building, landmark" /></Field>
          <Field label="Delivery">
            <Segmented
              label="Delivery type" value={f.delivery} onChange={(v) => set("delivery", v)}
              options={[{ value: "home", label: "Home" }, { value: "desk", label: w && w.desk === null ? "Stop desk (none)" : "Stop desk" }]}
            />
          </Field>
          <Field label="Customer note (optional)"><TextArea value={f.note} onChange={(e) => set("note", e.target.value)} minRows={2} dir="auto" /></Field>
        </Card>
      </Section>

      <Section title="Money">
        <Card className="space-y-4 p-4">
          <Field label="Delivery fee" hint={shipping === null ? (w ? (auto === 0 && autoFee > 0 ? "Free — over your free-delivery amount." : "From your delivery prices.") : "Pick a wilaya to fill this in.") : <button className="font-semibold text-lilac" onClick={() => setShipping(null)}>Use the usual price ({price(auto)})</button>}>
            <MoneyInput value={fee} onChange={(v) => setShipping(v ?? 0)} />
          </Field>
          <Field label="Discount" hint="Taken off the products.">
            <MoneyInput value={discount} onChange={(v) => setDiscount(v ?? 0)} />
          </Field>
          <dl className="space-y-1.5 border-t border-white/[0.06] pt-3 text-[0.92rem]">
            <div className="flex justify-between text-mute"><dt>Products</dt><dd className="tabular-nums text-bone">{price(subtotal)}</dd></div>
            <div className="flex justify-between text-mute"><dt>Delivery</dt><dd className="tabular-nums text-bone">{fee ? price(fee) : w || shipping !== null ? "Free" : "—"}</dd></div>
            {discount > 0 && <div className="flex justify-between text-mute"><dt>Discount</dt><dd className="tabular-nums text-emerald-300">−{price(Math.min(discount, subtotal))}</dd></div>}
          </dl>
        </Card>
      </Section>

      {!order && (
        <Section title="Where it came from">
          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button key={s.value} type="button" aria-pressed={source === s.value} onClick={() => setSource(s.value)} className={cx("h-10 rounded-full border px-4 text-[0.9rem] font-semibold", source === s.value ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/80")}>{s.label}</button>
              ))}
            </div>
            <Field label="Status">
              <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "confirmed", label: "Already confirmed" }, { value: "new", label: "Needs a call" }]} />
            </Field>
          </Card>
        </Section>
      )}

      <BottomBar>
        <div className="min-w-0 flex-1">
          <p className="text-[0.78rem] text-mute">Total to collect</p>
          <p className="text-[1.3rem] font-semibold leading-tight tabular-nums">{price(total)}</p>
        </div>
        <Button variant="primary" size="lg" loading={busy} onClick={save}>{order ? "Save changes" : "Create order"}</Button>
      </BottomBar>

      <ProductPicker open={picker} onClose={() => setPicker(false)} products={products} onPick={add} />
    </>
  );
}

function ProductPicker({ open, onClose, products, onPick }: { open: boolean; onClose: () => void; products: Product[]; onPick: (p: Product, vi: number) => void }) {
  const [q, setQ] = useState("");
  const list = products.filter((p) => `${p.name} ${p.variants.map((v) => v.name).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title="Add product">
      <SearchInput value={q} onChange={setQ} placeholder="Search products" />
      {list.length === 0 ? (
        <Empty icon={<OrdersI className="h-7 w-7" />} title="No match" />
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {list.map((p) => (
            <li key={p.slug} className="py-3">
              <button className="flex w-full items-center gap-3 text-left" onClick={() => p.variants.length === 1 && onPick(p, 0)} disabled={p.variants.length > 1}>
                <Thumb src={p.variants[0]?.image} className="h-14 w-14 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-[0.84rem] text-mute">{price(p.price)}{p.hidden ? " · hidden" : ""}{p.soldOut ? " · sold out" : ""}</span>
                </span>
                {p.variants.length === 1 && <span className="grid h-9 w-9 place-items-center rounded-full bg-lilac text-abyss"><PlusI className="h-4 w-4" /></span>}
              </button>
              {p.variants.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-2 pl-[4.25rem]">
                  {p.variants.map((v, i) => (
                    <button key={v.id} onClick={() => onPick(p, i)} className="flex h-9 items-center gap-2 rounded-full border border-white/[0.12] pl-1.5 pr-3.5 text-[0.85rem] font-medium active:bg-white/10">
                      <span className="h-6 w-6 rounded-full ring-1 ring-white/20" style={{ background: v.swatch }} />
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
