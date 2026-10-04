"use client";

// The admin's UI kit. Phone first: 44px+ tap targets, 16px inputs (no iOS zoom), thumb-reach actions.
import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { BackI, CloseI, DownI, PlusI, SpinnerI, TrashI, UpI } from "./icons";
import type { BookingStatus, OrderStatus } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Deep equality that ignores key order, undefined and false-y flags — the database may hand objects back reordered. */
export function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as object).sort()
          .filter((k) => (v as Record<string, unknown>)[k] !== undefined && (v as Record<string, unknown>)[k] !== false)
          .map((k) => [k, norm((v as Record<string, unknown>)[k])])
      );
    }
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}
const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------ buttons */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive" | "success" | "outline";
type Size = "sm" | "md" | "lg";

export function btn(variant: Variant = "secondary", size: Size = "md") {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold [&>svg]:shrink-0 transition-[transform,background-color,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
    size === "sm" && "h-9 px-3.5 text-[0.85rem]",
    size === "md" && "h-11 px-5 text-[0.95rem]",
    size === "lg" && "h-[3.25rem] px-6 text-base",
    variant === "primary" && "bg-lilac text-abyss shadow-[0_10px_28px_-12px_rgba(205,184,247,0.75)] hover:bg-lilac2",
    variant === "secondary" && "bg-white/[0.08] text-bone hover:bg-white/[0.12]",
    variant === "outline" && "border border-white/15 text-bone hover:bg-white/[0.05]",
    variant === "ghost" && "text-bone hover:bg-white/[0.06]",
    variant === "danger" && "bg-rose-500/[0.14] text-rose-300 hover:bg-rose-500/20",
    variant === "destructive" && "bg-rose-500 text-white hover:bg-rose-400",
    variant === "success" && "bg-emerald-400/[0.14] text-emerald-300 hover:bg-emerald-400/20"
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: React.ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cx(btn(variant, size), className)} {...rest}>
      {loading ? <SpinnerI className="h-[18px] w-[18px]" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ href, variant = "secondary", size = "md", icon, className, children, ...rest }: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={cx(btn(variant, size), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-bone transition-colors hover:bg-white/[0.06] active:bg-white/10 disabled:opacity-40", className)} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- layout */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-[20px] border border-white/[0.06] bg-ink2", className)} {...rest}>{children}</div>;
}

export function Section({ title, action, hint, className, children }: { title?: string; action?: React.ReactNode; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cx("mt-7 first:mt-0", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex min-h-[1.5rem] items-end justify-between gap-3 px-1">
          {title && <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-mute">{title}</h2>}
          {action}
        </div>
      )}
      {children}
      {hint && <p className="mt-2 px-1 text-[0.8rem] leading-snug text-mute">{hint}</p>}
    </section>
  );
}

