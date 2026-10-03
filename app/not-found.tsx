import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-full.png" alt="" className="h-40 w-auto opacity-80" />
      <h1 className="mt-6 font-display text-4xl uppercase">Lost at sea</h1>
      <p className="mt-2 text-mute">This page swam away.</p>
      <Link href="/" className="pill pill-lilac mt-6">Back home</Link>
    </section>
  );
}
