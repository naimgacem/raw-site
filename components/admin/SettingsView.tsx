"use client";

import { useEffect, useState, useTransition } from "react";
import { changePassword, logout, saveSettings, sendTestMessage, telegramConnect, telegramDisconnect, telegramFindChat } from "@/app/admin/actions";
import { igHandle } from "@/lib/site";
import type { Note, Settings } from "@/lib/types";
import { useDirty, useShell } from "./Shell";
import { Banner, Button, Card, Field, IconButton, Input, ListEditor, PageHeader, SaveBar, Section, TextArea, ToggleRow, cx, same } from "./ui";
import { BellI, CalendarI, CheckI, DbI, DownI, ExternalI, LockI, LogoutI, PlusI, ShareI, StoreI, TrashI, UpI, AlertI } from "./icons";

type Telegram = { source: "env" | "admin" | null; bot: string; chat: string };
type Status = { db: string; dbError: string; telegram: Telegram; webhook: boolean; password: string };

export default function SettingsView({ settings, notes, status }: { settings: Settings; notes: Note[]; status: Status }) {
  const { toast } = useShell();
  const [busy, start] = useTransition();
  const [s, setS] = useState(settings);
  const [n, setN] = useState(notes);
  useEffect(() => { setS(settings); setN(notes); }, [settings, notes]);
  const dirty = !same([s, n], [settings, notes]);
  useDirty(dirty);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  const save = () =>
    start(async () => {
      const r = await saveSettings(s, n);
      if (!r.ok) return toast(r.error, { tone: "error" });
      toast("Settings saved — live on the site");
    });

  const moveNote = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    const next = [...n];
    [next[i], next[j]] = [next[j], next[i]];
    setN(next);
  };

  return (
    <>
      <PageHeader title="Settings" back="/admin/more" />

      <Section title="Shop">
        <Card className="divide-y divide-white/[0.06]">
          <ToggleRow icon={<StoreI />} title="Taking orders" hint="Turn off for holidays — the order form shows your message instead." checked={s.ordersOpen} onChange={(v) => set("ordersOpen", v)} />
          {!s.ordersOpen && (
            <div className="p-4 pt-3">
              <Field label="Message while closed"><TextArea value={s.closedMessage} onChange={(e) => set("closedMessage", e.target.value)} minRows={2} /></Field>
            </div>
          )}
          <ToggleRow icon={<CalendarI />} title="Taking bookings" hint="When off, the booking sheet asks clients to DM for the waiting list." checked={s.bookingsOpen} onChange={(v) => set("bookingsOpen", v)} />
        </Card>
      </Section>

      <div id="notifications" className="scroll-mt-20" />
      <Notifications status={status} />
      <div id="database" className="scroll-mt-20" />
      <Database kind={status.db} error={status.dbError} />

      <Section title="Contact" hint="Used for every Instagram and WhatsApp button on the site.">
        <Card className="space-y-4 p-4">
          <Field label="Instagram username">
            <div className="flex items-center rounded-xl border border-white/10 bg-ink pl-3.5 focus-within:border-lilac/70">
              <span className="text-mute">@</span>
              <input value={igHandle(s.instagramHandle)} onChange={(e) => set("instagramHandle", e.target.value.replace(/^@+/, "").trim())} autoCapitalize="none" autoCorrect="off" className="h-12 min-w-0 flex-1 bg-transparent px-1 text-[16px] text-bone outline-none" aria-label="Instagram username" />
            </div>
          </Field>
          <Field label="WhatsApp number" hint={s.whatsapp ? "WhatsApp buttons are on." : "Leave empty to hide WhatsApp buttons."}>
            <Input value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} type="tel" inputMode="tel" placeholder="0555 12 34 56" />
          </Field>
          <Field label="Email (optional)" hint="Shown in the footer."><Input value={s.email} onChange={(e) => set("email", e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="hello@…" /></Field>
        </Card>
      </Section>

      <Section title="Words on the site">
        <Card className="space-y-4 p-4">
          <Field label="Tagline"><Input value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Service area" hint="Menu, footer and booking sheet."><Input value={s.serviceArea} onChange={(e) => set("serviceArea", e.target.value)} /></Field>
        </Card>
      </Section>

      <Section title="Announcement bar" hint="The scrolling lilac strip at the top of every page. Keep each one short.">
        <ListEditor items={s.announcements} onChange={(v) => set("announcements", v)} placeholder="e.g. Silky durags just dropped" addLabel="Add announcement" />
      </Section>

      <Section title="Good to know" hint="The info cards at the bottom of the menu page.">
        <div className="space-y-2.5">
          {n.map((x, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-1.5">
                <Input value={x.title} onChange={(e) => setN(n.map((y, k) => (k === i ? { ...y, title: e.target.value } : y)))} placeholder="Title" className="h-11 font-semibold" />
                <IconButton label="Move up" disabled={i === 0} onClick={() => moveNote(i, -1)} className="h-10 w-9 text-mute"><UpI className="h-4 w-4" /></IconButton>
                <IconButton label="Move down" disabled={i === n.length - 1} onClick={() => moveNote(i, 1)} className="h-10 w-9 text-mute"><DownI className="h-4 w-4" /></IconButton>
                <IconButton label="Remove card" onClick={() => setN(n.filter((_, k) => k !== i))} className="h-10 w-9 text-mute"><TrashI className="h-[18px] w-[18px]" /></IconButton>
              </div>
              <TextArea value={x.text} onChange={(e) => setN(n.map((y, k) => (k === i ? { ...y, text: e.target.value } : y)))} minRows={2} className="mt-2" placeholder="Text" />
            </Card>
          ))}
          <Button variant="ghost" className="text-lilac" icon={<PlusI className="h-4 w-4" />} onClick={() => setN([...n, { title: "", text: "" }])}>Add card</Button>
        </div>
      </Section>

      <Section title="Newsletter" hint="Optional: a Formspree or Mailchimp form address. Empty = the footer just says thanks.">
        <Input value={s.newsletterEndpoint} onChange={(e) => set("newsletterEndpoint", e.target.value)} placeholder="https://formspree.io/f/…" inputMode="url" autoCapitalize="none" />
      </Section>

      <SaveBar dirty={dirty} saving={busy} onSave={save} onDiscard={() => { setS(settings); setN(notes); }} />

      <Password source={status.password} />
      <Install />

      <form action={logout} className="mt-8">
        <Button type="submit" size="lg" variant="secondary" className="w-full" icon={<LogoutI />}>Log out</Button>
      </form>
    </>
  );
}