/** Big title that collapses into the sticky bar as you scroll (iOS large-title pattern). */
export function PageHeader({ title, sub, back, actions, large = true }: { title: string; sub?: React.ReactNode; back?: string | (() => void); actions?: React.ReactNode; large?: boolean }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(!large);
  useEffect(() => {
    if (!large || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [large]);

  const backBtn =
    typeof back === "string" ? (
      <Link href={back} aria-label="Back" className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-bone active:bg-white/10"><BackI className="h-6 w-6" /></Link>
    ) : back ? (
      <IconButton label="Back" onClick={back} className="-ml-2"><BackI className="h-6 w-6" /></IconButton>
    ) : null;

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 border-b bg-abyss/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-colors duration-200 lg:-mx-8 lg:px-8" style={{ borderColor: compact ? "rgba(255,255,255,0.06)" : "transparent" }}>
        <div className="flex h-14 items-center gap-1">
          {backBtn}
          <p className={cx("min-w-0 flex-1 truncate text-[1.05rem] font-semibold transition-opacity duration-200", compact ? "opacity-100" : "opacity-0")} aria-hidden={!compact}>{title}</p>
          <div className="-mr-2 flex shrink-0 items-center gap-1">{actions}</div>
        </div>
      </div>
      {large && (
        <div ref={sentinel} className="pb-5 pt-1">
          <h1 className="font-display text-[2.3rem] uppercase leading-[0.95] text-bone">{title}</h1>
          {sub && <div className="mt-2 text-[0.92rem] text-mute">{sub}</div>}
        </div>
      )}
    </>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.05] text-lilac">{icon}</span>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      {text && <p className="mt-1.5 max-w-[19rem] text-[0.92rem] leading-snug text-mute">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Banner({ tone = "info", icon, children, action }: { tone?: "info" | "warn" | "danger" | "ok"; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 rounded-2xl border p-3.5 text-[0.9rem] leading-snug",
        tone === "info" && "border-lilac/20 bg-lilac/[0.07] text-lilac2",
        tone === "warn" && "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
        tone === "danger" && "border-rose-400/30 bg-rose-500/[0.09] text-rose-100",
        tone === "ok" && "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100"
      )}
    >
      {icon && <span className="mt-px shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- inputs */
export const inputCls =
  "h-12 w-full min-w-0 rounded-xl border border-white/10 bg-ink px-3.5 text-[16px] text-bone outline-none transition-[border-color,box-shadow] placeholder:text-mute/55 focus:border-lilac/70 focus:ring-[3px] focus:ring-lilac/15 disabled:opacity-50 [color-scheme:dark]";

export function Field({ label, hint, error, children, className, htmlFor }: { label?: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx("block", className)}>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block px-0.5 text-[0.85rem] font-medium text-bone/80">{label}</label>}
      {children}
      {error ? <p className="mt-1.5 px-0.5 text-[0.8rem] text-rose-300">{error}</p> : hint ? <p className="mt-1.5 px-0.5 text-[0.8rem] leading-snug text-mute">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputCls, className)} {...rest} />;
});

export function TextArea({ className, value, onChange, minRows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} onChange={onChange} className={cx(inputCls, "h-auto resize-none py-3 leading-relaxed", className)} {...rest} />;
}

/** Whole dinars. `null` when empty (only if `optional`). */
export function MoneyInput({ value, onChange, optional, placeholder, id, className, suffix = "DA", ...rest }: { value: number | null | undefined; onChange: (v: number | null) => void; optional?: boolean; placeholder?: string; id?: string; className?: string; suffix?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const shown = value === null || value === undefined ? "" : String(value);
  return (
    <div className={cx("relative", className)}>
      <input
        id={id} inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={shown} placeholder={placeholder ?? (optional ? "—" : "0")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          onChange(digits === "" ? (optional ? null : 0) : Number(digits));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className={cx(inputCls, "pr-12 tabular-nums")}
        {...rest}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.85rem] font-medium text-mute">{suffix}</span>
    </div>
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx("relative", className)}>
      <select className={cx(inputCls, "appearance-none pr-10")} {...rest}>{children}</select>
      <DownI className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40", checked ? "bg-lilac" : "bg-white/[0.14]")}
    >
      <span className={cx("absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out", checked && "translate-x-5")} />
    </button>
  );
}

