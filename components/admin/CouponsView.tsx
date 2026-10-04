"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/app/admin/actions";
import { todayKey } from "@/lib/dates";
import { price } from "@/lib/site";
import type { Coupon } from "@/lib/types";
import { useShell } from "./Shell";
import { Button, Empty, Field, Input, MoneyInput, PageHeader, Pill, Segmented, Sheet, Toggle, ToggleRow, Card, cx } from "./ui";
import { PlusI, TicketI, TrashI } from "./icons";

const fresh: Coupon = { code: "", type: "percent", value: 10, active: true, minOrder: 0, maxUses: null, uses: 0, expires: null };
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export default function CouponsView({ coupons }: { coupons: Coupon[] }) {
  const { toast, confirm } = useShell();
  const [list, setList] = useState(coupons);
  useEffect(() => setList(coupons), [coupons]);
  const [edit, setEdit] = useState<{ c: Coupon; original?: string } | null>(null);
  const [busy, start] = useTransition();
  const today = todayKey();

  const toggle = (c: Coupon, on: boolean) => {
    setList((l) => l.map((x) => (x.code === c.code ? { ...x, active: on } : x)));
    start(async () => {
      const r = await setCouponActive(c.code, on);
      if (!r.ok) { setList((l) => l.map((x) => (x.code === c.code ? { ...x, active: !on } : x))); toast(r.error, { tone: "error" }); }
      else toast(on ? `${c.code} is on` : `${c.code} is off`);
    });
  };

  const save = () => {
    if (!edit) return;
    start(async () => {
      const r = await saveCoupon(edit.c, edit.original);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(edit.original ? "Code saved" : `${edit.c.code.toUpperCase()} created`);
      setEdit(null);
    });
  };

  const remove = async () => {
    if (!edit?.original) return;
    const code = edit.original;
    if (!(await confirm({ title: `Delete ${code}?`, body: "Customers won’t be able to use it any more.", confirm: "Delete code", danger: true }))) return;
    start(async () => {
      const r = await deleteCoupon(code);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(`${code} deleted`);
      setEdit(null);
    });
  };

  const c = edit?.c;
  const setC = (patch: Partial<Coupon>) => setEdit((e) => (e ? { ...e, c: { ...e.c, ...patch } } : e));

  return (
    <>
      <PageHeader
        title="Coupons" back="/admin/more" sub="Discount codes for the order form."
        actions={<Button variant="primary" size="sm" icon={<PlusI className="h-4 w-4" />} onClick={() => setEdit({ c: { ...fresh } })}>New</Button>}
      />

      {list.length === 0 ? (
        <Empty icon={<TicketI className="h-7 w-7" />} title="No codes yet" text="Create a code to share in a story or with a loyal customer." action={<Button variant="primary" icon={<PlusI className="h-4 w-4" />} onClick={() => setEdit({ c: { ...fresh } })}>New code</Button>} />
      ) : (
        <div className="space-y-2.5">
          {list.map((x) => {
            const expired = !!x.expires && x.expires < today;
            const usedUp = x.maxUses !== null && x.uses >= x.maxUses;
            const live = x.active && !expired && !usedUp;
            return (
              <div key={x.code} className={cx("flex items-center gap-3 rounded-[20px] border bg-ink2 p-4", live ? "border-white/[0.06]" : "border-white/[0.04] opacity-70")}>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEdit({ c: { ...x }, original: x.code })}>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-mono text-[1.1rem] font-bold tracking-wide">{x.code}</span>
                    <Pill cls={live ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.08] text-mute"}>{x.type === "percent" ? `−${x.value}%` : `−${price(x.value)}`}</Pill>
                  </span>
                  <span className="mt-1 block text-[0.84rem] text-mute">
                    {[
                      expired ? "Expired" : usedUp ? "Used up" : !x.active ? "Off" : null,
                      `${x.uses}${x.maxUses ? ` / ${x.maxUses}` : ""} used`,
                      x.minOrder ? `min ${price(x.minOrder)}` : null,
                      x.expires && !expired ? `until ${dateFmt.format(new Date(`${x.expires}T12:00:00Z`))}` : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                </button>
                <Toggle checked={x.active} onChange={(on) => toggle(x, on)} label={`${x.code} active`} />
              </div>
            );
          })}
          <p className="px-1 pt-2 text-[0.82rem] leading-snug text-mute">Codes are checked on the server, so nobody can read the list from the website.</p>
        </div>
      )}

      <Sheet
        open={!!edit} onClose={() => setEdit(null)} title={edit?.original ? edit.original : "New code"}
        footer={
          <div className="flex gap-2">
            {edit?.original && <Button variant="danger" size="lg" icon={<TrashI />} onClick={remove} disabled={busy}>Delete</Button>}
            <Button variant="primary" size="lg" className="flex-1" loading={busy} onClick={save}>{edit?.original ? "Save" : "Create code"}</Button>
          </div>
        }
      >
        {c && (
          <div className="space-y-4">
            <Field label="Code" hint="What customers type. Letters and numbers.">
              <Input value={c.code} onChange={(e) => setC({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="e.g. EID25" autoCapitalize="characters" className="font-mono text-[1.1rem] font-bold tracking-wide" />
            </Field>
            <Field label="Discount">
              <Segmented label="Discount type" value={c.type} onChange={(t) => setC({ type: t })} options={[{ value: "percent", label: "% off" }, { value: "fixed", label: "DA off" }]} />
              <MoneyInput className="mt-2" value={c.value} onChange={(v) => setC({ value: v ?? 0 })} suffix={c.type === "percent" ? "%" : "DA"} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum order" hint="Optional"><MoneyInput value={c.minOrder || null} onChange={(v) => setC({ minOrder: v ?? 0 })} optional /></Field>
              <Field label="Max uses" hint={edit?.original ? `Used ${c.uses}×` : "Optional"}><MoneyInput value={c.maxUses} onChange={(v) => setC({ maxUses: v })} optional suffix="×" /></Field>
            </div>
            <Field label="Last day" hint={c.expires ? <button className="font-medium underline" onClick={() => setC({ expires: null })}>No end date</button> : "Optional — leave empty for no end date."}>
              <Input type="date" value={c.expires ?? ""} onChange={(e) => setC({ expires: e.target.value || null })} min={today} />
            </Field>
            <Card className="bg-ink2"><ToggleRow title="Active" hint="Switch off to pause it without deleting." checked={c.active} onChange={(on) => setC({ active: on })} /></Card>
          </div>
        )}
      </Sheet>
    </>
  );
}

