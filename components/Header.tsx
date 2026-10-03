"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import { BagIcon, InstagramIcon, MenuIcon, SearchIcon } from "./Icons";
import { SITE } from "@/lib/site";

/**
 * Sunviya layout: menu + search left, logo dead centre, sitting on top of the hero video.
 * It overlaps the hero (negative margin) and turns solid once you scroll.
 */
export default function Header() {
  const { open, count } = useStore();
  const home = usePathname() === "/";
  const [solid, setSolid] = useState(!home);

  useEffect(() => {
    if (!home) { setSolid(true); return; }
    const onScroll = () => setSolid(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  const btn = "grid h-11 w-11 place-items-center rounded-full text-bone transition-colors active:bg-white/10";

  return (
    <header
      className={`sticky top-0 z-40 h-[68px] ${home ? "-mb-[68px]" : ""} transition-[background-color,backdrop-filter,border-color] duration-500 ${
        solid ? "border-b border-white/[0.06] bg-abyss/85 backdrop-blur-xl" : "border-b border-transparent bg-gradient-to-b from-black/45 to-transparent"
      }`}
    >
      <div className="relative flex h-full items-center justify-between px-2">
        <div className="flex items-center">
          <button className={btn} aria-label="Open menu" onClick={() => open("menu")}><MenuIcon /></button>
          <button className={btn} aria-label="Search" onClick={() => open("search")}><SearchIcon className="h-[22px] w-[22px]" /></button>
        </div>

        <Link href="/" aria-label="RAW — Royal Art Weaves, home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-crown.png"
            alt="RAW"
            width={719}
            height={515}
            className={`w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] transition-[height] duration-500 ease-out ${solid ? "h-[42px]" : "h-[54px]"}`}
          />
        </Link>

        <div className="flex items-center">
          <a className={btn} href={SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon className="h-[22px] w-[22px]" /></a>
          <button className={`${btn} relative`} aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`} onClick={() => open("cart")}>
            <BagIcon />
            {count > 0 && (
              <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-1 font-sans text-[0.65rem] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
