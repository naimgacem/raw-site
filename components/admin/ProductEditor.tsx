"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { slugify } from "@/lib/site";
import type { Collection, Product, Variant } from "@/lib/types";
import { ImageField } from "./ImagePicker";
import { useDirty, useShell } from "./Shell";
import { Button, Card, Field, IconButton, Input, ListEditor, MoneyInput, PageHeader, SaveBar, Section, Select, TextArea, Toggle, ToggleRow, cx, same } from "./ui";
import { CopyI, ExternalI, EyeOffI, PlusI, TrashI } from "./icons";

const TAGS = ["", "New", "Sale", "Bestseller"];

const blank = (collection: string): Product => ({
  slug: "", name: "", collection, price: 0, blurb: "", description: "", details: [], care: [],
  variants: [{ id: "", name: "", swatch: "#6a14d0", image: "" }],
});

export default function ProductEditor({ product, isNew, collections, taken }: { product?: Product; isNew: boolean; collections: Collection[]; taken: string[] }) {
  const router = useRouter();
  const { toast, confirm } = useShell();
  const [busy, start] = useTransition();
  const initial = useMemo<Product>(() => {
    if (!product) return blank(collections[0]?.id ?? "");
    if (!isNew) return product;
    // duplicate: same everything, new name/address
    return { ...product, name: `${product.name} copy`, slug: "", hidden: true };
  }, [product, isNew, collections]);
  const [p, setP] = useState<Product>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const dirty = !same(p, initial);
  useDirty(dirty && !busy);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const setVariant = (i: number, patch: Partial<Variant>) => setP((x) => ({ ...x, variants: x.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));
  const slug = slugTouched ? p.slug : slugify(p.name);
  const slugClash = !!slug && taken.includes(slug) && slug !== product?.slug;
  const off = p.compareAt && p.compareAt > p.price && p.price > 0 ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  const save = () =>
    start(async () => {
      const r = await saveProduct({ ...p, slug }, isNew ? undefined : product!.slug);
      if (!r.ok) return toast(r.error, { tone: "error" });
      setP(r.product);
      setSlugTouched(true);
      toast(isNew ? "Product added" : "Saved — live on the site");
      if (isNew || r.slug !== product!.slug) router.replace(`/admin/catalog/products/${r.slug}`);
    });

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${p.name}?`, body: "It disappears from the shop. Past orders keep their details. Tip: hiding it instead keeps it for later.", confirm: "Delete product", danger: true }))) return;
    start(async () => {
      const r = await deleteProduct(product!.slug);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast(`${p.name} deleted`);
      router.replace("/admin/catalog");
    });
  };

  return (
    <>
      <PageHeader
        title={isNew ? "New product" : p.name || "Product"}
        back="/admin/catalog"
        large={false}
        actions={!isNew && <a href={`/shop/${product!.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View on the site" className="grid h-11 w-11 place-items-center rounded-full text-bone active:bg-white/10"><ExternalI /></a>}
      />

      {p.hidden && !isNew && (
        <button onClick={() => set("hidden", false)} className="mt-2 flex w-full items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-[0.9rem] text-bone/80">
          <EyeOffI className="h-5 w-5 shrink-0 text-mute" /> <span className="flex-1">Hidden from the shop.</span> <span className="font-semibold text-lilac">Show it</span>
        </button>
      )}

      <Section title="Photos & colours" className="mt-5" hint="One photo per colour — customers swipe between them. A single product just needs one.">
        <div className="space-y-2.5">
          {p.variants.map((v, i) => (
            <Card key={i} className="flex gap-3 p-3">
              <ImageField value={v.image} onChange={(url) => setVariant(i, { image: url })} className="h-[5.5rem] w-[5.5rem] shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/20" style={{ background: v.swatch }} title="Colour dot">
                    <input type="color" value={v.swatch} onChange={(e) => setVariant(i, { swatch: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Colour dot" />
                  </label>
                  <Input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder={p.variants.length > 1 ? "Colour name" : "e.g. 50 ml (optional)"} className="h-11" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[0.85rem] text-bone/80">
                    <Toggle checked={!!v.soldOut} onChange={(on) => setVariant(i, { soldOut: on })} label={`${v.name || "This colour"} sold out`} />
                    Sold out
                  </label>
                  {p.variants.length > 1 && (
                    <IconButton label="Remove colour" className="h-10 w-10 text-mute" onClick={() => setP((x) => ({ ...x, variants: x.variants.filter((_, k) => k !== i) }))}><TrashI className="h-[18px] w-[18px]" /></IconButton>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <Button variant="ghost" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => setP((x) => ({ ...x, variants: [...x.variants, { id: "", name: "", swatch: "#121016", image: "" }] }))}>Add colour</Button>
        </div>
      </Section>

      <Section title="Basics">
        <Card className="space-y-4 p-4">
          <Field label="Name"><Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Silky Durag" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price"><MoneyInput value={p.price || null} onChange={(v) => set("price", v ?? 0)} optional /></Field>
            <Field label="Was (optional)" hint={off ? `Shows −${off}%` : "Crossed-out price"}><MoneyInput value={p.compareAt ?? null} onChange={(v) => set("compareAt", v ?? undefined)} optional /></Field>
          </div>
          <Field label="Collection">
            <Select value={p.collection} onChange={(e) => set("collection", e.target.value)}>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Label on the photo">
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button key={t || "none"} type="button" aria-pressed={(p.tag ?? "") === t} onClick={() => set("tag", t || undefined)} className={cx("h-10 rounded-full border px-4 text-[0.88rem] font-semibold", (p.tag ?? "") === t ? "border-lilac bg-lilac text-abyss" : "border-white/[0.12] text-bone/80")}>{t || "None"}</button>
              ))}
            </div>
          </Field>
        </Card>
      </Section>

      <Section title="Words">
        <Card className="space-y-4 p-4">
          <Field label="Short line" hint="One line under the name in search and the bag."><Input value={p.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="Long tails, centre seam, zero frizz." /></Field>
          <Field label="Description"><TextArea value={p.description} onChange={(e) => set("description", e.target.value)} minRows={4} /></Field>
        </Card>
      </Section>

      <Section title="Details" hint="Shown in the “Details” fold on the product page.">
        <ListEditor items={p.details} onChange={(v) => set("details", v)} placeholder="e.g. Silky satin weave" addLabel="Add detail" />
      </Section>
      <Section title="Care">
        <ListEditor items={p.care} onChange={(v) => set("care", v)} placeholder="e.g. Hand wash cold" addLabel="Add care tip" />
      </Section>

      <Section title="On the site">
        <Card className="divide-y divide-white/[0.06]">
          <ToggleRow title="Show in the shop" hint={p.hidden ? "Hidden — only you can see it here." : "Visible to everyone."} checked={!p.hidden} onChange={(on) => set("hidden", !on)} />
          <ToggleRow title="Sold out" hint="Keeps it visible but stops orders." checked={!!p.soldOut} onChange={(on) => set("soldOut", on)} />
        </Card>
      </Section>

      <Section title="Web address" hint={slugClash ? <span className="text-rose-300">Another product already uses this address.</span> : "Changing it breaks links you already shared."}>
        <div className="flex items-center rounded-xl border border-white/10 bg-ink pl-3.5 focus-within:border-lilac/70">
          <span className="shrink-0 text-[0.95rem] text-mute">/shop/</span>
          <input value={slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="h-12 min-w-0 flex-1 bg-transparent pr-3.5 text-[16px] text-bone outline-none" autoCapitalize="none" aria-label="Web address" />
        </div>
      </Section>

      {!isNew && (
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" icon={<CopyI />} onClick={() => router.push(`/admin/catalog/products/new?copy=${product!.slug}`)}>Duplicate</Button>
          <Button variant="danger" className="flex-1" icon={<TrashI />} onClick={remove}>Delete product</Button>
        </div>
      )}

      <SaveBar
        dirty={isNew || dirty} saving={busy} onSave={save} onDiscard={isNew ? undefined : () => setP(initial)}
        label={isNew ? "Add product" : "Save"} note={isNew ? "Not in the shop yet" : undefined}
      />
    </>
  );
}
