/** This-weekend strip: Sat/Sun events ending soon. */

function etParts(d: Date): { y: number; m: number; day: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    day: Number(parts.day),
    dow: dayMap[parts.weekday] ?? 0,
  };
}

function etNoon(y: number, m: number, day: number): Date {
  return new Date(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-04:00`);
}

/** Weekend window in America/New_York. */
export function upcomingWeekendWindow(now: Date = new Date()): { start: Date; end: Date } {
  const { y, m, day, dow } = etParts(now);
  let toSat = 6 - dow;
  if (dow === 0) toSat = -1;
  const base = etNoon(y, m, day);
  const sat = new Date(base.getTime() + toSat * 86_400_000);
  const sun = new Date(sat.getTime() + 86_400_000);
  const sp = etParts(sat);
  const su = etParts(sun);
  const start = new Date(`${sp.y}-${String(sp.m).padStart(2, "0")}-${String(sp.day).padStart(2, "0")}T00:00:00-04:00`);
  const end = new Date(`${su.y}-${String(su.m).padStart(2, "0")}-${String(su.day).padStart(2, "0")}T23:59:59-04:00`);
  return { start, end };
}

export function isThisWeekendEvent(
  item: { kind: string; startsAt: string | null; endsAt: string | null; whenHours?: string },
  now: Date = new Date(),
): { weekend: boolean; day: "sat" | "sun" | "both" | null } {
  if (item.kind !== "event") {
    if (item.whenHours && /\b(sat|sun|saturday|sunday|weekend)/i.test(item.whenHours)) {
      return { weekend: true, day: "both" };
    }
    return { weekend: false, day: null };
  }
  if (!item.startsAt) return { weekend: false, day: null };
  const start = Date.parse(item.startsAt);
  const end = item.endsAt ? Date.parse(item.endsAt) : start + 8 * 3600_000;
  if (Number.isNaN(start)) return { weekend: false, day: null };
  if (end < now.getTime()) return { weekend: false, day: null };
  const { start: w0, end: w1 } = upcomingWeekendWindow(now);
  if (end < w0.getTime() || start > w1.getTime()) return { weekend: false, day: null };
  const { dow } = etParts(new Date(start));
  const day = dow === 6 ? "sat" : dow === 0 ? "sun" : "both";
  return { weekend: true, day };
}
