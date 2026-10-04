"use client";

import Link from "next/link";
import { ago } from "@/lib/dates";
import { WILAYA_LIST } from "@/lib/algeria";
import { price } from "@/lib/site";
import type { OrderRow } from "@/lib/admin-data";
import { AlertI, PhoneI } from "./icons";
import { ORDER_STATUS, Pill, cx } from "./ui";

const wName = (code: string) => WILAYA_LIST.find((w) => w.code === code)?.fr ?? code;

export default function OrderCard({ o, call }: { o: OrderRow; call?: boolean }) {
  const st = ORDER_STATUS[o.status];
  return (
    <div className="relative flex items-stretch rounded-[20px] border border-white/[0.06] bg-ink2 transition-colors active:bg-ink3/60">
      <Link href={`/admin/orders/${o.id}`} className="min-w-0 flex-1 py-3.5 pl-4 pr-2">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[1.02rem] font-semibold" dir="auto">{o.name}</span>
          {o.flag === "blocked" && <AlertI className="h-4 w-4 shrink-0 text-rose-300" />}
          <span className="ml-auto shrink-0 text-[1.02rem] font-semibold tabular-nums">{price(o.total)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[0.84rem] text-mute">
          <span className="shrink-0 tabular-nums text-bone/70">#{o.id}</span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">{wName(o.wilaya)}{o.commune ? `, ${o.commune.split(" / ")[0]}` : ""}</span>
          <span className="ml-auto shrink-0" suppressHydrationWarning>{ago(o.createdAt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Pill cls={st.cls}>{st.label}</Pill>
          {o.attempts > 0 && o.status === "new" && <Pill cls="bg-amber-400/10 text-amber-200">No answer ×{o.attempts}</Pill>}
          <span className="min-w-0 truncate text-[0.84rem] text-bone/70">{o.summary}</span>
        </div>
      </Link>
      {call && (
        <a href={`tel:${o.phone}`} aria-label={`Call ${o.name}`} className={cx("my-2 mr-2 grid w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/[0.12] text-emerald-300 active:bg-emerald-400/20")}>
          <PhoneI className="h-[22px] w-[22px]" />
        </a>
      )}
    </div>
  );
}
