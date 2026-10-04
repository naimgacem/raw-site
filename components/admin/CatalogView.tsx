"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { reorderProducts, reorderStyles, saveGroups } from "@/app/admin/actions";
import { price } from "@/lib/site";
import type { Category, Collection, HairStyle, Product } from "@/lib/types";
import { ImageField } from "./ImagePicker";
import { useDirty, useShell } from "./Shell";
import { Button, Card, Empty, Field, IconButton, Input, LinkButton, PageHeader, Pill, SaveBar, Section, Segmented, Sheet, Thumb, cx, same } from "./ui";
import { DownI, GridI, NextI, PlusI, TrashI, UpI } from "./icons";

type Tab = "products" | "styles" | "groups";

export default function CatalogView({ products, styles, collections, categories, tab: initial }: { products: Product[]; styles: HairStyle[]; collections: Collection[]; categories: Category[]; tab: Tab }) {
  const router = useRouter();
  const path = usePathname();
  const [tab, setTab] = useState<Tab>(initial);
  const [ordering, setOrdering] = useState(false);
  const pick = (t: Tab) => {
    setTab(t);
    setOrdering(false);
    router.replace(t === "products" ? path : `${path}?tab=${t}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Catalog"
        sub={`${products.length} products · ${styles.length} styles`}
        actions={
          tab !== "groups" && !ordering ? (
            <LinkButton href={tab === "products" ? "/admin/catalog/products/new" : "/admin/catalog/styles/new"} variant="primary" size="sm" icon={<PlusI className="h-4 w-4" />}>Add</LinkButton>
          ) : null
        }
      />
      <Segmented<Tab> label="Catalog section" value={tab} onChange={pick} options={[{ value: "products", label: "Shop" }, { value: "styles", label: "Menu" }, { value: "groups", label: "Groups" }]} />

      {tab === "products" && (
        <Ordered
          key="p" items={products} getKey={(p) => p.slug} ordering={ordering} setOrdering={setOrdering} onSave={reorderProducts} noun="products"
          empty={<Empty icon={<GridI className="h-7 w-7" />} title="No products" action={<LinkButton href="/admin/catalog/products/new" variant="primary" icon={<PlusI className="h-4 w-4" />}>Add a product</LinkButton>} />}
          row={(p) => (
            <>
              <Thumb src={p.variants[0]?.image} className={cx("h-16 w-16 rounded-2xl", p.hidden && "opacity-40")} />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate font-semibold", p.hidden && "text-bone/50")}>{p.name}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5 text-[0.88rem]">
                  <span className="font-medium">{price(p.price)}</span>
                  {p.compareAt ? <span className="text-mute line-through">{price(p.compareAt)}</span> : null}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  {p.hidden && <Pill cls="bg-white/[0.08] text-mute">Hidden</Pill>}
                  {(p.soldOut || p.variants.every((v) => v.soldOut)) && <Pill cls="bg-rose-500/15 text-rose-300">Sold out</Pill>}
                  {!p.hidden && !p.soldOut && p.variants.some((v) => v.soldOut) && <Pill cls="bg-amber-400/10 text-amber-200">Some sold out</Pill>}
                  {p.variants.length > 1 && (
                    <span className="flex gap-1">{p.variants.slice(0, 5).map((v) => <span key={v.id} className={cx("h-3.5 w-3.5 rounded-full ring-1 ring-white/20", v.soldOut && "opacity-30")} style={{ background: v.swatch }} />)}</span>
                  )}
                  <span className="truncate text-[0.8rem] text-mute">{collections.find((c) => c.id === p.collection)?.name}</span>
                </span>
              </span>
            </>
          )}
          href={(p) => `/admin/catalog/products/${p.slug}`}
        />
      )}

      {tab === "styles" && (
        <Ordered
          key="s" items={styles} getKey={(s) => s.slug} ordering={ordering} setOrdering={setOrdering} onSave={reorderStyles} noun="styles"
          empty={<Empty icon={<GridI className="h-7 w-7" />} title="No styles" action={<LinkButton href="/admin/catalog/styles/new" variant="primary" icon={<PlusI className="h-4 w-4" />}>Add a style</LinkButton>} />}
          row={(s) => (
            <>
              <Thumb src={s.render} className={cx("h-16 w-16 rounded-2xl", s.hidden && "opacity-40")} />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate font-semibold", s.hidden && "text-bone/50")}>{s.name}</span>
                <span className="mt-0.5 block text-[0.88rem]"><span className="text-mute">from </span><span className="font-medium">{price(s.from)}</span><span className="text-mute"> · {s.duration}</span></span>
                <span className="mt-1 flex items-center gap-1.5">
                  {s.hidden && <Pill cls="bg-white/[0.08] text-mute">Hidden</Pill>}
                  {s.tag && <Pill cls="bg-lilac/[0.12] text-lilac">{s.tag}</Pill>}
                  <span className="truncate text-[0.8rem] text-mute">{categories.find((c) => c.id === s.category)?.label}</span>
                </span>
              </span>
            </>
          )}
          href={(s) => `/admin/catalog/styles/${s.slug}`}
        />
      )}

      {tab === "groups" && <Groups collections={collections} categories={categories} products={products} styles={styles} />}
    </>
  );
}

/** A list that can switch into "reorder" mode with up/down buttons (reliable on phones, unlike drag). */
function Ordered<T>({ items, getKey, row, href, ordering, setOrdering, onSave, noun, empty }: {
  items: T[]; getKey: (t: T) => string; row: (t: T) => React.ReactNode; href: (t: T) => string; ordering: boolean; setOrdering: (b: boolean) => void;
  onSave: (keys: string[]) => Promise<{ ok: boolean; error?: string } | { ok: false; error: string }>; noun: string; empty: React.ReactNode;
}) {
  const { toast } = useShell();
  const [list, setList] = useState(items);
  const [busy, start] = useTransition();
  useEffect(() => setList(items), [items]);
  if (items.length === 0) return <>{empty}</>;

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const done = () =>
    start(async () => {
      const r = await onSave(list.map(getKey));
      if (!r.ok) return toast((r as { error: string }).error, { tone: "error" });
      toast("New order saved");
      setOrdering(false);
    });

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[0.82rem] text-mute">{ordering ? `Move ${noun} into the order shown on the site.` : `Same order as on the site.`}</p>
        {ordering ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setList(items); setOrdering(false); }} disabled={busy}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={done} loading={busy}>Done</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-lilac" onClick={() => setOrdering(true)}>Reorder</Button>
        )}
      </div>
      <ul className="space-y-2">
        {list.map((t, i) => (
          <li key={getKey(t)}>
            {ordering ? (
              <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-ink2 p-2.5 pr-1.5">
                {row(t)}
                <div className="flex shrink-0 flex-col">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-9 w-10"><UpI /></IconButton>
                  <IconButton label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="h-9 w-10"><DownI /></IconButton>
                </div>
              </div>
            ) : (
              <Link href={href(t)} className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-ink2 p-2.5 pr-3 transition-colors active:bg-ink3/60">
                {row(t)}
                <NextI className="h-5 w-5 shrink-0 text-mute" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------- collections & categories */
function Groups({ collections, categories, products, styles }: { collections: Collection[]; categories: Category[]; products: Product[]; styles: HairStyle[] }) {
  const { toast, confirm } = useShell();
  const [cols, setCols] = useState(collections);
  const [cats, setCats] = useState(categories);
  const [edit, setEdit] = useState<number | null>(null);
  const [busy, start] = useTransition();
  useEffect(() => { setCols(collections); setCats(categories); }, [collections, categories]);
  const dirty = !same([cols, cats], [collections, categories]);
  useDirty(dirty);

  const save = () =>
    start(async () => {
      const r = await saveGroups(cols, cats);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast("Groups saved");
    });

  const removeCol = async (i: number) => {
    const n = products.filter((p) => p.collection === cols[i].id).length;
    if (n) return toast(`${n} product${n === 1 ? " is" : "s are"} in ${cols[i].name} — move ${n === 1 ? "it" : "them"} first`, { tone: "error" });
    if (await confirm({ title: `Remove ${cols[i].name || "this collection"}?`, confirm: "Remove", danger: true })) { setCols(cols.filter((_, k) => k !== i)); setEdit(null); }
  };
  const removeCat = (i: number) => {
    const n = styles.filter((s) => s.category === cats[i].id).length;
    if (n) return toast(`${n} style${n === 1 ? " is" : "s are"} in ${cats[i].label} — move ${n === 1 ? "it" : "them"} first`, { tone: "error" });
    setCats(cats.filter((_, k) => k !== i));
  };
  const c = edit !== null ? cols[edit] : null;

  return (
    <>
      <Section title="Shop collections" className="mt-6" hint="The shop’s filter tabs and the “Shop by collection” cards. Empty collections are hidden on the site.">
        <div className="space-y-2">
          {cols.map((x, i) => (
            <button key={x.id || i} onClick={() => setEdit(i)} className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.06] bg-ink2 p-2.5 pr-3 text-left active:bg-ink3/60">
              <Thumb src={x.image} className="h-14 w-14 rounded-2xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{x.name || "Untitled"}</span>
                <span className="block truncate text-[0.84rem] text-mute">{x.line || "—"} · {count(products.filter((p) => p.collection === x.id).length, "product")}</span>
              </span>
              <NextI className="h-5 w-5 text-mute" />
            </button>
          ))}
          <Button variant="ghost" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => { setCols([...cols, { id: "", name: "", line: "", image: "" }]); setEdit(cols.length); }}>Add collection</Button>
        </div>
      </Section>

      <Section title="Menu categories" hint="The tabs on the service menu.">
        <Card className="space-y-2 p-3">
          {cats.map((x, i) => (
            <div key={x.id || `new-${i}`} className="flex items-center gap-2">
              <Input value={x.label} onChange={(e) => setCats(cats.map((y, k) => (k === i ? { ...y, label: e.target.value } : y)))} placeholder="Category name" />
              <span className="w-14 shrink-0 text-center text-[0.8rem] text-mute">{count(styles.filter((s) => s.category === x.id).length, "style")}</span>
              <IconButton label="Remove category" onClick={() => removeCat(i)} className="text-mute"><TrashI className="h-[18px] w-[18px]" /></IconButton>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => setCats([...cats, { id: "", label: "" }])}>Add category</Button>
        </Card>
      </Section>

      <Sheet open={c !== null} onClose={() => setEdit(null)} title={c?.name || "New collection"} footer={
        <div className="flex gap-2">
          <Button variant="danger" size="lg" icon={<TrashI />} onClick={() => edit !== null && removeCol(edit)}>Remove</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={() => setEdit(null)}>Done</Button>
        </div>
      }>
        {c && edit !== null && (
          <div className="space-y-4">
            <div className="flex justify-center"><ImageField value={c.image} onChange={(url) => setCols(cols.map((y, k) => (k === edit ? { ...y, image: url } : y)))} className="h-32 w-32" label="Cover photo" /></div>
            <Field label="Name"><Input value={c.name} onChange={(e) => setCols(cols.map((y, k) => (k === edit ? { ...y, name: e.target.value } : y)))} placeholder="e.g. Durags" /></Field>
            <Field label="Short line" hint="Shown under the name on the collection card."><Input value={c.line} onChange={(e) => setCols(cols.map((y, k) => (k === edit ? { ...y, line: e.target.value } : y)))} placeholder="e.g. Silk & velvet" /></Field>
          </div>
        )}
      </Sheet>

      <SaveBar dirty={dirty} saving={busy} onSave={save} onDiscard={() => { setCols(collections); setCats(categories); }} />
    </>
  );
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
