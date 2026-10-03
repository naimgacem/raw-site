import { SITE } from "@/lib/site";

// Caesar Dressing has no proper "@", so the symbol is set in the sans face.
export function Handle({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-sans font-semibold">@</span>
      {SITE.instagramHandle.replace(/^@/, "")}
    </span>
  );
}
