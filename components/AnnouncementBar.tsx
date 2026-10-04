// Lilac bar in the bold face, like Sunviya's "BUILT FOR THE WILD ONES." — here as a slow marquee.
export default function AnnouncementBar({ items: list }: { items: string[] }) {
  if (list.length === 0) return null;
  const items = [...list, ...list];
  return (
    <div className="relative z-50 h-9 overflow-hidden bg-lilac text-abyss" role="region" aria-label="Announcements">
      <div className="flex h-full w-max animate-marquee items-center motion-reduce:animate-none">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center" aria-hidden={half === 1}>
            {items.map((t, i) => (
              <span key={i} className="flex items-center whitespace-nowrap font-display text-[0.95rem] uppercase">
                <span className="px-5">{t}</span>
                <span className="text-royal">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
