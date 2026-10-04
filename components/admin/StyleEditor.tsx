"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteStyle, saveStyle } from "@/app/admin/actions";
import { price, slugify } from "@/lib/site";
import type { Category, HairStyle, StyleOption } from "@/lib/types";
import { ImageField } from "./ImagePicker";
import { useDirty, useShell } from "./Shell";
import { Button, Card, Field, IconButton, Input, ListEditor, MoneyInput, PageHeader, SaveBar, Section, Select, TextArea, ToggleRow, cx, same } from "./ui";
import { EyeOffI, PlusI, TrashI } from "./icons";

const TAGS = ["", "Signature", "Popular", "New"];

export default function StyleEditor({ style, categories }: { style?: HairStyle; categories: Category[] }) {
  const router = useRouter();
  const { toast, confirm } = useShell();
  const [busy, start] = useTransition();
  const isNew = !style;
  const initial = useMemo<HairStyle>(
    () => style ?? { slug: "", name: "", category: categories[0]?.id ?? "", render: "", from: 0, duration: "", blurb: "", description: "", options: [], includes: [] },
    [style, categories]
  );
  const [s, setS] = useState<HairStyle>(initial);
  const dirty = !same(s, initial);
  useDirty(dirty && !busy);
  const set = <K extends keyof HairStyle>(k: K, v: HairStyle[K]) => setS((x) => ({ ...x, [k]: v }));
  const setOpt = (i: number, o: StyleOption) => set("options", s.options.map((x, k) => (k === i ? o : x)));
  const slug = isNew ? slugify(s.name) : s.slug;
  const max = s.from + s.options.reduce((n, o) => n + Math.max(0, ...o.choices.map((c) => c.add)), 0);

  const save = () =>
    start(async () => {
      const r = await saveStyle({ ...s, slug }, style?.slug);
      if (!r.ok) return toast(r.error, { tone: "error" });
      setS(r.style);
      toast(isNew ? "Style added to the menu" : "Saved — live on the menu");
      if (isNew || r.slug !== style!.slug) router.replace(`/admin/catalog/styles/${r.slug}`);
    });

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${s.name}?`, body: "It disappears from the menu. Hiding it instead keeps it for later.", confirm: "Delete style", danger: true }))) return;
    start(async () => {
      const r = await deleteStyle(style!.slug);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(`${s.name} deleted`);
      router.replace("/admin/catalog?tab=styles");
    });
  };

  return (
    <>
      <PageHeader title={isNew ? "New style" : s.name || "Style"} back="/admin/catalog?tab=styles" large={false} />

      {s.hidden && !isNew && (
        <button onClick={() => set("hidden", false)} className="mt-2 flex w-full items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-[0.9rem] text-bone/80">
          <EyeOffI className="h-5 w-5 shrink-0 text-mute" /> <span className="flex-1">Hidden from the menu.</span> <span className="font-semibold text-lilac">Show it</span>
        </button>
      )}

      <Section title="Photo" className="mt-5">
        <div className="flex items-center gap-4">
          <ImageField value={s.render} onChange={(url) => set("render", url)} className="h-32 w-32 shrink-0" />
          <p className="text-[0.88rem] leading-snug text-mute">A photo of your work, or one of the RAW illustrations. Shown on the menu card and the booking sheet.</p>
        </div>
      </Section>

      <Section title="Basics">
        <Card className="space-y-4 p-4">
          <Field label="Name"><Input value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Knotless Braids" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting price"><MoneyInput value={s.from || null} onChange={(v) => set("from", v ?? 0)} optional /></Field>
            <Field label="Takes about"><Input value={s.duration} onChange={(e) => set("duration", e.target.value)} placeholder="4–6h" /></Field>
          </div>
          <Field label="Category">
            <Select value={s.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Label">
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button key={t || "none"} type="button" aria-pressed={(s.tag ?? "") === t} onClick={() => set("tag", t || undefined)} className={cx("h-10 rounded-full border px-4 text-[0.88rem] font-semibold", (s.tag ?? "") === t ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/80")}>{t || "None"}</button>
              ))}
            </div>
          </Field>
        </Card>
      </Section>

      <Section title="Words">
        <Card className="space-y-4 p-4">
          <Field label="Short line" hint="Under the name on the menu."><Input value={s.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="Light, flat roots. No tension, all crown." /></Field>
          <Field label="Description"><TextArea value={s.description} onChange={(e) => set("description", e.target.value)} minRows={3} /></Field>
        </Card>
      </Section>

      <Section title="Options & prices" hint={s.options.length ? `The live estimate goes from ${price(s.from)} up to ${price(max)}. The first choice of each option is the default.` : "Let clients pick size, length, extras… each choice can add to the price."}>
        <div className="space-y-2.5">
          {s.options.map((o, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-2">
                <Input value={o.label} onChange={(e) => setOpt(i, { ...o, label: e.target.value })} placeholder="Option, e.g. Length" className="font-semibold" />
                <IconButton label="Remove option" className="text-mute" onClick={() => set("options", s.options.filter((_, k) => k !== i))}><TrashI className="h-[18px] w-[18px]" /></IconButton>
              </div>
              <div className="mt-2 space-y-2 border-l-2 border-white/[0.06] pl-3">
                {o.choices.map((c, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Input value={c.label} onChange={(e) => setOpt(i, { ...o, choices: o.choices.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} placeholder="Choice" className="min-w-0 flex-1" />
                    <MoneyInput value={c.add} onChange={(v) => setOpt(i, { ...o, choices: o.choices.map((x, k) => (k === j ? { ...x, add: v ?? 0 } : x)) })} className="w-[7.5rem] shrink-0" suffix="+DA" />
                    <IconButton label="Remove choice" className="h-10 w-9 text-mute" onClick={() => setOpt(i, { ...o, choices: o.choices.filter((_, k) => k !== j) })}><TrashI className="h-4 w-4" /></IconButton>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="-ml-2 text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => setOpt(i, { ...o, choices: [...o.choices, { label: "", add: 0 }] })}>Add choice</Button>
              </div>
            </Card>
          ))}
          <Button variant="ghost" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => set("options", [...s.options, { label: "", choices: [{ label: "", add: 0 }, { label: "", add: 0 }] }])}>Add option</Button>
        </div>
      </Section>

      <Section title="Included" hint="Ticks under the booking sheet.">
        <ListEditor items={s.includes} onChange={(v) => set("includes", v)} placeholder="e.g. Edges laid" addLabel="Add item" />
      </Section>

      <Section title="On the menu">
        <Card>
          <ToggleRow title="Show on the menu" hint={s.hidden ? "Hidden — clients can’t book it." : "Visible to everyone."} checked={!s.hidden} onChange={(on) => set("hidden", !on)} />
        </Card>
      </Section>

      {!isNew && (
        <>
          <Button variant="danger" className="mt-8 w-full" icon={<TrashI />} onClick={remove}>Delete style</Button>
        </>
      )}

      <SaveBar dirty={isNew || dirty} saving={busy} onSave={save} onDiscard={isNew ? undefined : () => setS(initial)} label={isNew ? "Add style" : "Save"} note={isNew ? "Not on the menu yet" : undefined} />
    </>
  );
}
