"use client";

import { useRef, useState } from "react";
import StyleCard from "./StyleCard";
import { CATEGORIES, STYLES, type StyleCategory } from "@/lib/styles";

export default function StylesRail() {
  const [cat, setCat] = useState<StyleCategory | "all">("all");
  const rail = useRef<HTMLDivElement>(null);
  const list = cat === "all" ? STYLES : STYLES.filter((s) => s.category === cat);

  const pick = (c: StyleCategory | "all") => {
    setCat(c);
    rail.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="rail mb-4 gap-2" role="toolbar" aria-label="Filter styles">
        <button className="chip" aria-pressed={cat === "all"} onClick={() => pick("all")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => pick(c.id)}>{c.label}</button>
        ))}
      </div>
      <div ref={rail} className="rail">
        {list.map((s) => (
          <StyleCard key={s.slug} style={s} className="w-[42vw] max-w-[190px] shrink-0" />
        ))}
      </div>
    </>
  );
}