function StatusRow({ ok, title, text }: { ok: boolean; title: string; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.08] text-mute")}>
        {ok ? <CheckI className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <div className="mt-0.5 text-[0.84rem] leading-snug text-mute">{text}</div>
      </div>
    </div>
  );
}

function Notifications({ status }: { status: Status }) {
  const { toast, confirm } = useShell();
  const [busy, start] = useTransition();
  const [tg, setTg] = useState(status.telegram);
  useEffect(() => setTg(status.telegram), [status.telegram]);
  const [token, setToken] = useState("");
  const connected = tg.source !== null;
  const canSave = status.db !== "none";

  const test = () => start(async () => { const r = await sendTestMessage(); toast(r.ok ? "Test sent — check Telegram" : r.error, { tone: r.ok ? "ok" : "error" }); });
  const connect = () => start(async () => {
    const r = await telegramConnect(token);
    if (!r.ok) return toast(r.error, { tone: "error" });
    setTg({ source: null, bot: r.bot, chat: "" });
    setToken("");
  });
  const find = () => start(async () => {
    const r = await telegramFindChat();
    if (!r.ok) return toast(r.error, { tone: "error" });
    setTg((x) => ({ ...x, source: "admin", chat: r.chat }));
    toast("Connected — check Telegram 👑");
  });
  const disconnect = async () => {
    if (!(await confirm({ title: "Disconnect Telegram?", body: "Orders keep arriving here in the dashboard, just not on Telegram.", confirm: "Disconnect", danger: true }))) return;
    start(async () => { const r = await telegramDisconnect(); if (r.ok) setTg({ source: null, bot: "", chat: "" }); else toast(r.error, { tone: "error" }); });
  };

  return (
    <Section title="Notifications" hint="Every order and booking request is always here in the dashboard. Telegram also pings your phone the moment one comes in.">
      <Card className="overflow-hidden">
        {connected ? (
          <>
            <StatusRow ok title="Telegram connected" text={tg.source === "env" ? "Set up in Vercel. Every order arrives as a message." : <>Messages go to <b className="text-bone">{tg.chat || "your chat"}</b>{tg.bot ? <> via @{tg.bot}</> : null}.</>} />
            <div className="flex gap-2 border-t border-white/[0.06] p-3">
              <Button className="flex-1" icon={<BellI />} loading={busy} onClick={test}>Send a test</Button>
              {tg.source === "admin" && <Button variant="ghost" onClick={disconnect} disabled={busy}>Disconnect</Button>}
            </div>
          </>
        ) : !canSave ? (
          <StatusRow ok={false} title="Telegram" text="Connect the database first (below) — then you can set Telegram up right here." />
        ) : !tg.bot ? (
          <div className="p-4">
            <p className="font-semibold">Get every order on Telegram</p>
            <p className="mt-1 text-[0.88rem] leading-snug text-mute">Free, takes 2 minutes, all from your phone.</p>
            <ol className="mt-4 space-y-4 text-[0.92rem]">
              <li className="flex gap-3">
                <StepNo n={1} />
                <div className="min-w-0 flex-1">
                  <p>Open <b>@BotFather</b> in Telegram and send <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.85em]">/newbot</code>. Give it any name (e.g. “RAW Orders”) and a username ending in <i>bot</i>.</p>
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[0.88rem] font-semibold">Open @BotFather <ExternalI className="h-4 w-4" /></a>
                </div>
              </li>
              <li className="flex gap-3">
                <StepNo n={2} />
                <div className="min-w-0 flex-1">
                  <p>BotFather replies with a <b>token</b> (it looks like <span className="font-mono text-[0.85em]">123456:ABC…</span>). Copy it and paste it here:</p>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="mt-2 font-mono text-[0.95rem]" />
                  <Button variant="primary" className="mt-2 w-full" loading={busy} disabled={token.trim().length < 20} onClick={connect}>Connect</Button>
                </div>
              </li>
            </ol>
          </div>
        ) : (
          <div className="p-4">
            <p className="flex items-center gap-2 font-semibold"><CheckI className="h-5 w-5 text-emerald-300" /> Bot found: @{tg.bot}</p>
            <ol className="mt-4 space-y-4 text-[0.92rem]">
              <li className="flex gap-3">
                <StepNo n={3} />
                <div className="min-w-0 flex-1">
                  <p>Open your bot and press <b>Start</b>.</p>
                  <a href={`https://t.me/${tg.bot}?start=raw`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[0.88rem] font-semibold">Open @{tg.bot} <ExternalI className="h-4 w-4" /></a>
                </div>
              </li>
              <li className="flex gap-3">
                <StepNo n={4} />
                <div className="min-w-0 flex-1">
                  <p>Come back here and tap:</p>
                  <Button variant="primary" className="mt-2 w-full" loading={busy} onClick={find}>I pressed Start</Button>
                </div>
              </li>
            </ol>
            <button className="mt-4 text-[0.82rem] font-medium text-mute underline-offset-2 hover:underline" onClick={() => setTg({ source: null, bot: "", chat: "" })}>Use a different bot</button>
          </div>
        )}
        {status.webhook && <div className="border-t border-white/[0.06]"><StatusRow ok title="Google Sheets / webhook" text="Orders are also sent to your webhook." /></div>}
      </Card>
    </Section>
  );
}

