"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ago, dayLabel, todayKey } from "@/lib/dates";
import { price } from "@/lib/site";
import type { Booking } from "@/lib/types";
import { useLiveRefresh } from "./Shell";
import { BOOKING_STATUS, Button, Chips, Empty, LinkButton, PageHeader, Pill, cx } from "./ui";
import { CalendarI, ClockI, PinI, PlusI } from "./icons";

type Tab = "new" | "upcoming" | "past" | "all";

export default function BookingsView({ bookings, initial }: { bookings: Booking[]; initial: string }) {
  useLiveRefresh(30);
  const router = useRouter();
  const path = usePathname();
  const today = todayKey();
  const requests = bookings.filter((b) => b.status === "new");
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.date && b.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const past = bookings.filter((b) => !(b.status === "new") && !(b.status === "confirmed" && b.date && b.date >= today)).sort((a, b) => `${b.date ?? b.createdAt}`.localeCompare(`${a.date ?? a.createdAt}`));
  const [tab, setTab] = useState<Tab>((["new", "upcoming", "past", "all"] as Tab[]).includes(initial as Tab) ? (initial as Tab) : requests.length ? "new" : "upcoming");
  const [limit, setLimit] = useState(40);

  const pick = (t: Tab) => {
    setTab(t);
    router.replace(`${path}?s=${t}`, { scroll: false });
  };

  const list = tab === "new" ? requests : tab === "upcoming" ? upcoming : tab === "past" ? past : bookings;
  const byDay = useMemo(() => {
    if (tab !== "upcoming") return null;
    const g: { day: string; items: Booking[] }[] = [];
    for (const b of upcoming) {
      const last = g[g.length - 1];
      if (last && last.day === b.date) last.items.push(b);
      else g.push({ day: b.date!, items: [b] });
    }
    return g;
  }, [tab, upcoming]);

  return (
    <>
      <PageHeader
        title="Bookings"
        sub={requests.length ? <span><span className="font-semibold text-lilac">{requests.length} request{requests.length === 1 ? "" : "s"}</span> to answer</span> : upcoming.length ? `${upcoming.length} coming up` : "Your appointments"}
        actions={<LinkButton href="/admin/bookings/new" variant="primary" size="sm" icon={<PlusI className="h-4 w-4" />}>New</LinkButton>}
      />
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 bg-abyss/90 px-4 pb-3 pt-1 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <Chips<Tab>
          label="Show" value={tab} onChange={pick}
          options={[
            { value: "new", label: "Requests", count: requests.length },
            { value: "upcoming", label: "Upcoming", count: upcoming.length },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Empty
          icon={<CalendarI className="h-7 w-7" />}
          title={tab === "new" ? "No new requests" : tab === "upcoming" ? "Nothing booked yet" : "Nothing here"}
          text={tab === "new" ? "When someone taps “Book via DM” on the menu, the request shows up here too." : "Confirmed appointments appear here by date."}
          action={<LinkButton href="/admin/bookings/new" icon={<PlusI className="h-4 w-4" />}>Add a booking</LinkButton>}
        />
      ) : byDay ? (
        <div className="mt-2">
          {byDay.map((g) => (
            <section key={g.day} className="mt-4 first:mt-1">
              <h2 className={cx("mb-2 px-1 text-[0.8rem] font-semibold uppercase tracking-[0.12em]", g.day === today ? "text-lilac" : "text-mute")}>{dayLabel(g.day)}</h2>
              <div className="space-y-2">{g.items.map((b) => <BookingCard key={b.id} b={b} timeMode />)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {list.slice(0, limit).map((b) => <BookingCard key={b.id} b={b} showStatus={tab !== "new"} />)}
          {list.length > limit && <Button className="mt-3 w-full" onClick={() => setLimit((n) => n + 40)}>Show more</Button>}
        </div>
      )}
    </>
  );
}

const MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });

function BookingCard({ b, showStatus, timeMode }: { b: Booking; showStatus?: boolean; timeMode?: boolean }) {
  const st = BOOKING_STATUS[b.status];
  const picks = Object.values(b.picks).join(" · ");
  return (
    <Link href={`/admin/bookings/${b.id}`} className="flex gap-3.5 rounded-[20px] border border-white/[0.06] bg-ink2 p-3.5 transition-colors active:bg-ink3/60">
      <span className={cx("grid w-[3.75rem] shrink-0 place-items-center self-stretch rounded-2xl px-1 text-center leading-tight", b.status === "confirmed" ? "bg-sky-400/[0.1] text-sky-200" : b.status === "new" ? "bg-violet/[0.16] text-lilac" : "bg-white/[0.05] text-mute")}>
        {timeMode ? (
          <span className={cx("font-bold tabular-nums", /^\d/.test(b.time) ? "text-[1rem]" : "text-[0.78rem]")}>{b.time || "—"}</span>
        ) : b.date ? (
          <span>
            <span className="block text-[1.15rem] font-bold tabular-nums">{Number(b.date.slice(8))}</span>
            <span className="block text-[0.66rem] font-semibold uppercase">{MONTH.format(new Date(`${b.date}T12:00:00Z`))}</span>
          </span>
        ) : (
          <ClockI className="h-6 w-6" />
        )}
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate font-semibold">{b.styleName}</span>
          {showStatus && b.status !== "confirmed" && <Pill cls={st.cls} className="ml-auto">{st.label}</Pill>}
          {b.price !== null && b.status === "confirmed" && <span className="ml-auto shrink-0 font-semibold tabular-nums">{price(b.price)}</span>}
        </span>
        {picks && <span className="mt-0.5 block truncate text-[0.84rem] text-bone/70">{picks}</span>}
        <span className="mt-1 flex items-center gap-1.5 text-[0.84rem] text-mute">
          <span className="min-w-0 truncate" dir="auto">{b.name || (b.instagram ? `@${b.instagram}` : "No name")}</span>
          {b.area && <><span aria-hidden>·</span><PinI className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{b.area}</span></>}
          {b.status === "new" && <span className="ml-auto shrink-0" suppressHydrationWarning>{ago(b.createdAt)}</span>}
          {!timeMode && b.status !== "new" && b.time && <span className="ml-auto shrink-0">{b.time}</span>}
        </span>
        {b.status === "new" && (b.date || b.time) && <span className="mt-1 block text-[0.82rem] text-lilac">Asked for {[b.date ? dayLabel(b.date) : "", b.time].filter(Boolean).join(" · ")}</span>}
      </span>
    </Link>
  );
}
