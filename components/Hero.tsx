"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import { PauseIcon, PlayIcon } from "./Icons";
import TheDeep from "./deep/TheDeep";
import { POSTER_LQIP } from "./deep/lqip";
import { useCatalog } from "./catalog";

/**
 * Full-bleed living hero with the headline bottom-left (the Sunviya layout).
 * The visual is the RAW octopus behind the murk — rendered live, it follows your finger.
 */
export default function Hero() {
  const { book } = useStore();
  const { styles } = useCatalog();
  const [playing, setPlaying] = useState(true);

  // arriving here from another page, the inline reveal script below doesn't run — reveal from React
  useEffect(() => {
    const d = document.documentElement;
    if (d.hasAttribute("data-fonts")) return;
    const go = () => d.setAttribute("data-fonts", "");
    const t = window.setTimeout(go, 1200);
    document.fonts?.ready.then(go, go);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      className="relative h-[76svh] min-h-[520px] max-h-[760px] touch-pan-y select-none overflow-hidden bg-abyss bg-[length:auto_100%] bg-center bg-no-repeat"
      // poster over an inlined blurred copy: the octopus is there from the very first paint
      style={{ backgroundImage: `url(/media/deep-poster.jpg), url(${POSTER_LQIP})` }}
      aria-label="RAW — Royal Art Weaves"
    >
      <TheDeep paused={!playing} />
      {/* legibility: soft top for the header, deep bottom for the type */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,8,0.35)_0%,rgba(7,6,8,0)_20%,rgba(7,6,8,0)_55%,rgba(7,6,8,0.85)_86%,#070608_100%)]" />

      <div id="hero-copy" className="absolute inset-x-0 bottom-0 px-4 pb-7">
        <h1 className="font-display text-[3.05rem] uppercase leading-[0.92] text-bone drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          Styled like<br /><span className="text-lilac">royalty.</span>
        </h1>
        <p className="mt-3 max-w-[21rem] text-[1rem] leading-snug text-bone/85">
          Braids, twists &amp; hair art by RAW — booked by DM, done at your place.
        </p>
        <div className="mt-5 flex gap-2.5">
          {styles[0] && <button className="pill pill-lilac flex-1" onClick={() => book(styles[0].slug)}>Book a style</button>}
          <Link href="/shop" className="pill pill-ghost flex-1">Shop</Link>
        </div>
      </div>

      {/* runs as soon as the HTML arrives (before the app's JavaScript): once the display font is loaded,
          the headline, line and buttons fade up together — no half-drawn hero, no font jump */}
      <script
        dangerouslySetInnerHTML={{
          __html: "(function(){var d=document.documentElement,done=0;function go(){if(!done){done=1;d.setAttribute('data-fonts','')}}setTimeout(go,2000);try{var h=document.querySelector('#hero-copy h1');document.fonts.load('400 48px '+getComputedStyle(h).fontFamily).then(go,go)}catch(e){go()}})()",
        }}
      />

      <button
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause animation" : "Play animation"}
        className="absolute right-3 top-[84px] grid h-9 w-9 place-items-center rounded-full bg-black/35 text-bone/80 backdrop-blur"
      >
        {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
      </button>
    </section>
  );
}
