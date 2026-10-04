"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setShopOpen } from "@/app/admin/actions";
import type { dashboard } from "@/lib/admin-data";
import { dayLabel } from "@/lib/dates";
import { price } from "@/lib/site";
import OrderCard from "./OrderCard";
import OrdersChart from "./OrdersChart";
import { useLiveRefresh, useShell } from "./Shell";
import { Banner, Card, PageHeader, Section, Toggle, cx } from "./ui";
import { AlertI, CalendarI, CheckI, InfoI, NextI, OrdersI, PlusI, ShareI, StoreI } from "./icons";

type D = ReturnType<typeof dashboard>;

const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", weekday: "long", day: "numeric", month: "long" });

export default function HomeView({ d, shop, empty, dbKind }: { d: D; shop: { ordersOpen: boolean; bookingsOpen: boolean }; empty: boolean; dbKind: string }) {
  useLiveRefresh(45);
  const { toast } = useShell();
  const [open, setOpen] = useState(shop);
  const [, start] = useTransition();

  const flip = (key: "ordersOpen" | "bookingsOpen", v: boolean) => {
    setOpen((o) => ({ ...o, [key]: v }));
    start(async () => {
      const r = await setShopOpen({ [key]: v });
      if (!r.ok) { setOpen((o) => ({ ...o, [key]: !v })); toast(r.error, { tone: "error" }); }
      else toast(key === "ordersOpen" ? (v ? "Shop is taking orders" : "Orders paused") : v ? "Bookings open" : "Bookings paused");
    });
  };

  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: "RAW — Royal Art Weaves", url });
      else { await navigator.clipboard.writeText(url); toast("Shop link copied"); }
    } catch {}
  };

  const delta = d.prevSales > 0 ? Math.round(((d.monthSales - d.prevSales) / d.prevSales) * 100) : null;

  return (
    <>
      <PageHeader title="Today" sub={<span suppressHydrationWarning>{weekday.format(new Date())}</span>} />

      {!open.ordersOpen && (
        <Banner tone="warn" icon={<AlertI className="h-5 w-5" />} action={<button className="shrink-0 font-semibold underline underline-offset-2" onClick={() => flip("ordersOpen", true)}>Reopen</button>}>
          Orders are paused — customers see your “closed” message.
        </Banner>
      )}
      {dbKind === "file" && (
        <div className="mt-3">
          <Banner tone="info" icon={<InfoI className="h-5 w-5" />}>Local preview — data is saved on this computer in <code className="font-mono text-[0.85em]">.data/</code>. Connect Supabase before going live.</Banner>
        </div>
      )}

      {/* the four numbers that matter */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile href="/admin/orders?s=new" label="To confirm" value={String(d.toConfirm)} note={d.toConfirm ? "Call to confirm" : "All caught up"} hot={d.toConfirm > 0} />
        <Tile href="/admin/orders?s=confirmed" label="To ship" value={String(d.toShip)} note={d.toShip ? "Hand to the courier" : "Nothing to pack"} hot={d.toShip > 0} />
        <Tile href="/admin/orders?s=shipped" label="On the road" value={String(d.onRoad)} note={d.onRoad ? `${price(d.toCollect)} to collect` : "Nothing out"} />
        <Tile
          href="/admin/orders?s=delivered" label="Sales this month" value={price(d.monthSales)}
          note={delta !== null ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs same days last month` : `${d.monthDelivered} delivered`}
          noteTone={delta === null ? undefined : delta >= 0 ? "text-emerald-300" : "text-rose-300"}
        />
      </div>

      {d.requests > 0 && (
        <Link href="/admin/bookings?s=new" className="mt-2.5 flex items-center gap-3 rounded-[20px] border border-violet/40 bg-violet/[0.1] px-4 py-3.5 active:bg-violet/20">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet/25 text-lilac"><CalendarI /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">{d.requests} booking request{d.requests === 1 ? "" : "s"}</span><span className="block text-[0.84rem] text-lilac/80">Check the DMs and set a date</span></span>
          <NextI className="h-5 w-5 text-lilac" />
        </Link>
      )}

      <Section title="Orders" className="mt-7">
        <Card className="p-4 pb-3">
          <OrdersChart data={d.chart} />
        </Card>
        {d.returnRate !== null && <p className="mt-2 px-1 text-[0.82rem] text-mute">Return rate: <span className={cx("font-semibold", d.returnRate > 20 ? "text-rose-300" : "text-bone")}>{d.returnRate}%</span> of finished orders came back.</p>}
      </Section>

      {d.latestNew.length > 0 && (
        <Section title="Waiting for your call" action={<Link href="/admin/orders?s=new" className="flex items-center text-[0.85rem] font-semibold text-lilac">All <NextI className="h-4 w-4" /></Link>}>
          <div className="space-y-2">{d.latestNew.map((o) => <OrderCard key={o.id} o={o} call />)}</div>
        </Section>
      )}

      {d.upcoming.length > 0 && (
        <Section title="Coming up" action={<Link href="/admin/bookings?s=upcoming" className="flex items-center text-[0.85rem] font-semibold text-lilac">All <NextI className="h-4 w-4" /></Link>}>
          <div className="space-y-2">
            {d.upcoming.map((b) => (
              <Link key={b.id} href={`/admin/bookings/${b.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.06] bg-ink2 p-3 pr-4 active:bg-ink3/60">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-400/[0.12] text-center leading-none text-sky-200">
                  <span><span className="block text-[0.62rem] font-semibold uppercase">{dayLabel(b.date!).split(" ")[0]}</span><span className="mt-0.5 block text-[1.05rem] font-bold">{b.date!.slice(8)}</span></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.styleName}</span>
                  <span className="block truncate text-[0.84rem] text-mute">{[b.time, b.name, b.area].filter(Boolean).join(" · ")}</span>
                </span>
                {b.price ? <span className="shrink-0 font-semibold">{price(b.price)}</span> : null}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {empty && (
        <Section title="Getting started">
          <Card className="divide-y divide-white/[0.06]">
            {[
              ["Check your prices", "Catalog → tap a product or style", "/admin/catalog"],
              ["Set delivery fees", "Match your courier’s rates", "/admin/delivery"],
              ["Connect Telegram", "Get every order on your phone", "/admin/settings#notifications"],
            ].map(([t, s, h]) => (
              <Link key={h} href={h} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-mute"><CheckI className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block font-medium">{t}</span><span className="block text-[0.84rem] text-mute">{s}</span></span>
                <NextI className="h-5 w-5 text-mute" />
              </Link>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Quick actions">
        <div className="grid grid-cols-3 gap-2.5">
          <Quick href="/admin/orders/new" icon={<OrdersI />} label="New order" />
          <Quick href="/admin/catalog/products/new" icon={<PlusI />} label="Add product" />
          <button onClick={share} className="flex flex-col items-center gap-2 rounded-[20px] border border-white/[0.06] bg-ink2 px-2 py-4 text-[0.84rem] font-medium active:bg-ink3/60">
            <span className="text-lilac"><ShareI className="h-6 w-6" /></span>Share shop
          </button>
        </div>
      </Section>

      <Section title="Shop">
        <Card className="divide-y divide-white/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lilac"><StoreI /></span>
            <div className="min-w-0 flex-1"><p className="font-medium">Taking orders</p><p className="text-[0.82rem] text-mute">{open.ordersOpen ? "The order form is open" : "Paused — shows your closed message"}</p></div>
            <Toggle checked={open.ordersOpen} onChange={(v) => flip("ordersOpen", v)} label="Taking orders" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lilac"><CalendarI /></span>
            <div className="min-w-0 flex-1"><p className="font-medium">Taking bookings</p><p className="text-[0.82rem] text-mute">{open.bookingsOpen ? "Requests come in from the menu" : "Paused — visitors are asked to DM"}</p></div>
            <Toggle checked={open.bookingsOpen} onChange={(v) => flip("bookingsOpen", v)} label="Taking bookings" />
          </div>
        </Card>
      </Section>
    </>
  );
}

function Tile({ href, label, value, note, hot, noteTone }: { href: string; label: string; value: string; note: string; hot?: boolean; noteTone?: string }) {
  return (
    <Link href={href} className={cx("relative flex min-h-[7.25rem] flex-col rounded-[20px] border p-4 transition-colors active:bg-ink3/60", hot ? "border-violet/50 bg-[linear-gradient(160deg,rgba(151,31,244,0.22),rgba(27,23,34,1)_70%)]" : "border-white/[0.06] bg-ink2")}>
      <span className="text-[0.82rem] font-medium text-bone/75">{label}</span>
      <span className="mt-auto pt-2 text-[1.75rem] font-semibold leading-none tracking-tight">{value}</span>
      <span className={cx("mt-1.5 truncate text-[0.78rem]", noteTone ?? (hot ? "text-lilac" : "text-mute"))}>{note}</span>
      {hot && <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-violet shadow-[0_0_10px_2px_rgba(151,31,244,0.7)]" />}
    </Link>
  );
}

function Quick({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-[20px] border border-white/[0.06] bg-ink2 px-2 py-4 text-[0.84rem] font-medium active:bg-ink3/60">
      <span className="text-lilac [&>svg]:h-6 [&>svg]:w-6">{icon}</span>
      {label}
    </Link>
  );
}

