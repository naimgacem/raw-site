"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "./store";
import { ArrowIcon, ChevronIcon, InstagramIcon, PinIcon } from "./Icons";
import { SITE } from "@/lib/site";
import { COLLECTIONS } from "@/lib/products";
import { STYLES } from "@/lib/styles";

// Lilac newsletter + footer, as on Sunviya ("JOIN THE SUNVIYA WAVE…").
export default function Footer() {
  const { book } = useStore();
  const productPage = usePathname().startsWith("/shop/");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    if (SITE.newsletterEndpoint) {
      try {
        await fetch(SITE.newsletterEndpoint, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      } catch {}
    }
    setSent(true);
  };

  const groups: { title: string; links: { label: string; href?: string; onClick?: () => void; external?: boolean }[] }[] = [
    { title: "Shop", links: [{ label: "Shop all", href: "/shop" }, ...COLLECTIONS.map((c) => ({ label: c.name, href: `/shop?c=${c.id}` }))] },
    { title: "Booking", links: [{ label: "The menu", href: "/menu" }, { label: "Book a style", onClick: () => book(STYLES[0].slug) }, { label: "Good to know", href: "/menu#good-to-know" }] },
    { title: "Contact", links: [{ label: `DM ${SITE.instagramHandle}`, href: SITE.instagramDM, external: true }, { label: "Instagram", href: SITE.instagram, external: true }] },
  ];

  return (
    <footer className="bg-lilac text-abyss">
      <div className="px-5 pb-8 pt-12">
        <h2 className="font-display text-[1.75rem] uppercase leading-[1.02]">
          Join the royal court — get early drops, open slots &amp; exclusive releases.
        </h2>
        {sent ? (
          <p className="mt-6 flex h-14 items-center rounded-full border-2 border-abyss px-6 font-display uppercase">Welcome to the court 👑</p>
        ) : (
          <form onSubmit={submit} className="mt-6 flex h-14 items-center rounded-full border-2 border-abyss bg-white/70 pl-6 pr-1.5">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" aria-label="Email address" autoComplete="email"
              className="h-full flex-1 bg-transparent text-[16px] text-abyss outline-none placeholder:text-abyss/55"
            />
            <button aria-label="Subscribe" className="grid h-11 w-11 place-items-center rounded-full bg-abyss text-lilac"><ArrowIcon /></button>
          </form>
        )}
      </div>

      <div className="px-5">
        {groups.map((g) => (
          <div key={g.title} className="border-t border-abyss/20">
            <button className="flex w-full items-center justify-between py-4 font-display text-[1.6rem] uppercase" aria-expanded={open === g.title} onClick={() => setOpen(open === g.title ? null : g.title)}>
              {g.title}
              <ChevronIcon className={`h-5 w-5 transition-transform duration-300 ${open === g.title ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ${open === g.title ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <ul className="overflow-hidden">
                {g.links.map((l) => (
                  <li key={l.label} className="pb-3">
                    {l.href ? (
                      <Link href={l.href} {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-display text-[0.95rem] uppercase">{l.label}</Link>
                    ) : (
                      <button onClick={l.onClick} className="font-display text-[0.95rem] uppercase">{l.label}</button>
                    )}
                  </li>
                ))}
                <li className="h-2" />
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-2 border-t border-abyss/80 px-5 pt-6 text-center ${productPage ? "pb-32" : "pb-10"}`}>
        <div className="flex items-center justify-center gap-3">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full bg-abyss text-lilac"><InstagramIcon /></a>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-abyss/70"><PinIcon /> {SITE.serviceArea}</p>
        <p className="mt-2 text-sm text-abyss/70">
          © {new Date().getFullYear()} <span className="font-display uppercase text-abyss">{SITE.fullName}</span>
        </p>
      </div>
    </footer>
  );
}
