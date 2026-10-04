"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "./store";
import { PauseIcon, PlayIcon } from "./Icons";
import TheDeep from "./deep/TheDeep";
import { useCatalog } from "./catalog";

/**
 * Full-bleed living hero with the headline bottom-left (the Sunviya layout).
 * The visual is the RAW octopus behind the murk — rendered live, it follows your finger.
 */
export default function Hero() {
  const { book } = useStore();
  const { styles } = useCatalog();
  const [playing, setPlaying] = useState(true);

  return (
    <section
      className="relative h-[76svh] min-h-[520px] max-h-[760px] touch-pan-y select-none overflow-hidden bg-abyss bg-[url('/media/deep-poster.jpg')] bg-cover bg-center"
      aria-label="RAW — Royal Art Weaves"
    >
      <TheDeep paused={!playing} />
      {/* legibility: soft top for the header, deep bottom for the type */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,8,0.35)_0%,rgba(7,6,8,0)_20%,rgba(7,6,8,0)_55%,rgba(7,6,8,0.85)_86%,#070608_100%)]" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-7">
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
