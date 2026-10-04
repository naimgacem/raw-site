"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveDelivery } from "@/app/admin/actions";
import { resolveWilayas } from "@/lib/algeria";
import { price } from "@/lib/site";
import type { Delivery, WilayaRule, Zone } from "@/lib/types";
import { useDirty, useShell } from "./Shell";
import { Button, Card, Field, IconButton, Input, MoneyInput, PageHeader, Pill, SaveBar, SearchInput, Section, Select, Sheet, ToggleRow, cx, same } from "./ui";
import { NextI, PlusI, TrashI } from "./icons";

export default function DeliveryEditor({ delivery }: { delivery: Delivery }) {
  const { toast, confirm } = useShell();
  const [busy, start] = useTransition();
  const [d, setD] = useState(delivery);
  useEffect(() => setD(delivery), [delivery]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const dirty = !same(d, delivery);
  useDirty(dirty);

  const all = useMemo(() => resolveWilayas(d), [d]);
  const term = q.trim().toLowerCase();
  const list = all.filter((w) => !term || w.code === term.padStart(2, "0") || `${w.fr} ${w.ar}`.toLowerCase().includes(term));
  const offCount = all.filter((w) => w.off).length;

  const setZone = (i: number, patch: Partial<Zone>) => setD((x) => ({ ...x, zones: x.zones.map((z, k) => (k === i ? { ...z, ...patch } : z)) }));
  const setRule = (code: string, patch: Partial<WilayaRule>) => setD((x) => ({ ...x, rules: { ...x.rules, [code]: { ...(x.rules[code] ?? { zone: x.zones[0].id }), ...patch } } }));

  const removeZone = async (i: number) => {
    const z = d.zones[i];
    const n = all.filter((w) => w.zone === z.id).length;
    if (d.zones.length === 1) return toast("Keep at least one zone", { tone: "error" });
    const to = d.zones.find((_, k) => k !== i)!;
    if (n && !(await confirm({ title: `Remove ${z.name}?`, body: `Its ${n} wilaya${n === 1 ? "" : "s"} move to ${to.name}.`, confirm: "Remove zone", danger: true }))) return;
    setD((x) => ({
      ...x,
      zones: x.zones.filter((_, k) => k !== i),
      rules: Object.fromEntries(Object.entries(x.rules).map(([c, r]) => [c, r.zone === z.id ? { ...r, zone: to.id } : r])),
    }));
  };

  const save = () =>
    start(async () => {
      const r = await saveDelivery(d);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast("Delivery prices saved");
    });

  const w = open ? all.find((x) => x.code === open) : null;
  const rule = open ? d.rules[open] ?? { zone: d.zones[0].id } : null;

  return (
    <>
      <PageHeader title="Delivery" back="/admin/more" sub="What customers pay for delivery, by wilaya." />

      <Section title="Free delivery">
        <Card>
          <ToggleRow title="Free delivery on big orders" hint={d.freeOver ? `Orders from ${price(d.freeOver)} (after discount) ship free.` : "Off — every order pays delivery."} checked={d.freeOver > 0} onChange={(on) => setD((x) => ({ ...x, freeOver: on ? 5000 : 0 }))} />
          {d.freeOver > 0 && (
            <div className="border-t border-white/[0.06] p-4 pt-3">
              <Field label="From"><MoneyInput value={d.freeOver} onChange={(v) => setD((x) => ({ ...x, freeOver: v ?? 0 }))} /></Field>
            </div>
          )}
        </Card>
      </Section>

      <Section title="Price zones" hint="Change a zone and every wilaya in it follows. Most couriers price this way.">
        <div className="space-y-2.5">
          {d.zones.map((z, i) => {
            const n = all.filter((x) => x.zone === z.id && !x.custom).length;
            return (
              <Card key={z.id || i} className="p-3.5">
                <div className="flex items-center gap-2">
                  <Input value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} placeholder="Zone name" className="h-11 font-semibold" />
                  <span className="w-[4.5rem] shrink-0 text-center text-[0.8rem] text-mute">{n} wilaya{n === 1 ? "" : "s"}</span>
                  <IconButton label={`Remove ${z.name}`} className="text-mute" onClick={() => removeZone(i)}><TrashI className="h-[18px] w-[18px]" /></IconButton>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Field label="Home"><MoneyInput value={z.home} onChange={(v) => setZone(i, { home: v ?? 0 })} /></Field>
                  <Field label="Stop desk">
                    {z.desk === null ? (
                      <button className="h-12 w-full rounded-xl border border-dashed border-white/15 text-[0.88rem] text-mute" onClick={() => setZone(i, { desk: Math.max(0, z.home - 150) })}>None — <span className="font-semibold text-lilac">add</span></button>
                    ) : (
                      <div className="relative">
                        <MoneyInput value={z.desk} onChange={(v) => setZone(i, { desk: v ?? 0 })} />
                      </div>
                    )}
                  </Field>
                </div>
                {z.desk !== null && <button className="mt-2.5 text-[0.82rem] font-semibold text-lilac/90" onClick={() => setZone(i, { desk: null })}>Remove stop desk</button>}
              </Card>
            );
          })}
          <Button variant="ghost" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => setD((x) => ({ ...x, zones: [...x.zones, { id: `zone-${Date.now().toString(36)}`, name: "", home: 600, desk: 400 }] }))}>Add zone</Button>
        </div>
      </Section>

      <Section title="Wilayas" hint={offCount ? `${offCount} wilaya${offCount === 1 ? " is" : "s are"} switched off — customers there can’t order.` : "Tap one to change its zone, give it its own price, or switch it off."}>
        <SearchInput value={q} onChange={setQ} placeholder="Search wilaya or number" />
        <Card className="mt-2.5 divide-y divide-white/[0.06] overflow-hidden">
          {list.map((x) => (
            <button key={x.code} onClick={() => setOpen(x.code)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03]">
              <span className="w-7 shrink-0 text-[0.85rem] font-semibold tabular-nums text-mute">{x.code}</span>
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate font-medium", x.off && "text-bone/45 line-through")}>{x.fr}</span>
                <span className="block truncate text-[0.8rem] text-mute">{x.off ? "No delivery" : x.custom ? "Own prices" : d.zones.find((z) => z.id === x.zone)?.name}</span>
              </span>
              {!x.off && (
                <span className="shrink-0 text-right text-[0.84rem] tabular-nums leading-tight">
                  <span className="block">{price(x.home)}</span>
                  <span className="block text-mute">{x.desk === null ? "no desk" : `desk ${price(x.desk)}`}</span>
                </span>
              )}
              {x.off && <Pill cls="bg-white/[0.08] text-mute">Off</Pill>}
              <NextI className="h-4 w-4 shrink-0 text-mute" />
            </button>
          ))}
        </Card>
      </Section>

      <Sheet open={!!w} onClose={() => setOpen(null)} title={w ? `${w.code} ${w.fr}` : ""} footer={<Button variant="primary" size="lg" className="w-full" onClick={() => setOpen(null)}>Done</Button>}>
        {w && rule && (
          <div className="space-y-4">
            <Card className="divide-y divide-white/[0.06] bg-ink2">
              <ToggleRow title="Deliver here" hint={rule.off ? "Customers in this wilaya can’t order." : undefined} checked={!rule.off} onChange={(on) => setRule(w.code, { off: !on })} />
              <ToggleRow title="Own prices" hint="Ignore the zone price for this wilaya." checked={!!rule.custom} onChange={(on) => setRule(w.code, { custom: on ? { home: w.home, desk: w.desk } : null })} />
            </Card>
            {rule.custom ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Home"><MoneyInput value={rule.custom.home} onChange={(v) => setRule(w.code, { custom: { ...rule.custom!, home: v ?? 0 } })} /></Field>
                <Field label="Stop desk" hint={<button className="font-medium underline" onClick={() => setRule(w.code, { custom: { ...rule.custom!, desk: rule.custom!.desk === null ? Math.max(0, rule.custom!.home - 150) : null } })}>{rule.custom.desk === null ? "Add stop desk" : "No stop desk"}</button>}>
                  {rule.custom.desk === null ? <div className="grid h-12 place-items-center rounded-xl border border-dashed border-white/15 text-[0.88rem] text-mute">None</div> : <MoneyInput value={rule.custom.desk} onChange={(v) => setRule(w.code, { custom: { ...rule.custom!, desk: v ?? 0 } })} />}
                </Field>
              </div>
            ) : (
              <Field label="Zone" hint={`${price(w.home)} home · ${w.desk === null ? "no stop desk" : `${price(w.desk)} stop desk`}`}>
                <Select value={rule.zone} onChange={(e) => setRule(w.code, { zone: e.target.value })}>
                  {d.zones.map((z) => <option key={z.id} value={z.id}>{z.name || "Untitled zone"}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Sheet>

      <SaveBar dirty={dirty} saving={busy} onSave={save} onDiscard={() => setD(delivery)} />
    </>
  );
}
