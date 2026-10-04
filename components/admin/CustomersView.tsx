"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { setBlocked } from "@/app/admin/actions";
import type { Customer, OrderRow } from "@/lib/admin-data";
import { WILAYA_LIST } from "@/lib/algeria";
import { ago } from "@/lib/dates";
import { price } from "@/lib/site";
import { prettyPhone, telHref, waHref } from "./contact";
import OrderCard from "./OrderCard";
import { useShell } from "./Shell";
import { Button, Chips, Empty, PageHeader, Pill, SearchInput, Sheet, cx } from "./ui";
import { BlockI, PhoneI, UsersI, WhatsAppI } from "./icons";

type Filter = "all" | "loyal" | "risky" | "blocked";

export default function CustomersView({ customers, orders, initialQuery }: { customers: Customer[]; orders: OrderRow[]; initialQuery: string }) {
  const { toast, confirm } = useShell();
  const [list, setList] = useState(customers);
  useEffect(() => setList(customers), [customers]);
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(initialQuery && customers.some((c) => c.phone === initialQuery) ? initialQuery : null);
  const [busy, start] = useTransition();

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return list.filter((c) => {
      if (filter === "loyal" && c.delivered < 2) return false;
      if (filter === "risky" && c.returned === 0) return false;
      if (filter === "blocked" && !c.blocked) return false;
      if (!term) return true;
      return (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)) || c.name.toLowerCase().includes(term);
    });
  }, [list, q, filter]);

  const c = open ? list.find((x) => x.phone === open) : null;

  const block = async (x: Customer) => {
    const to = !x.blocked;
    if (to && !(await confirm({ title: `Block ${x.name}?`, body: "Their next orders will be marked with a warning so you can check before shipping. They can still order.", confirm: "Block number", danger: true }))) return;
    start(async () => {
      const r = await setBlocked(x.phone, to);
      if (!r.ok) return toast(r.error, { tone: "error" });
      setList((l) => l.map((y) => (y.phone === x.phone ? { ...y, blocked: to } : y)));
      toast(to ? "Number blocked" : "Number unblocked");
    });
  };

  return (
    <>
      <PageHeader title="Customers" back="/admin/more" sub={`${list.length} people have ordered`} />
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 space-y-2.5 bg-abyss/90 px-4 pb-3 pt-1 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <SearchInput value={q} onChange={setQ} placeholder="Name or phone" />
        <Chips<Filter>
          label="Filter customers" value={filter} onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "loyal", label: "Loyal", count: list.filter((x) => x.delivered >= 2).length },
            { value: "risky", label: "Returned", count: list.filter((x) => x.returned > 0).length },
            { value: "blocked", label: "Blocked", count: list.filter((x) => x.blocked).length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Empty icon={<UsersI className="h-7 w-7" />} title={list.length ? "No match" : "No customers yet"} text={list.length ? undefined : "Everyone who orders shows up here, with how many orders they took or sent back."} />
      ) : (
        <ul className="mt-2 space-y-2">
          {shown.slice(0, 200).map((x) => (
            <li key={x.phone}>
              <button onClick={() => setOpen(x.phone)} className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.06] bg-ink2 p-3.5 text-left active:bg-ink3/60">
                <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-[1rem] font-semibold", x.blocked ? "bg-rose-500/15 text-rose-300" : "bg-lilac/[0.12] text-lilac")}>
                  {x.blocked ? <BlockI /> : initials(x.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold" dir="auto">{x.name}</span>
                  <span className="block truncate text-[0.84rem] text-mute">{prettyPhone(x.phone)} · {WILAYA_LIST.find((w) => w.code === x.wilaya)?.fr}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[0.8rem] text-bone/70">{x.orders} order{x.orders === 1 ? "" : "s"}</span>
                    {x.delivered >= 2 && <Pill cls="bg-emerald-400/15 text-emerald-300">Loyal</Pill>}
                    {x.returned > 0 && <Pill cls="bg-rose-500/15 text-rose-300">{x.returned} returned</Pill>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={cx("block font-semibold tabular-nums", !x.spent && "text-mute")}>{x.spent ? price(x.spent) : "—"}</span>
                  <span className="block text-[0.78rem] text-mute" suppressHydrationWarning>{ago(x.last)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!c} onClose={() => setOpen(null)} title={c?.name ?? ""}>
        {c && (
          <>
            <p className="-mt-1 text-[1.02rem] tabular-nums text-lilac">{prettyPhone(c.phone)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={telHref(c.phone)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400/[0.14] font-semibold text-emerald-300"><PhoneI /> Call</a>
              <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/[0.08] font-semibold"><WhatsAppI /> WhatsApp</a>
            </div>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[["Orders", c.orders], ["Delivered", c.delivered], ["Returned", c.returned], ["Cancelled", c.cancelled]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/[0.04] px-1 py-2.5">
                  <dd className={cx("text-[1.2rem] font-semibold", k === "Returned" && Number(v) > 0 && "text-rose-300")}>{v}</dd>
                  <dt className="text-[0.7rem] text-mute">{k}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.88rem] text-mute">Spent on delivered orders: <span className="font-semibold text-bone">{price(c.spent)}</span></p>
            <h3 className="mb-2 mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-mute">Orders</h3>
            <div className="space-y-2">{orders.filter((o) => o.phone === c.phone).map((o) => <OrderCard key={o.id} o={o} />)}</div>
            <Button variant={c.blocked ? "secondary" : "danger"} size="lg" className="mt-5 w-full" icon={<BlockI />} loading={busy} onClick={() => block(c)}>
              {c.blocked ? "Unblock number" : "Block number"}
            </Button>
          </>
        )}
      </Sheet>
    </>
  );
}

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
