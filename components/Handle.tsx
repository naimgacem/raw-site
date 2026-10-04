"use client";

import { useCatalog } from "./catalog";
import { igHandle } from "@/lib/site";

// Caesar Dressing has no proper "@", so the symbol is set in the sans face.
export function Handle({ className = "" }: { className?: string }) {
  const { settings } = useCatalog();
  return (
    <span className={className}>
      <span className="font-sans font-semibold">@</span>
      {igHandle(settings.instagramHandle)}
    </span>
  );
}
