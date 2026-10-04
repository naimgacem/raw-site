// Dates are shown in Algiers time everywhere (server and phone agree, no hydration surprises).
export const TZ = "Africa/Algiers";

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });

/** "2026-10-03" in Algiers */
export const dayKey = (d: Date | string | number) => keyFmt.format(new Date(d));
export const todayKey = () => dayKey(Date.now());

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Today", "Yesterday", "Tomorrow" or "Thu 3 Oct" */
export function dayLabel(key: string, today = todayKey()) {
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  if (key === addDays(today, 1)) return "Tomorrow";
  return shortFmt.format(new Date(`${key}T12:00:00Z`));
}

export const timeOf = (d: string | Date) => timeFmt.format(new Date(d));

/** "now", "5 min", "3 h", or "3 Oct" */
export function ago(d: string | Date, now = Date.now()) {
  const s = Math.max(0, (now - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 86400 * 6) return `${Math.floor(s / 86400)} d`;
  return dayMonthFmt.format(new Date(d));
}

/** "Thu 3 Oct · 14:02" */
export const stamp = (d: string | Date) => `${dayLabel(dayKey(d))} · ${timeOf(d)}`;
