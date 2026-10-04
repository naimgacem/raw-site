"use client";

import { useState } from "react";
import { dayLabel } from "@/lib/dates";
import { price } from "@/lib/site";
import { cx } from "./ui";

type Day = { day: string; orders: number; value: number };

const BAR = "#A64DFF"; // brand violet, validated for the dark card (lightness, chroma, contrast)

/** Orders per day, last 14 days. Tap a day to read it; the summary line doubles as the tooltip. */
export default function OrdersChart({ data }: { data: Day[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.orders));
  const top = max <= 4 ? 4 : Math.ceil(max / 5) * 5; // clean axis top
  const total = data.reduce((n, d) => n + d.orders, 0);
  const value = data.reduce((n, d) => n + d.value, 0);
  const s = sel === null ? null : data[sel];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3" aria-live="polite">
        <p className="text-[0.92rem] font-medium">{s ? dayLabel(s.day) : "Last 14 days"}</p>
        <p className="text-[0.92rem] text-mute">
          <span className="font-semibold text-bone">{s ? s.orders : total}</span> order{(s ? s.orders : total) === 1 ? "" : "s"}
          {(s ? s.value : value) > 0 && <> · {price(s ? s.value : value)}</>}
        </p>
      </div>

      <div className="relative mt-4 h-[120px]" onPointerLeave={() => setSel(null)}>
        {/* axis: top value + baseline, hairline and recessive */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-white/[0.06]" />
        <span className="pointer-events-none absolute left-0 top-1 text-[0.68rem] tabular-nums text-mute">{top}</span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/[0.12]" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d, i) => (
            <button
              key={d.day} type="button"
              aria-label={`${dayLabel(d.day)}: ${d.orders} order${d.orders === 1 ? "" : "s"}${d.value ? `, ${price(d.value)}` : ""}`}
              onClick={() => setSel(sel === i ? null : i)} onPointerEnter={(e) => e.pointerType === "mouse" && setSel(i)}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              <span
                className={cx("w-full max-w-[16px] rounded-t-[4px] transition-opacity", sel !== null && sel !== i && "opacity-40")}
                style={{ height: d.orders ? `${Math.max(4, (d.orders / top) * 100)}%` : "2px", background: d.orders ? BAR : "rgba(255,255,255,0.10)" }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[0.7rem] text-mute">
        <span>{dayLabel(data[0].day)}</span>
        <span>{dayLabel(data[7].day)}</span>
        <span>Today</span>
      </div>

      <table className="sr-only">
        <caption>Orders per day, last 14 days</caption>
        <thead><tr><th>Day</th><th>Orders</th><th>Value</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.orders}</td><td>{d.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
