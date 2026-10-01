/** Heuristic open-now / opens-soon from whenHours + startsAt (ET-aware enough for demo). */

export type OpenState = "open_now" | "opens_soon" | "evening_only" | "closed" | "unknown";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function etParts(now: Date): { day: number; hour: number; minute: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = (parts.weekday || "Mon").slice(0, 3).toLowerCase();
  const day = DAY_NAMES.indexOf(weekday as (typeof DAY_NAMES)[number]);
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const minute = Number(parts.minute);
  return { day: day < 0 ? 0 : day, hour, minute, weekday };
}

function minutesNow(now: Date): number {
  const p = etParts(now);
  return p.hour * 60 + p.minute;
}

/** Parse "8 AM", "2 PM", "6–10 PM", "7:30 AM" → minutes from midnight. */
export function parseClock(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3].toUpperCase();
  if (ap === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) h += 12;
  return h * 60 + min;
}

function dayMentioned(text: string, dayIdx: number): boolean {
  const t = text.toLowerCase();
  const names = [
    ["sun", "sunday"],
    ["mon", "monday"],
    ["tue", "tuesday"],
    ["wed", "wednesday"],
    ["thu", "thursday"],
    ["fri", "friday"],
    ["sat", "saturday"],
  ];
  const [short, long] = names[dayIdx];
  if (t.includes(long) || new RegExp(`\\b${short}\\b`).test(t)) return true;
  // Ranges like Sat–Sun, Fri–Sun
  const range = t.match(/\b(mon|tue|wed|thu|fri|sat|sun)\s*[–\-]\s*(mon|tue|wed|thu|fri|sat|sun)\b/);
  if (range) {
    const a = DAY_NAMES.indexOf(range[1] as (typeof DAY_NAMES)[number]);
    const b = DAY_NAMES.indexOf(range[2] as (typeof DAY_NAMES)[number]);
    if (a >= 0 && b >= 0) {
      if (a <= b) return dayIdx >= a && dayIdx <= b;
      return dayIdx >= a || dayIdx <= b;
    }
  }
  if (/\bweekdays?\b/.test(t) && dayIdx >= 1 && dayIdx <= 5) return true;
  if (/\bweekends?\b/.test(t) && (dayIdx === 0 || dayIdx === 6)) return true;
  // Dated event like "Sat Oct 3" — treat as that weekday only if string starts with day
  return false;
}

function hasAnyDayToken(text: string): boolean {
  return /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend)\b/i.test(
    text,
  );
}

/** Pull first open-close pair from whenHours. */
export function extractWindow(whenHours: string): { open: number; close: number } | null {
  const cleaned = whenHours.replace(/[·•]/g, " ").replace(/\s+/g, " ");
  // Prefer explicit "8 AM–2 PM" / "6–10 PM" / "9 AM-6 PM"
  const pair = cleaned.match(
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[–\-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
  );
  if (!pair) return null;
  let left = pair[1].trim();
  const right = pair[2].trim();
  if (!/(AM|PM)/i.test(left) && /(AM|PM)/i.test(right)) {
    // "6–10 PM" → both PM
    left = `${left} ${right.match(/(AM|PM)/i)![1]}`;
  }
  const open = parseClock(left);
  const close = parseClock(right);
  if (open == null || close == null) return null;
  return { open, close };
}

export function isEveningOnly(whenHours: string): boolean {
  const win = extractWindow(whenHours);
  if (!win) return /evening|night|\b6\s*[–\-]\s*10\s*PM\b|\bafter\s*5\b/i.test(whenHours);
  return win.open >= 17 * 60 && win.close > win.open;
}

export function openState(input: {
  whenHours: string;
  startsAt?: string | null;
  endsAt?: string | null;
  kind?: string;
  now?: Date;
}): { state: OpenState; label: string | null } {
  const now = input.now ?? new Date();
  const mins = minutesNow(now);
  const { day } = etParts(now);
  const when = input.whenHours || "";

  if (input.startsAt) {
    const start = Date.parse(input.startsAt);
    const end = input.endsAt ? Date.parse(input.endsAt) : start + 4 * 3600_000;
    if (!Number.isNaN(start)) {
      if (now.getTime() >= start && now.getTime() <= end) {
        return { state: "open_now", label: "Open now" };
      }
      const hoursUntil = (start - now.getTime()) / 3_600_000;
      if (hoursUntil > 0 && hoursUntil <= 3) {
        return { state: "opens_soon", label: "Opens soon" };
      }
      // Dated weekend event not today
      if (input.kind === "event" && now.getTime() < start) {
        if (isEveningOnly(when) && mins < 11 * 60) {
          return { state: "evening_only", label: "Evening" };
        }
        return { state: "unknown", label: null };
      }
    }
  }

  const dayLocked = hasAnyDayToken(when);
  if (dayLocked && !dayMentioned(when, day)) {
    if (isEveningOnly(when) && mins < 11 * 60) {
      return { state: "evening_only", label: "Evening" };
    }
    return { state: "closed", label: null };
  }

  const win = extractWindow(when);
  if (!win) {
    if (isEveningOnly(when) && mins < 11 * 60) {
      return { state: "evening_only", label: "Evening" };
    }
    return { state: "unknown", label: null };
  }

  let { open, close } = win;
  if (close < open) close += 24 * 60; // overnight
  const cur = mins;
  if (cur >= open && cur < close) {
    return { state: "open_now", label: "Open now" };
  }
  if (cur < open && open - cur <= 90) {
    return { state: "opens_soon", label: "Opens soon" };
  }
  if (open >= 17 * 60 && cur < 11 * 60) {
    return { state: "evening_only", label: "Evening" };
  }
  return { state: "closed", label: null };
}

/** Soft demote evening-only listings during morning browse. */
export function eveningMorningPenalty(state: OpenState, now: Date = new Date()): number {
  const mins = minutesNow(now);
  if (mins >= 11 * 60) return 0;
  if (state === "evening_only") return 12;
  return 0;
}
