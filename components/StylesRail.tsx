"use client";

import { useRef, useState } from "react";
import StyleCard from "./StyleCard";
import { useCatalog } from "./catalog";

export default function StylesRail() {
  const { styles, categories } = useCatalog();
  const [cat, setCat] = useState<string>("all");
  const rail = useRef<HTMLDivElement>(null);
  const list = cat === "all" ? styles : styles.filter((s) => s.category === cat);

  const pick = (c: string) => {
    setCat(c);
    rail.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="rail mb-4 gap-2" role="toolbar" aria-label="Filter styles">
        <button className="chip" aria-pressed={cat === "all"} onClick={() => pick("all")}>All</button>
        {categories.map((c) => (
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