/** A full-width tappable row with a switch on the right. */
export function ToggleRow({ title, hint, checked, onChange, disabled, icon }: { title: string; hint?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lilac">{icon}</span>}
      <div className="min-w-0 flex-1" onClick={() => !disabled && onChange(!checked)}>
        <p className="font-medium leading-tight">{title}</p>
        {hint && <p className="mt-0.5 text-[0.82rem] leading-snug text-mute">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex rounded-full bg-ink p-1", size === "md" ? "h-12" : "h-10")}>
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx("flex-1 whitespace-nowrap rounded-full px-3 text-[0.9rem] font-semibold transition-colors", value === o.value ? "bg-lilac text-abyss" : "text-bone/70 hover:text-bone")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Horizontally scrolling filter chips. */
export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:-mx-8 lg:px-8">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={cx("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.88rem] font-semibold transition-colors", on ? "border-lilac bg-lilac text-abyss" : "border-white/10 text-bone/80 hover:border-white/20")}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && <span className={cx("min-w-[1.25rem] rounded-full px-1.5 text-center text-[0.72rem] tabular-nums", on ? "bg-abyss/15" : "bg-white/10 text-bone/80")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.4-4.4" /></svg>
      <input type="search" enterKeyHint="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(inputCls, "h-11 rounded-full pl-11 pr-10")} />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-mute active:bg-white/10">
          <CloseI className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center rounded-full border border-white/15">
      <button type="button" aria-label="Less" className="grid h-10 w-10 place-items-center text-bone disabled:opacity-30" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg></button>
      <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="More" className="grid h-10 w-10 place-items-center text-bone disabled:opacity-30" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><PlusI className="h-4 w-4" /></button>
    </div>
  );
}

/* ------------------------------------------------------------- status */
export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  new: { label: "New", cls: "bg-violet/20 text-lilac", dot: "bg-violet" },
  confirmed: { label: "Confirmed", cls: "bg-sky-400/15 text-sky-300", dot: "bg-sky-400" },
  shipped: { label: "Shipped", cls: "bg-amber-400/15 text-amber-200", dot: "bg-amber-300" },
  delivered: { label: "Delivered", cls: "bg-emerald-400/15 text-emerald-300", dot: "bg-emerald-400" },
  returned: { label: "Returned", cls: "bg-rose-500/15 text-rose-300", dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", cls: "bg-white/[0.08] text-mute", dot: "bg-white/40" },
};
export const BOOKING_STATUS: Record<BookingStatus, { label: string; cls: string; dot: string }> = {
  new: { label: "Request", cls: "bg-violet/20 text-lilac", dot: "bg-violet" },
  confirmed: { label: "Confirmed", cls: "bg-sky-400/15 text-sky-300", dot: "bg-sky-400" },
  done: { label: "Done", cls: "bg-emerald-400/15 text-emerald-300", dot: "bg-emerald-400" },
  noshow: { label: "No-show", cls: "bg-rose-500/15 text-rose-300", dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", cls: "bg-white/[0.08] text-mute", dot: "bg-white/40" },
};

export function Pill({ cls, children, className }: { cls: string; children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[0.75rem] font-semibold", cls, className)}>{children}</span>;
}

/* -------------------------------------------------------------- sheet */
/** Bottom sheet on phones, centred dialog on big screens. Drag the handle down to close. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const drag = useDragControls();
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined}
            className={cx("relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/[0.07] bg-ink shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:rounded-[28px]", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.38, ease: EASE }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}
          >
            <div className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1.5 w-11 rounded-full bg-white/20 sm:hidden" />
              {title && (
                <div className="mt-2 flex items-center justify-between gap-3 sm:mt-1">
                  <h2 id={id} className="text-[1.15rem] font-semibold">{title}</h2>
                  <IconButton label="Close" onClick={onClose} className="-mr-2 h-10 w-10 bg-white/[0.06]"><CloseI className="h-5 w-5" /></IconButton>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
            {footer && <div className="shrink-0 border-t border-white/[0.06] bg-ink px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
            {!footer && <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Sticky bar that rises when a form has unsaved edits. Sits above the tab bar on phones. */
export function SaveBar({ dirty, saving, onSave, onDiscard, label = "Save changes", error, note = "Unsaved changes" }: { dirty: boolean; saving?: boolean; onSave: () => void; onDiscard?: () => void; label?: string; error?: string | null; note?: string }) {
  return (
    <>
      {/* room to scroll the last field above the bar */}
      {dirty && <div className="h-20" aria-hidden />}
      <AnimatePresence>
        {dirty && (
          <motion.div
            className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 px-3 pb-3 lg:bottom-0 lg:left-60 lg:px-8 lg:pb-6"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
          >
            {error && <p className="mx-auto mb-2 w-fit max-w-full rounded-full bg-rose-500/90 px-3.5 py-1.5 text-[0.82rem] font-semibold text-white">{error}</p>}
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-white/10 bg-ink3/95 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:pl-5">
              <p className="hidden min-w-0 flex-1 truncate text-[0.88rem] text-bone/80 sm:block">{note}</p>
              {onDiscard && <Button size="lg" variant="ghost" onClick={onDiscard} disabled={saving} className="px-5">Discard</Button>}
              <Button size="lg" variant="primary" onClick={onSave} loading={saving} className="flex-1 sm:flex-none">{label}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* --------------------------------------------------------- list editor */
/** Edits a list of short texts: type, add, reorder, remove. */
export function ListEditor({ items, onChange, placeholder, addLabel = "Add line" }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => {
    if (focusLast) { refs.current[items.length - 1]?.focus(); setFocusLast(false); }
  }, [focusLast, items.length]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            ref={(el) => { refs.current[i] = el; }}
            value={it} placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange([...items, ""]); setFocusLast(true); } }}
            className={cx(inputCls, "flex-1")}
          />
          <div className="flex shrink-0 flex-col">
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-6 w-8 place-items-center text-mute disabled:opacity-25"><UpI className="h-4 w-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-6 w-8 place-items-center text-mute disabled:opacity-25"><DownI className="h-4 w-4" /></button>
          </div>
          <IconButton label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))} className="h-10 w-10 text-mute hover:text-rose-300"><TrashI className="h-[18px] w-[18px]" /></IconButton>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<PlusI className="h-4 w-4" />} className="-ml-1 text-lilac" onClick={() => { onChange([...items, ""]); setFocusLast(true); }}>
        {addLabel}
      </Button>
    </div>
  );
}

