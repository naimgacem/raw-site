"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/admin/actions";
import { Button, inputCls, cx } from "./ui";
import { AlertI, EyeI, EyeOffI, LockI } from "./icons";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-4 w-full">
      {pending ? "Checking…" : "Log in"}
    </Button>
  );
}

export default function LoginForm({ next, source }: { next: string; source: "stored" | "env" | "dev" | "none" }) {
  const [state, action] = useFormState(login, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="next" value={next} />
      {/* lets password managers pair the saved password with this site */}
      <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
      <label htmlFor="pw" className="mb-1.5 block px-0.5 text-[0.85rem] font-medium text-bone/80">Password</label>
      <div className="relative">
        <LockI className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
        <input
          id="pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" required autoFocus
          className={cx(inputCls, "h-[3.25rem] pl-11 pr-12", state?.error && "border-rose-400/60")}
          aria-invalid={!!state?.error} aria-describedby={state?.error ? "pw-error" : undefined}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-mute active:bg-white/10">
          {show ? <EyeOffI /> : <EyeI />}
        </button>
      </div>
      {state?.error && (
        <p id="pw-error" role="alert" className="mt-2 flex items-start gap-1.5 px-0.5 text-[0.85rem] text-rose-300">
          <AlertI className="mt-px h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <Submit />
      {source === "dev" && (
        <p className="mt-5 rounded-2xl border border-lilac/20 bg-lilac/[0.07] p-3 text-center text-[0.82rem] leading-snug text-lilac2">
          Local preview: the password is <b>admin</b>. Set <code className="font-mono">ADMIN_PASSWORD</code> before going live.
        </p>
      )}
      {source === "none" && (
        <p className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-3 text-center text-[0.82rem] leading-snug text-amber-100">
          No password is set yet. Add <code className="font-mono">ADMIN_PASSWORD</code> in Vercel → Settings → Environment Variables, then redeploy.
        </p>
      )}
    </form>
  );
}