function StepNo({ n }: { n: number }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-lilac/50 text-[0.8rem] font-bold text-lilac">{n}</span>;
}

function Database({ kind, error }: { kind: string; error: string }) {
  return (
    <Section title="Database">
      {kind === "supabase" && error ? (
        <Banner tone="danger" icon={<AlertI className="h-5 w-5" />}><p className="font-semibold">Supabase is connected but not working.</p><p className="mt-1">{error}</p></Banner>
      ) : kind === "supabase" ? (
        <Card><StatusRow ok title="Supabase connected" text="Orders, bookings, prices and photos are stored safely. A daily check keeps the free plan awake." /></Card>
      ) : kind === "file" ? (
        <Banner tone="info" icon={<DbI className="h-5 w-5" />}>Local preview — data is saved in the <code className="font-mono">.data</code> folder on this computer. On the live site, connect Supabase (README → Admin setup).</Banner>
      ) : (
        <Banner tone="warn" icon={<AlertI className="h-5 w-5" />}>
          <p className="font-semibold">Not connected — changes can’t be saved.</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>Create a free project at supabase.com.</li>
            <li>In its SQL Editor, run <code className="font-mono">supabase/schema.sql</code> from the project.</li>
            <li>In Vercel → Settings → Environment Variables add <code className="font-mono">SUPABASE_URL</code> and <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>, then redeploy.</li>
          </ol>
        </Banner>
      )}
    </Section>
  );
}

function Password({ source }: { source: string }) {
  const { toast } = useShell();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const mismatch = f.again.length > 0 && f.next !== f.again;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.next.length < 8) return toast("Use at least 8 characters", { tone: "error" });
    if (f.next !== f.again) return toast("The two new passwords don’t match", { tone: "error" });
    start(async () => {
      const r = await changePassword(f.current, f.next);
      if (!r.ok) return toast(r.error, { tone: "error" });
      setF({ current: "", next: "", again: "" });
      toast("Password changed — other devices are signed out");
    });
  };
  return (
    <Section title="Password" hint={source === "env" ? "Right now the password comes from ADMIN_PASSWORD. Setting one here replaces it." : source === "dev" ? "Local preview uses “admin” until you set one." : undefined}>
      <Card className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
          <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters."><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
          <Field label="New password again" error={mismatch ? "Doesn’t match" : null}><Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
          <Button type="submit" className="w-full" icon={<LockI />} loading={busy} disabled={!f.current || !f.next || !f.again}>Change password</Button>
        </form>
      </Card>
    </Section>
  );
}

function Install() {
  return (
    <Section title="Put it on your home screen">
      <Card className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lilac"><ShareI /></span>
        <p className="text-[0.9rem] leading-relaxed text-bone/80">
          <b className="text-bone">iPhone:</b> open this page in Safari → Share → <i>Add to Home Screen</i>.<br />
          <b className="text-bone">Android:</b> Chrome menu ⋮ → <i>Add to Home screen</i>.<br />
          It opens full-screen like an app.
        </p>
      </Card>
    </Section>
  );
}