/** Rows inside a card, separated by hairlines. */
export function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cx("divide-y divide-white/[0.06] overflow-hidden", className)}>{children}</Card>;
}

export function RowLink({ href, icon, title, sub, right, onClick, external }: { href: string; icon?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; onClick?: (e: React.MouseEvent) => void; external?: boolean }) {
  const inner = (
    <>
      {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lilac">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {sub && <span className="block truncate text-[0.82rem] text-mute">{sub}</span>}
      </span>
      {right}
    </>
  );
  const cls = "flex min-h-[3.75rem] items-center gap-3 px-4 py-2.5 transition-colors active:bg-white/[0.04]";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={href} onClick={onClick} className={cls}>{inner}</Link>
  );
}

/** "data:" safe thumbnail with the violet stage behind cut-out renders. */
export function Thumb({ src, alt = "", className }: { src?: string; alt?: string; className?: string }) {
  const cutout = !src || src.startsWith("/renders/") || src.startsWith("/brand/");
  return (
    <span className={cx("stage relative block shrink-0 overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={alt} loading="lazy" decoding="async" className={cx("absolute inset-0 h-full w-full", cutout ? "object-contain" : "object-cover")} />}
    </span>
  );
}

/** A row in an action sheet. */
export function MenuItem({ icon, label, sub, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex min-h-[3.5rem] items-center gap-3.5 rounded-2xl px-3 py-2 text-left active:bg-white/[0.05]", danger ? "text-rose-300" : "text-bone")}>
      <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", danger ? "bg-rose-500/10" : "bg-white/[0.06]")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-[0.82rem] text-mute">{sub}</span>}
      </span>
    </button>
  );
}

/** Always-visible bottom bar for editors (sits above the phone tab bar). */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-white/[0.07] bg-ink/95 px-4 py-3 backdrop-blur-xl lg:bottom-0 lg:left-60 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">{children}</div>
      </div>
    </>
  );
}
