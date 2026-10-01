export const CATEGORIES = [
  { id: "food_drink", label: "Food & drink" },
  { id: "live_music", label: "Live music" },
  { id: "family_kids", label: "Family & kids" },
  { id: "outdoor", label: "Outdoor" },
  { id: "movies_theater", label: "Movies / theater" },
  { id: "sports_games", label: "Sports / games" },
  { id: "festivals_markets", label: "Festivals / markets" },
  { id: "nightlife", label: "Nightlife" },
  { id: "museums_culture", label: "Museums" },
  { id: "seasonal", label: "Seasonal" },
  { id: "free_cheap", label: "Free & cheap" },
  { id: "farms_pyo", label: "Farms / PYO" },
  { id: "breweries", label: "Breweries" },
  { id: "indoor_backup", label: "Indoor / libraries" },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type CategoryId = (typeof CATEGORY_IDS)[number];

const LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]));

export function categoryLabel(id: string): string {
  return LABEL.get(id as CategoryId) ?? id;
}

export function knownCategories(ids: string[]): string[] {
  const allow = new Set<string>(CATEGORY_IDS);
  const out: string[] = [];
  for (const id of ids) {
    if (allow.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
