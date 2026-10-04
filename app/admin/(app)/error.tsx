"use client";

import Link from "next/link";
import { useEffect } from "react";

// Any admin screen that fails to load lands here instead of a blank page.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-3xl uppercase">Couldn’t load this</p>
      <p className="mt-3 max-w-[22rem] text-[0.95rem] leading-relaxed text-mute">
        Usually the connection dropped — try again. If it keeps happening, open <b className="text-bone">Settings → Database</b>: it tells you what’s missing.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="h-11 rounded-full bg-lilac px-6 font-semibold text-abyss">Try again</button>
        <Link href="/admin/settings#database" className="grid h-11 place-items-center rounded-full bg-white/[0.08] px-6 font-semibold">Settings</Link>
      </div>
    </div>
  );
}
