"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertI, CalendarI, CheckI, ExternalI, GearI, GridI, HomeI, LogoutI, MoreI, OrdersI, TicketI, TruckI, UsersI } from "./icons";
import { Button, Sheet, cx } from "./ui";
import { logout } from "@/app/admin/actions";

type Toast = { id: number; text: string; tone: "ok" | "error"; action?: { label: string; run: () => void } };
type ConfirmOpts = { title: string; body?: React.ReactNode; confirm?: string; danger?: boolean };

type Shell = {
  toast: (text: string, opts?: { tone?: "ok" | "error"; action?: Toast["action"] }) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  /** forms report unsaved edits so leaving the page asks first */
  setDirty: (d: boolean) => void;
  /** navigate, asking first if a form has unsaved edits */
  go: (href: string) => void;
};

const Ctx = createContext<Shell | null>(null);
export function useShell() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useShell outside <AdminShell>");
  return s;
}

/** Marks the current form dirty while `dirty` is true. */
export function useDirty(dirty: boolean) {
  const { setDirty } = useShell();
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
}

/** Keeps a list fresh: refreshes when the phone wakes up / tab regains focus, and every `seconds`. */
export function useLiveRefresh(seconds = 30) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const t = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
}

const MAIN = [
  { href: "/admin", label: "Home", icon: HomeI },
  { href: "/admin/orders", label: "Orders", icon: OrdersI, badge: "orders" as const },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarI, badge: "bookings" as const },
  { href: "/admin/catalog", label: "Catalog", icon: GridI },
];
const EXTRA = [
  { href: "/admin/customers", label: "Customers", icon: UsersI },
  { href: "/admin/delivery", label: "Delivery", icon: TruckI },
  { href: "/admin/coupons", label: "Coupons", icon: TicketI },
  { href: "/admin/settings", label: "Settings", icon: GearI },
];

const isOn = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));

export default function AdminShell({ counts, dbKind, children }: { counts: { orders: number; bookings: number }; dbKind: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const dirty = useRef(false);

  const toast = useCallback<Shell["toast"]>((text, opts) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-1), { id, text, tone: opts?.tone ?? "ok", action: opts?.action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.action ? 5000 : 2800);
  }, []);

  const confirm = useCallback<Shell["confirm"]>((o) => new Promise((resolve) => setAsk({ ...o, resolve })), []);
  const answer = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };

  const setDirty = useCallback((d: boolean) => { dirty.current = d; }, []);
  const go = useCallback(
    async (href: string) => {
      if (dirty.current && !(await confirm({ title: "Leave without saving?", body: "Your changes on this page will be lost.", confirm: "Leave", danger: true }))) return;
      dirty.current = false;
      router.push(href);
    },
    [confirm, router]
  );

  // closing the tab / reloading with unsaved edits
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const guard = (href: string) => (e: React.MouseEvent) => {
    if (!dirty.current) return;
    e.preventDefault();
    go(href);
  };

  const moreOn = EXTRA.some((x) => isOn(path, x.href)) || path === "/admin/more";

  return (
    <Ctx.Provider value={{ toast, confirm, setDirty, go }}>
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.06] bg-ink/60 px-3 pb-5 pt-5 lg:flex">
        <Link href="/admin" onClick={guard("/admin")} className="mb-6 flex items-center gap-2.5 px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-crown-sm.webp" alt="" width={45} height={32} className="h-8 w-[45px]" />
          <span className="font-display text-xl uppercase leading-none">Admin</span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {[...MAIN, ...EXTRA].map((n) => {
            const on = isOn(path, n.href);
            const badge = "badge" in n && n.badge ? counts[n.badge as "orders" | "bookings"] : 0;
            return (
              <Link key={n.href} href={n.href} onClick={guard(n.href)} aria-current={on ? "page" : undefined} className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors", on ? "bg-lilac/[0.12] text-lilac" : "text-bone/75 hover:bg-white/[0.04] hover:text-bone")}>
                <n.icon className="h-[22px] w-[22px]" />
                <span className="flex-1">{n.label}</span>
                {badge > 0 && <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-violet px-1.5 text-[0.72rem] font-bold text-white">{badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5">
          <a href="/" target="_blank" className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] text-bone/75 hover:bg-white/[0.04]"><ExternalI className="h-[22px] w-[22px]" /> View site</a>
          <form action={logout}>
            <button className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.95rem] text-bone/75 hover:bg-white/[0.04]"><LogoutI className="h-[22px] w-[22px]" /> Log out</button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-60">
        {dbKind === "none" && (
          <div className="flex items-center gap-2 bg-amber-300/[0.12] px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-[0.82rem] leading-snug text-amber-100">
            <AlertI className="h-4 w-4 shrink-0" />
            <span>Database not connected — you can look around, but changes won’t save. <Link href="/admin/settings#database" className="font-semibold underline underline-offset-2">How to connect</Link></span>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-4 pb-[calc(96px+env(safe-area-inset-bottom))] lg:px-8 lg:pb-16">{children}</div>
      </div>

      {/* phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Admin">
        <div className="mx-auto flex h-16 max-w-xl">
          {[...MAIN, { href: "/admin/more", label: "More", icon: MoreI }].map((n) => {
            const on = n.href === "/admin/more" ? moreOn : isOn(path, n.href);
            const badge = "badge" in n && n.badge ? counts[n.badge as "orders" | "bookings"] : 0;
            return (
              <Link key={n.href} href={n.href} onClick={guard(n.href)} aria-current={on ? "page" : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-0.5">
                <span className={cx("grid h-8 w-14 place-items-center rounded-full transition-colors duration-200", on ? "bg-lilac/[0.16] text-lilac" : "text-bone/60")}>
                  <n.icon className="h-[22px] w-[22px]" />
                </span>
                <span className={cx("text-[0.68rem] font-semibold leading-none", on ? "text-lilac" : "text-bone/55")}>{n.label}</span>
                {badge > 0 && <span className="absolute left-1/2 top-1 ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-1 text-[0.65rem] font-bold text-white ring-2 ring-ink">{badge > 99 ? "99+" : badge}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* toasts: top of the screen, clear of the tab bar, save bar and sheet buttons */}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-[90] flex flex-col items-center gap-2 px-4 lg:left-60">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id} role="status" layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={cx("pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full py-2.5 pl-4 pr-2.5 text-[0.9rem] font-semibold shadow-[0_14px_40px_-10px_rgba(0,0,0,0.8)]", t.tone === "ok" ? "bg-bone text-abyss" : "bg-rose-400 text-abyss")}
            >
              {t.tone === "ok" ? <CheckI className="h-[18px] w-[18px] shrink-0 text-royal" /> : <AlertI className="h-[18px] w-[18px] shrink-0" />}
              <span className="pr-1.5">{t.text}</span>
              {t.action && (
                <button className="rounded-full bg-abyss/10 px-3 py-1 text-[0.85rem] font-bold" onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sheet open={!!ask} onClose={() => answer(false)} title={ask?.title}>
        {ask?.body && <div className="text-[0.95rem] leading-relaxed text-bone/80">{ask.body}</div>}
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" variant={ask?.danger ? "destructive" : "primary"} onClick={() => answer(true)} className="w-full">{ask?.confirm ?? "Confirm"}</Button>
          <Button size="lg" variant="ghost" onClick={() => answer(false)} className="w-full">Cancel</Button>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}
