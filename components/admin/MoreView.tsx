"use client";

import { logout } from "@/app/admin/actions";
import { PageHeader, RowLink, Rows, Section } from "./ui";
import { ExternalI, GearI, LogoutI, NextI, TicketI, TruckI, UsersI } from "./icons";

export default function MoreView({ activeCoupons, blocked }: { activeCoupons: number; blocked: number }) {
  const chevron = <NextI className="h-5 w-5 shrink-0 text-mute" />;
  return (
    <>
      <PageHeader title="More" />
      <Section title="Shop">
        <Rows>
          <RowLink href="/admin/customers" icon={<UsersI />} title="Customers" sub={blocked ? `${blocked} blocked number${blocked === 1 ? "" : "s"}` : "Who ordered, who sent it back"} right={chevron} />
          <RowLink href="/admin/delivery" icon={<TruckI />} title="Delivery prices" sub="Zones, wilayas, free delivery" right={chevron} />
          <RowLink href="/admin/coupons" icon={<TicketI />} title="Coupons" sub={activeCoupons ? `${activeCoupons} active code${activeCoupons === 1 ? "" : "s"}` : "No active codes"} right={chevron} />
        </Rows>
      </Section>
      <Section title="Site">
        <Rows>
          <RowLink href="/admin/settings" icon={<GearI />} title="Settings" sub="Contact, announcements, open/closed, password" right={chevron} />
          <RowLink href="/" external icon={<ExternalI />} title="View the website" sub="Opens in a new tab" right={chevron} />
        </Rows>
      </Section>
      <form action={logout} className="mt-7">
        <button type="submit" className="flex h-14 w-full items-center gap-3 rounded-[20px] border border-white/[0.06] bg-ink2 px-4 text-left font-medium text-rose-300 active:bg-ink3/60">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10"><LogoutI /></span> Log out
        </button>
      </form>
    </>
  );
}
