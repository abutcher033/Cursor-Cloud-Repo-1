/** Build a minimal VEVENT ICS blob for an outing. */

export type IcsInput = {
  id: string;
  title: string;
  description?: string;
  address?: string;
  url?: string;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  whenHours?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** UTC stamp YYYYMMDDTHHMMSSZ */
export function icsUtc(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

/** Guess a 2-hour window from whenHours when startsAt is missing. */
export function resolveWindow(input: IcsInput, now = new Date()): { start: Date; end: Date } {
  if (input.startsAt) {
    const start = new Date(input.startsAt);
    const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 2 * 3600_000);
    if (!Number.isNaN(start.getTime())) return { start, end: Number.isNaN(end.getTime()) ? new Date(start.getTime() + 2 * 3600_000) : end };
  }
  // Next Saturday 10:00 local as a soft stub for evergreen places
  const start = new Date(now);
  const day = start.getDay();
  const add = day === 6 ? 0 : (6 - day + 7) % 7 || 7;
  start.setDate(start.getDate() + add);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 3600_000);
  return { start, end };
}

export function buildIcs(input: IcsInput, now = new Date()): string {
  const { start, end } = resolveWindow(input, now);
  const uid = `${input.id}@locallife.local`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Local Life//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.description || input.whenHours) {
    lines.push(`DESCRIPTION:${escapeText([input.whenHours, input.description].filter(Boolean).join(" — "))}`);
  }
  if (input.address) lines.push(`LOCATION:${escapeText(input.address)}`);
  if (input.url) lines.push(`URL:${escapeText(input.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Plain-text “This week” digest stub for share / later email. */
export function weekDigestText(items: { name: string; whenHours: string; address?: string }[], originLabel: string): string {
  const lines = [`Local Life · This week near ${originLabel}`, ""];
  if (!items.length) {
    lines.push("No dated picks in range yet — open the app for evergreen backups.");
  } else {
    for (const it of items.slice(0, 8)) {
      lines.push(`• ${it.name}`);
      lines.push(`  ${it.whenHours}${it.address ? ` · ${it.address}` : ""}`);
    }
  }
  lines.push("", "Add any outing from its detail page → Add to calendar (.ics).", "(Email digest hook: set DIGEST_WEBHOOK_URL later — not wired in P2.)");
  return lines.join("\n");
}
