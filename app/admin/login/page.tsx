import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAdmin, passwordSource } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await isAdmin()) redirect("/admin");
  const source = await passwordSource();
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-x-0 top-[-12rem] h-[30rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(151,31,244,0.32),transparent)]" />
      <div className="relative w-full max-w-[22rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-crown-sm.webp" alt="RAW" width={89} height={64} className="mx-auto h-16 w-[89px] drop-shadow-[0_6px_30px_rgba(151,31,244,0.55)]" />
        <h1 className="mt-5 text-center font-display text-[2.4rem] uppercase leading-none">Admin</h1>
        <p className="mt-2 text-center text-[0.95rem] text-mute">Orders, bookings, prices — all in one place.</p>
        <LoginForm next={searchParams.next ?? ""} source={source} />
      </div>
    </main>
  );
}
