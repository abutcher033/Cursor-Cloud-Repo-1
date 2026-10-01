const LABELS: Record<string, string> = {
  patio: "Patio",
  "cash-only": "Cash only",
  "no-stroller-in-fields": "No stroller in fields",
  "ticketed-online-only": "Tickets online only",
  "ticketed-on-site": "Tickets on site",
  "hours-need-check": "Hours need a check",
  "hours-vary": "Hours vary",
  "verify-hotline": "Call to verify",
  "same-campus": "Same campus",
  "arrive-early": "Arrive early",
  indoor: "Indoor",
  "armband-ages-3+": "Armband ages 3+",
  "weekend-only": "Weekend only",
  "long-drive": "Longer drive",
};

export function gotchaLabel(id: string): string {
  return LABELS[id] ?? id.replace(/-/g, " ");
}

export function parseGotchas(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
