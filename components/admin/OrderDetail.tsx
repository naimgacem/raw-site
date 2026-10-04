"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteOrder, orderNoAnswer, setOrderStatus, updateOrderInfo, type Result } from "@/app/admin/actions";
import type { history as historyFn } from "@/lib/admin-data";
import { WILAYA_LIST } from "@/lib/algeria";
import { stamp } from "@/lib/dates";
import { copyText } from "@/lib/messages";
import { courierText, orderText } from "@/lib/order";
import { price } from "@/lib/site";
import type { Order, OrderStatus } from "@/lib/types";
import { prettyPhone, smsHref, telHref, waHref } from "./contact";
import { useShell } from "./Shell";
import { Banner, Button, Card, IconButton, Input, MenuItem, ORDER_STATUS, PageHeader, Pill, Section, Sheet, TextArea, Thumb, cx } from "./ui";
import {
  AlertI, BlockI, CheckI, ClockI, CloseI, CopyI, EditI, HomeI, MessageI, MoreI, PhoneI, PinI, RefreshI, StoreI, TrashI, TruckI, UserI, WhatsAppI,
} from "./icons";

type Past = ReturnType<typeof historyFn>;
const STEPS: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];

export default function OrderDetail({ order, past, blocked }: { order: Order; past: Past; blocked: boolean }) {
  const { toast, confirm, go } = useShell();
  const router = useRouter();
  const [o, setO] = useState(order);
  useEffect(() => setO(order), [order]);
  const [busy, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);
  const [shipSheet, setShipSheet] = useState(false);
  const [tracking, setTracking] = useState(order.tracking);
  const [note, setNote] = useState(order.adminNote);
  const [noteSaved, setNoteSaved] = useState(order.adminNote);

  const w = WILAYA_LIST.find((x) => x.code === o.wilaya);
  const first = o.name.split(" ")[0];

  const run = (fn: () => Promise<Result>, ok: string, optimistic?: Partial<Order>, undo?: OrderStatus) => {
    const before = o;
    if (optimistic) setO((x) => ({ ...x, ...optimistic }));
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setO(before);
        toast(r.error, { tone: "error" });
      } else {
        toast(ok, undo ? { action: { label: "Undo", run: () => run(() => setOrderStatus(o.id, undo), "Changed back", { status: undo }) } } : undefined);
      }
    });
  };

  const setStatus = (s: OrderStatus, msg: string, track?: string) =>
    run(() => setOrderStatus(o.id, s, track), msg, { status: s, ...(track !== undefined && { tracking: track }) }, o.status);

  const askThen = async (s: OrderStatus, title: string, body: string, label: string) => {
    if (await confirm({ title, body, confirm: label, danger: true })) setStatus(s, `Marked ${ORDER_STATUS[s].label.toLowerCase()}`);
  };

  const saveNote = () => {
    if (note === noteSaved) return;
    start(async () => {
      const r = await updateOrderInfo(o.id, { adminNote: note });
      if (r.ok) { setNoteSaved(note); toast("Note saved"); } else toast(r.error, { tone: "error" });
    });
  };

  const copy = async (text: string, what: string) => {
    await copyText(text);
    toast(`${what} copied`);
  };

  const remove = async () => {
    setMenu(false);
    if (!(await confirm({ title: `Delete order #${o.id}?`, body: "It disappears from your lists and totals. This can’t be undone.", confirm: "Delete order", danger: true }))) return;
    start(async () => {
      const r = await deleteOrder(o.id);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(`Order #${o.id} deleted`);
      router.replace("/admin/orders");
    });
  };

  const message = [
    `السلام عليكم ${first} 👑`,
    `RAW هنا — نؤكد طلبك رقم #${o.id}:`,
    ...o.items.map((l) => `• ${l.qty}× ${l.name}${l.variantName ? ` (${l.variantName})` : ""}`),
    `المجموع: ${price(o.total)} (الدفع عند الاستلام)`,
    `هل نرسل الطلب؟ ✅`,
  ].join("\n");

  const stepIndex = STEPS.indexOf(o.status);
  const st = ORDER_STATUS[o.status];

  return (
    <>
      <PageHeader
        title={`Order #${o.id}`}
        back="/admin/orders"
        large={false}
        actions={<IconButton label="More actions" onClick={() => setMenu(true)}><MoreI className="h-6 w-6" /></IconButton>}
      />

      {/* status + the next step */}
      <Card className="mt-2 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setStatusSheet(true)} className="flex items-center gap-1.5" aria-label={`Status: ${st.label}. Change`}>
            <Pill cls={st.cls} className="h-7 px-3 text-[0.82rem]">{st.label}</Pill>
          </button>
          <span className="text-[0.82rem] text-mute" suppressHydrationWarning>{stamp(o.createdAt)} · {o.source === "website" ? "Website" : o.source}</span>
        </div>
        <p className="mt-4 text-[2.4rem] font-semibold leading-none tracking-tight">{price(o.total)}</p>
        <p className="mt-1.5 text-[0.88rem] text-mute">Cash on delivery · {o.items.reduce((n, l) => n + l.qty, 0)} item{o.items.reduce((n, l) => n + l.qty, 0) === 1 ? "" : "s"}</p>

        {o.status !== "cancelled" && (
          <ol className="mt-5 flex items-center" aria-label="Progress">
            {STEPS.map((s, i) => {
              const done = o.status === "returned" ? i <= 2 : i <= stepIndex;
              return (
                <li key={s} className={cx("flex items-center", i > 0 && "flex-1")}>
                  {i > 0 && <span className={cx("mx-1 h-[2px] flex-1 rounded-full", done ? "bg-lilac" : "bg-white/10")} />}
                  <span className="flex flex-col items-center">
                    <span className={cx("grid h-7 w-7 place-items-center rounded-full text-[0.7rem] font-bold", done ? "bg-lilac text-abyss" : "border border-white/15 text-mute")}>
                      {done ? <CheckI className="h-4 w-4" /> : i + 1}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {o.status !== "cancelled" && (
          <div className="mt-1.5 flex justify-between text-[0.7rem] font-medium text-mute">
            {STEPS.map((s) => <span key={s} className="w-14 text-center first:text-left last:text-right">{ORDER_STATUS[s].label}</span>)}
          </div>
        )}

        <div className="mt-5 space-y-2">
          {o.status === "new" && (
            <>
              <Button variant="primary" size="lg" className="w-full" icon={<CheckI />} disabled={busy} onClick={() => setStatus("confirmed", "Order confirmed")}>Customer confirmed</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" icon={<ClockI />} disabled={busy} onClick={() => run(() => orderNoAnswer(o.id), "Noted — call again later", { attempts: o.attempts + 1 })}>No answer{o.attempts ? ` (${o.attempts})` : ""}</Button>
                <Button size="lg" variant="danger" icon={<CloseI />} disabled={busy} onClick={() => askThen("cancelled", "Cancel this order?", "The customer won’t receive it. You can change the status again later.", "Cancel order")}>Cancel</Button>
              </div>
            </>
          )}
          {o.status === "confirmed" && (
            <>
              <Button variant="primary" size="lg" className="w-full" icon={<TruckI />} disabled={busy} onClick={() => setShipSheet(true)}>Hand to courier</Button>
              <Button size="lg" variant="danger" className="w-full" icon={<CloseI />} disabled={busy} onClick={() => askThen("cancelled", "Cancel this order?", "The customer won’t receive it.", "Cancel order")}>Cancel order</Button>
            </>
          )}
          {o.status === "shipped" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" size="lg" icon={<CheckI />} disabled={busy} onClick={() => setStatus("delivered", "Delivered & paid 🎉")}>Delivered</Button>
              <Button variant="danger" size="lg" icon={<RefreshI />} disabled={busy} onClick={() => askThen("returned", "Mark as returned?", "Use this when the customer refused the parcel or it came back.", "Mark returned")}>Returned</Button>
            </div>
          )}
          {(o.status === "delivered" || o.status === "returned" || o.status === "cancelled") && (
            <Button size="lg" className="w-full" disabled={busy} onClick={() => setStatusSheet(true)}>Change status</Button>
          )}
        </div>
      </Card>

      {/* how this customer behaved before */}
      {(blocked || past.count > 0) && (
        <Link href={`/admin/customers?q=${encodeURIComponent(o.phone)}`} className="mt-3 block">
          {blocked ? (
            <Banner tone="danger" icon={<BlockI className="h-5 w-5" />}>This number is on your block list. Think twice before shipping.</Banner>
          ) : past.returned > 0 ? (
            <Banner tone="danger" icon={<AlertI className="h-5 w-5" />}>Returned {past.returned} of {past.count} earlier order{past.count === 1 ? "" : "s"}. Confirm carefully.</Banner>
          ) : past.delivered > 0 ? (
            <Banner tone="ok" icon={<CheckI className="h-5 w-5" />}>Good customer — {past.delivered} earlier order{past.delivered === 1 ? "" : "s"} delivered.</Banner>
          ) : (
            <Banner tone="info" icon={<UserI className="h-5 w-5" />}>{past.count} earlier order{past.count === 1 ? "" : "s"} from this number.</Banner>
          )}
        </Link>
      )}

      <Section title="Customer" className="mt-6">
        <Card className="p-4">
          <p className="text-[1.25rem] font-semibold leading-tight" dir="auto">{o.name}</p>
          <a href={telHref(o.phone)} className="mt-1 block text-[1.05rem] tabular-nums text-lilac">{prettyPhone(o.phone)}</a>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Contact href={telHref(o.phone)} icon={<PhoneI className="h-[22px] w-[22px]" />} label="Call" tone="bg-emerald-400/[0.12] text-emerald-300" />
            <Contact href={waHref(o.phone, message)} icon={<WhatsAppI className="h-[22px] w-[22px]" />} label="WhatsApp" external />
            <Contact href={smsHref(o.phone, message)} icon={<MessageI className="h-[22px] w-[22px]" />} label="SMS" />
            <button onClick={() => copy(o.phone, "Number")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 text-[0.75rem] font-medium text-bone/85 active:bg-white/10">
              <CopyI className="h-[22px] w-[22px]" /> Copy
            </button>
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex items-start gap-3">
              <PinI className="mt-0.5 h-5 w-5 shrink-0 text-mute" />
              <div className="min-w-0 flex-1 text-[0.95rem] leading-snug">
                <p className="font-medium">{w ? `${w.code} ${w.fr}` : o.wilaya} <span className="font-ar text-mute">· {w?.ar}</span></p>
                <p className="text-bone/85" dir="auto">{o.commune}</p>
                {o.address && <p className="mt-1 text-bone/85" dir="auto">{o.address}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-[0.85rem] text-mute">
                  {o.delivery === "desk" ? <StoreI className="h-4 w-4" /> : <HomeI className="h-4 w-4" />}
                  {o.delivery === "desk" ? "Stop desk (customer picks up)" : "Home delivery"}
                </p>
              </div>
              <IconButton label="Copy address" className="-mr-2 -mt-2 text-mute" onClick={() => copy([w ? `${w.code} ${w.fr}` : o.wilaya, o.commune, o.address].filter(Boolean).join(", "), "Address")}><CopyI /></IconButton>
            </div>
            {o.note && <p className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-[0.92rem] leading-relaxed text-bone/85" dir="auto">“{o.note}”</p>}
          </div>
        </Card>
      </Section>

      <Section title="Items">
        <Card className="p-4">
          <ul className="space-y-3">
            {o.items.map((l, i) => (
              <li key={i} className="flex items-center gap-3">
                <Thumb src={l.image} className="h-14 w-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-[0.84rem] text-mute">{l.variantName && `${l.variantName} · `}{l.qty} × {price(l.price)}</p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{price(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-[0.92rem]">
            <Line k="Products" v={price(o.subtotal)} />
            <Line k={o.delivery === "desk" ? "Delivery (stop desk)" : "Delivery (home)"} v={o.shipping ? price(o.shipping) : "Free"} />
            {o.discount > 0 && <Line k={`Discount${o.coupon ? ` · ${o.coupon}` : ""}`} v={`−${price(o.discount)}`} tone="text-emerald-300" />}
            <div className="flex items-baseline justify-between pt-1.5 text-[1.05rem] font-semibold"><dt>To collect</dt><dd className="tabular-nums">{price(o.total)}</dd></div>
          </dl>
        </Card>
      </Section>

      {(o.status === "shipped" || o.status === "delivered" || o.status === "returned" || o.tracking) && (
        <Section title="Tracking number">
          <div className="flex gap-2">
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. yal-ABC123" autoCapitalize="characters" className="flex-1 font-mono" />
            <Button size="lg" disabled={busy || tracking === o.tracking} onClick={() => run(() => updateOrderInfo(o.id, { tracking }), "Tracking saved", { tracking })}>Save</Button>
          </div>
        </Section>
      )}

      <Section title="Private note" hint={note !== noteSaved ? "Saves when you leave the box." : "Only you see this."}>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} minRows={2} placeholder="e.g. Call after 18h, wants gift wrap…" />
      </Section>

      <Section title="History">
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {[...o.history].reverse().map((h, i) => (
            <li key={i} className="relative">
              <span className={cx("absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-abyss", i === 0 ? "bg-lilac" : "bg-white/25")} />
              <p className="text-[0.92rem]">{h.text}</p>
              <p className="text-[0.78rem] text-mute" suppressHydrationWarning>{stamp(h.at)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ⋯ menu */}
      <Sheet open={menu} onClose={() => setMenu(false)} title={`Order #${o.id}`}>
        <div className="-mx-2 flex flex-col">
          <MenuItem icon={<EditI />} label="Edit order" sub="Products, address, delivery fee" onClick={() => { setMenu(false); go(`/admin/orders/${o.id}/edit`); }} />
          <MenuItem icon={<TruckI />} label="Copy for courier" sub="Name, phone, address, amount" onClick={() => { setMenu(false); copy(courierText(o), "Courier details"); }} />
          <MenuItem icon={<CopyI />} label="Copy full order" onClick={() => { setMenu(false); copy(orderText(o), "Order"); }} />
          <MenuItem icon={<RefreshI />} label="Change status" onClick={() => { setMenu(false); setStatusSheet(true); }} />
          <MenuItem icon={<TrashI />} label="Delete order" danger onClick={remove} />
        </div>
      </Sheet>

      {/* any status, for corrections */}
      <Sheet open={statusSheet} onClose={() => setStatusSheet(false)} title="Change status">
        <div className="-mx-2 flex flex-col" role="radiogroup">
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
            <button
              key={s} role="radio" aria-checked={o.status === s}
              onClick={() => { setStatusSheet(false); if (s !== o.status) setStatus(s, `Marked ${ORDER_STATUS[s].label.toLowerCase()}`); }}
              className="flex h-14 items-center gap-3 rounded-2xl px-3 text-left active:bg-white/[0.05]"
            >
              <span className={cx("h-2.5 w-2.5 rounded-full", ORDER_STATUS[s].dot)} />
              <span className="flex-1 font-medium">{ORDER_STATUS[s].label}</span>
              {o.status === s && <CheckI className="h-5 w-5 text-lilac" />}
            </button>
          ))}
        </div>
      </Sheet>

      {/* hand to courier: optional tracking number */}
      <Sheet
        open={shipSheet} onClose={() => setShipSheet(false)} title="Hand to courier"
        footer={<Button variant="primary" size="lg" className="w-full" icon={<TruckI />} onClick={() => { setShipSheet(false); setStatus("shipped", "Marked shipped", tracking); }}>Mark as shipped</Button>}
      >
        <p className="text-[0.92rem] text-mute">Add the tracking number if you have it — you can also add it later.</p>
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number (optional)" autoCapitalize="characters" className="mt-3 font-mono" />
        <Button className="mt-3 w-full" icon={<CopyI />} onClick={() => copy(courierText(o), "Courier details")}>Copy details for the courier</Button>
      </Sheet>
    </>
  );
}

function Contact({ href, icon, label, tone = "bg-white/[0.06] text-bone/85", external }: { href: string; icon: React.ReactNode; label: string; tone?: string; external?: boolean }) {
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cx("flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[0.75rem] font-medium active:opacity-80", tone)}>
      {icon} {label}
    </a>
  );
}

function Line({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between text-mute">
      <dt>{k}</dt>
      <dd className={cx("tabular-nums", tone ?? "text-bone")}>{v}</dd>
    </div>
  );
}
