"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { OrderRow } from "@/lib/admin-data";
import { WILAYA_LIST } from "@/lib/algeria";
import { dayKey, dayLabel } from "@/lib/dates";
import { price } from "@/lib/site";
import type { OrderStatus } from "@/lib/types";
import OrderCard from "./OrderCard";
import { useLiveRefresh } from "./Shell";
import { Button, Chips, Empty, LinkButton, ORDER_STATUS, PageHeader, SearchInput } from "./ui";
import { DownloadI, OrdersI, PlusI, SearchI } from "./icons";

const FILTERS: ("all" | OrderStatus)[] = ["all", "new", "confirmed", "shipped", "delivered", "returned", "cancelled"];
const PAGE = 60;

export default function OrdersView({ rows, initialStatus, initialQuery }: { rows: OrderRow[]; initialStatus: string; initialQuery: string }) {
  useLiveRefresh(30);
  const router = useRouter();
  const path = usePathname();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>(FILTERS.includes(initialStatus as OrderStatus) ? (initialStatus as OrderStatus) : "all");
  const [q, setQ] = useState(initialQuery);
  const [limit, setLimit] = useState(PAGE);

  const pick = (s: (typeof FILTERS)[number]) => {
    setStatus(s);
    setLimit(PAGE);
    router.replace(s === "all" ? path : `${path}?s=${s}`, { scroll: false }); // back button returns to the same filter
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^#/, "");
    const digits = term.replace(/\D/g, "");
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!term) return true;
      const w = WILAYA_LIST.find((x) => x.code === r.wilaya);
      return (
        String(r.id) === term ||
        (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits)) ||
        `${r.name} ${r.commune} ${w?.fr ?? ""} ${w?.ar ?? ""} ${r.summary}`.toLowerCase().includes(term)
      );
    });
  }, [rows, status, q]);

  // group by day: "Today", "Yesterday", "Thu 1 Oct"
  const groups = useMemo(() => {
    const out: { key: string; rows: OrderRow[]; total: number }[] = [];
    for (const r of list.slice(0, limit)) {
      const k = dayKey(r.createdAt);
      let g = out[out.length - 1];
      if (!g || g.key !== k) out.push((g = { key: k, rows: [], total: 0 }));
      g.rows.push(r);
      if (r.status !== "cancelled") g.total += r.total;
    }
    return out;
  }, [list, limit]);

  return (
    <>
      <PageHeader
        title="Orders"
        sub={counts.new ? <span><span className="font-semibold text-lilac">{counts.new} new</span> waiting for a call</span> : `${rows.length} order${rows.length === 1 ? "" : "s"}`}
        actions={
          <>
            <a href={`/api/admin/orders.csv${status === "all" ? "" : `?status=${status}`}`} aria-label="Download as spreadsheet" title="Download as spreadsheet" className="grid h-11 w-11 place-items-center rounded-full text-bone active:bg-white/10"><DownloadI className="h-[22px] w-[22px]" /></a>
            <LinkButton href="/admin/orders/new" variant="primary" size="sm" icon={<PlusI className="h-4 w-4" />}>New</LinkButton>
          </>
        }
      />

      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 space-y-2.5 bg-abyss/90 px-4 pb-3 pt-1 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder="Name, phone, #number, commune…" />
        <Chips
          label="Filter by status" value={status} onChange={pick}
          options={FILTERS.map((f) => ({ value: f, label: f === "all" ? "All" : ORDER_STATUS[f].label, count: f === "all" ? undefined : counts[f] }))}
        />
      </div>

      {list.length === 0 ? (
        rows.length === 0 ? (
          <Empty icon={<OrdersI className="h-7 w-7" />} title="No orders yet" text="Orders from the website land here. Orders taken by DM or phone can be added by hand." action={<LinkButton href="/admin/orders/new" variant="primary" icon={<PlusI className="h-4 w-4" />}>Add an order</LinkButton>} />
        ) : (
          <Empty icon={<SearchI className="h-7 w-7" />} title="Nothing here" text={q ? `No order matches “${q}”.` : `No ${ORDER_STATUS[status as OrderStatus]?.label.toLowerCase()} orders.`} action={(q || status !== "all") && <Button onClick={() => { setQ(""); pick("all"); }}>Show all orders</Button>} />
        )
      ) : (
        <div className="mt-2">
          {groups.map((g) => (
            <section key={g.key} className="mt-4 first:mt-1">
              <h2 className="mb-2 flex items-baseline justify-between px-1 text-[0.8rem] font-semibold text-mute">
                <span className="uppercase tracking-[0.12em]">{dayLabel(g.key)}</span>
                <span className="tabular-nums">{g.rows.length} · {price(g.total)}</span>
              </h2>
              <div className="space-y-2">{g.rows.map((r) => <OrderCard key={r.id} o={r} call={r.status === "new"} />)}</div>
            </section>
          ))}
          {list.length > limit && (
            <Button className="mt-5 w-full" onClick={() => setLimit((n) => n + PAGE)}>Show more ({list.length - limit})</Button>
          )}
        </div>
      )}
    </>
  );
}
